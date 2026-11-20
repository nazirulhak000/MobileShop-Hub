"""Export FixMe SQLite database (dev.db) into PostgreSQL-compatible SQL dump.
Usage:
    python scripts/export-sqlite-to-postgres.py [--database prisma/dev.db] [--output postgres-migration.sql]

The generated SQL script can be imported directly into Neon, Supabase, or AWS RDS:
    psql "$DATABASE_URL" -f postgres-migration.sql
"""
import argparse
import datetime
import pathlib
import re
import sqlite3

ROOT = pathlib.Path(__file__).resolve().parents[1]

# Ordered tables respecting foreign key relationships
TABLE_ORDER = [
    "Tenant",
    "StorefrontConfig",
    "Subscription",
    "BillingInvoice",
    "SequenceCounter",
    "Branch",
    "User",
    "Customer",
    "StaffSession",
    "StaffBranchAccess",
    "CustomerAccount",
    "CustomerAccountLink",
    "CustomerSession",
    "OtpChallenge",
    "AuthThrottle",
    "CustomerNotification",
    "BookingPolicy",
    "BookingSlot",
    "Appointment",
    "AppointmentEvent",
    "BookingRequest",
    "Product",
    "StockItem",
    "TradeInContract",
    "DeviceIMEI",
    "RepairJob",
    "RepairStatusEvent",
    "RepairQuote",
    "RepairPartUsage",
    "PublicTrackingToken",
    "Sale",
    "SaleItem",
    "InstallmentContract",
    "InstallmentPayment",
    "ShopExpense",
    "AttendanceRecord",
    "PayrollSlip",
    "AuditLog"
]

def parse_boolean_fields_from_schema(schema_path: pathlib.Path) -> dict[str, set[str]]:
    """Parse schema.prisma to identify Boolean columns per model."""
    bool_map = {}
    if not schema_path.exists():
        return bool_map
    content = schema_path.read_text(encoding="utf-8")
    models = re.findall(r"model\s+(\w+)\s*\{([^}]+)\}", content)
    for model_name, body in models:
        bool_fields = set()
        for line in body.splitlines():
            line = line.strip()
            if not line or line.startswith("//") or line.startswith("@@"):
                continue
            parts = line.split()
            if len(parts) >= 2 and parts[1].startswith("Boolean"):
                bool_fields.add(parts[0])
        bool_map[model_name] = bool_fields
    return bool_map

def format_pg_value(val, is_bool: bool) -> str:
    if val is None:
        return "NULL"
    if is_bool:
        return "TRUE" if bool(val) else "FALSE"
    if isinstance(val, (int, float)):
        return str(val)
    if isinstance(val, bytes):
        return f"decode('{val.hex()}', 'hex')"
    # String or datetime
    s = str(val).replace("'", "''")
    return f"'{s}'"

def main():
    parser = argparse.ArgumentParser(description="Export SQLite to PostgreSQL SQL file.")
    parser.add_argument("--database", default=str(ROOT / "prisma/dev.db"))
    parser.add_argument("--schema", default=str(ROOT / "prisma/schema.prisma"))
    parser.add_argument("--output", default=str(ROOT / "postgres-migration.sql"))
    args = parser.parse_args()

    db_path = pathlib.Path(args.database).resolve()
    if not db_path.exists():
        print(f"Error: Database {db_path} not found.")
        return

    bool_map = parse_boolean_fields_from_schema(pathlib.Path(args.schema))

    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row
    cur = con.cursor()

    existing_tables = set(
        row[0] for row in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
    )

    out_path = pathlib.Path(args.output).resolve()
    lines = [
        "-- FixMe SQLite to PostgreSQL Data Dump",
        f"-- Generated at {datetime.datetime.now(datetime.timezone.utc).isoformat()}",
        "-- Run on target database: psql \"$DATABASE_URL\" -f postgres-migration.sql",
        "",
        "BEGIN;",
        "SET CONSTRAINTS ALL DEFERRED;",
        ""
    ]

    total_rows = 0
    for table in TABLE_ORDER:
        if table not in existing_tables:
            continue
        cur.execute(f'SELECT * FROM "{table}"')
        rows = cur.fetchall()
        if not rows:
            continue

        col_names = [description[0] for description in cur.description]
        quoted_cols = [f'"{c}"' for c in col_names]
        table_bools = bool_map.get(table, set())

        lines.append(f"-- Table: {table} ({len(rows)} rows)")
        for row in rows:
            val_strs = [
                format_pg_value(row[c], c in table_bools)
                for c in col_names
            ]
            lines.append(f'INSERT INTO "{table}" ({", ".join(quoted_cols)}) VALUES ({", ".join(val_strs)}) ON CONFLICT DO NOTHING;')
            total_rows += 1
        lines.append("")

    lines.extend([
        "COMMIT;",
        ""
    ])

    out_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"Successfully exported {total_rows} rows from {len(TABLE_ORDER)} tables to {out_path}")

if __name__ == "__main__":
    main()
