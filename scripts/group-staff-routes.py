"""Move existing staff pages into a protected route group; URLs stay unchanged."""
from pathlib import Path
root = Path(__file__).resolve().parents[1]
app = root / 'src/app'
group = app / '(staff)'
group.mkdir(exist_ok=True)
for source in list(app.iterdir()):
    if source.is_dir() and source.name not in {'api', 'login', 'landing', 'track', 'customer', 's', '(staff)'}:
        target = (group / source.name).resolve()
        if not target.is_relative_to(app.resolve()) or target.exists():
            raise SystemExit(f'Unsafe or existing move target: {target}')
        source.rename(target)
page = app / 'page.tsx'
if page.exists():
    page.rename(group / 'page.tsx')
dashboard = group / 'dashboard/page.tsx'
dashboard.write_text(dashboard.read_text(encoding='utf-8').replace('@/app/page', '@/app/(staff)/page'), encoding='utf-8')
