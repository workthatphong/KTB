from __future__ import annotations

import datetime as dt
import os
from pathlib import Path

from ....config.constants.constants_paths import DB_PATH
from ....config.constants.constants_runtime import APP_VERSION, SERVER_STARTED_AT
from ....infrastructure.supabase_sync import get_supabase_status


def build_health_payload() -> dict:
    supabase_status = get_supabase_status()
    return {
        "ok": True,
        "db": str(DB_PATH.name),
        "dbPath": str(DB_PATH),
        "dbExists": DB_PATH.exists(),
        "version": APP_VERSION,
        "processId": os.getpid(),
        "serverStartedAt": SERVER_STARTED_AT,
        "appFileMtime": dt.datetime.fromtimestamp(Path(__file__).stat().st_mtime).isoformat(),
        "storageMode": "supabase+sqlite" if supabase_status.get("enabled") else "sqlite",
        "supabase": supabase_status,
    }
