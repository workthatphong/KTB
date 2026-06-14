from __future__ import annotations

import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[4]
ROOT = PROJECT_ROOT
DATA_DIR = PROJECT_ROOT / "data"
LEGACY_DB_PATH = PROJECT_ROOT / "local_dashboard.db"
IS_VERCEL = os.getenv("VERCEL") == "1"
DEFAULT_DB_PATH = (
    Path("/tmp/local_dashboard.db")
    if IS_VERCEL
    else (DATA_DIR / "local_dashboard.db")
)
DB_PATH = Path(
    os.getenv(
        "LOCAL_DB_PATH",
        str(DEFAULT_DB_PATH),
    )
)
