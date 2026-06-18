from __future__ import annotations

import datetime as dt

DEFAULT_TIMEOUT_SECONDS = 30 * 60
APP_VERSION = "2026-05-24-perf-1"
SERVER_STARTED_AT = dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
ALGORITHM_VERSION = (
    "2.3_EDIT_ITEM_COUNTS"
)
