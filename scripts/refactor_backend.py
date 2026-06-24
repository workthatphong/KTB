import os
from pathlib import Path

root = Path("/workspaces/KTB/backend/app")

# 1. Update app.py
app_py = root / "presentation/http/app.py"
content = app_py.read_text()
content = content.replace("from ...application import dashboard_service", "from ...infrastructure.db.sqlite_store import init_db")
content = content.replace("dashboard_service.init_db()", "init_db()")
app_py.write_text(content)

# 2. Update api.py
api_py = root / "presentation/http/routes/api.py"
content = api_py.read_text()
content = content.replace("from ....application import dashboard_service", "from ....application import use_cases")
content = content.replace("dashboard_service.", "use_cases.")
api_py.write_text(content)

# 3. Update web.py
web_py = root / "presentation/http/routes/web.py"
content = web_py.read_text()
content = content.replace("from ....application import dashboard_service", "from ....config.constants.constants_paths import PROJECT_ROOT")
content = content.replace("dashboard_service.PROJECT_ROOT", "PROJECT_ROOT")
web_py.write_text(content)

# 4. Rename payloads.py -> use_cases.py
payloads_py = root / "application/payloads.py"
if payloads_py.exists():
    payloads_py.rename(root / "application/use_cases.py")

# 5. Delete legacy_server.py and dashboard_service.py
legacy = root / "application/legacy_server.py"
if legacy.exists():
    legacy.unlink()

dash_svc = root / "application/dashboard_service.py"
if dash_svc.exists():
    dash_svc.unlink()

print("Refactor complete.")
