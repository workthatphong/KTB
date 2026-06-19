from __future__ import annotations
import datetime as dt

from ...segmentation import engine as segmentation_engine
from ...analytics import user_performance as analytics_service
from ...dashboard_snapshot import clear_local_dashboard_snapshot

def utc_now_iso() -> str:
    return dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"

def invalidate_runtime_caches() -> None:
    segmentation_engine.clear_normalized_events_cache()
    analytics_service.clear_user_performance_cache()
    clear_local_dashboard_snapshot()
