"""SQLite foundation migration: always rehearse on a copy, back up before apply.
Usage: python scripts/foundation-maintenance.py --shop-slug mobileshop [--apply]
Only the explicitly selected shop receives unassigned legacy data. Ambiguity aborts.
"""
import argparse
import datetime
import json
import hashlib
import pathlib
import sqlite3
import uuid

ROOT = pathlib.Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--shop-slug', required=True)
parser.add_argument('--shop-name', default='MobileShop')
parser.add_argument('--database', default=str(ROOT / 'prisma/dev.db'))
parser.add_argument('--apply', action='store_true')
args = parser.parse_args()
source = pathlib.Path(args.database).resolve()
if not source.is_relative_to(ROOT):
    raise SystemExit('Database must be inside the workspace')
out = ROOT / '.local/backups'
out.mkdir(parents=True, exist_ok=True)
stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%f')
backup = out / f'foundation-{stamp}.db'
trial = out / f'foundation-rehearsal-{stamp}.db'
with sqlite3.connect(source) as live, sqlite3.connect(backup) as target:
    live.backup(target)
with sqlite3.connect(backup) as old, sqlite3.connect(trial) as target:
    old.backup(target)
    source_digest = hashlib.sha256('\n'.join(old.iterdump()).encode()).hexdigest()

def counts(con):
    return {row[0]: con.execute('SELECT COUNT(*) FROM "' + row[0] + '"').fetchone()[0]
            for row in con.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")}

with sqlite3.connect(trial) as con:
    con.row_factory = sqlite3.Row
    before = counts(con)
    already = con.execute("SELECT 1 FROM sqlite_master WHERE name='StaffSession'").fetchone()
    if not already:
        con.executescript((ROOT / 'prisma/legacy-migrations/foundation-migration.sql').read_text(encoding='utf-8'))
    con.executescript((ROOT / 'prisma/legacy-migrations/tracking-migration.sql').read_text(encoding='utf-8'))
    if not con.execute("SELECT 1 FROM sqlite_master WHERE name='CustomerAccount'").fetchone():
        con.executescript((ROOT / 'prisma/legacy-migrations/portal-migration.sql').read_text(encoding='utf-8'))
    if 'isActive' not in {r['name'] for r in con.execute('PRAGMA table_info("User")')}:
        con.executescript((ROOT / 'prisma/legacy-migrations/staff-active-migration.sql').read_text(encoding='utf-8'))
    tenant = con.execute('SELECT id FROM Tenant WHERE slug=?', (args.shop_slug,)).fetchone()
    tenant_id = tenant['id'] if tenant else 'tenant-' + uuid.uuid4().hex
    if not tenant:
        con.execute('INSERT INTO Tenant (id,name,slug,updatedAt) VALUES (?,?,?,?)',
                    (tenant_id, args.shop_name, args.shop_slug, datetime.datetime.now(datetime.timezone.utc).isoformat()))
    # Never guess an owner if the source is already multi-tenant.
    other = con.execute('SELECT COUNT(*) FROM Tenant WHERE id != ?', (tenant_id,)).fetchone()[0]
    tables = [name for name in counts(con) if 'tenantId' in {r['name'] for r in con.execute('PRAGMA table_info("' + name + '")')}]
    unassigned = {name: con.execute(f'SELECT COUNT(*) FROM "{name}" WHERE tenantId IS NULL').fetchone()[0] for name in tables}
    if other and any(unassigned.values()):
        raise SystemExit('Ambiguous legacy rows in a multi-tenant database; supply a reviewed mapping instead. Source unchanged.')
    for name in tables:
        con.execute(f'UPDATE "{name}" SET tenantId=? WHERE tenantId IS NULL', (tenant_id,))
    con.execute("UPDATE SequenceCounter SET id=tenantId || ':' || id WHERE id NOT LIKE tenantId || ':%'")
    # Validate every existing FK with tenant ownership, including historical nested relations.
    for name in tables:
        for fk in con.execute(f'PRAGMA foreign_key_list("{name}")').fetchall():
            parent, child_key, parent_key = fk['table'], fk['from'], fk['to']
            if parent not in tables or child_key == 'tenantId':
                continue
            mismatch = con.execute(f'SELECT COUNT(*) FROM "{name}" c JOIN "{parent}" p ON c."{child_key}"=p."{parent_key}" WHERE c.tenantId != p.tenantId').fetchone()[0]
            if mismatch:
                raise SystemExit(f'Cross-tenant relation in {name}.{child_key}; source unchanged')
    if con.execute('PRAGMA foreign_key_check').fetchall():
        raise SystemExit('Foreign key check failed; source unchanged')
    after = counts(con)
    for table, count in before.items():
        expected = count + (1 if table == 'Tenant' and not tenant else 0)
        if after[table] != expected:
            raise SystemExit(f'Row count mismatch: {table}')
    con.commit()
    integrity = con.execute('PRAGMA integrity_check').fetchone()[0]
    if integrity != 'ok':
        raise SystemExit('Integrity check failed')
    report = {'applied': args.apply, 'shopSlug': args.shop_slug, 'backup': str(backup), 'rehearsal': str(trial), 'before': before, 'after': after, 'backfilled': unassigned, 'integrity': integrity}
if args.apply:
    with sqlite3.connect(trial) as rehearsed, sqlite3.connect(source) as live:
        if hashlib.sha256('\n'.join(live.iterdump()).encode()).hexdigest() != source_digest:
            raise SystemExit('Source changed after backup; stop the application and rerun. Nothing applied.')
        rehearsed.backup(live)
report_path = out / f'foundation-{stamp}.json'
report_path.write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps({'applied': args.apply, 'report': str(report_path), 'integrity': integrity}))
