from __future__ import annotations

from ..infrastructure.db.sqlite_store import (
    ensure_dashboard_snapshot_from_supabase_if_needed,
    ensure_fresh_from_supabase_if_enabled,
    ensure_full_raw_state_from_supabase_if_enabled,
)
from ..services.analytics import user_performance as analytics_service
from ..services import dashboard_snapshot as dashboard_snapshot_service
from ..services.sync import data_manager

def refresh_runtime_data() -> None:
    ensure_fresh_from_supabase_if_enabled()


def refresh_dashboard_snapshot_data() -> None:
    ensure_dashboard_snapshot_from_supabase_if_needed()


# Analytics service exports
def compute_user_performance() -> dict:
    ensure_full_raw_state_from_supabase_if_enabled()
    refresh_runtime_data()
    return analytics_service.compute_user_performance()


def build_debug_snapshot() -> dict:
    ensure_full_raw_state_from_supabase_if_enabled()
    refresh_runtime_data()
    return analytics_service.build_debug_snapshot()


def build_health_payload() -> dict:
    return analytics_service.build_health_payload()


# Response payload helpers
def api_sources_payload() -> dict:
    payload = api_dashboard_payload(include_debug=False)
    return {"sources": payload.get("sources", [])}

def api_gsheet_connections_payload() -> dict:
    payload = api_dashboard_payload(include_debug=False)
    return {"connections": payload.get("connections", [])}

def api_dashboard_payload(
    include_debug: bool = False,
    refresh_snapshot: bool = False,
) -> dict:
    payload = None
    if refresh_snapshot:
        ensure_full_raw_state_from_supabase_if_enabled()
        refresh_runtime_data()
        payload = dashboard_snapshot_service.rebuild_dashboard_snapshot(sync_remote=True)
    else:
        payload = dashboard_snapshot_service.get_dashboard_snapshot_payload()
    if payload is None:
        refresh_dashboard_snapshot_data()
        payload = dashboard_snapshot_service.get_dashboard_snapshot_payload()
    if payload is None:
        ensure_full_raw_state_from_supabase_if_enabled()
        refresh_runtime_data()
        payload = dashboard_snapshot_service.rebuild_dashboard_snapshot(sync_remote=True)

    payload = {
        **payload,
        "healthInfo": analytics_service.build_health_payload(),
    }
    if include_debug:
        payload["debugInfo"] = build_debug_snapshot()
    return payload

def api_upload_payload(files: list[tuple[str, bytes]]) -> dict:
    uploaded = [data_manager.ingest_file(name, binary) for name, binary in files]
    return {"uploaded": uploaded}

def api_connect_gsheet_payload(url: str) -> dict:
    result = data_manager.connect_gsheet(url)
    return {
        "connected": result,
        **api_gsheet_connections_payload(),
        **api_sources_payload(),
    }

def api_sync_gsheet_payload() -> dict:
    results = data_manager.sync_all_gsheets()
    return {
        "synced": results,
        **api_sources_payload(),
        **api_gsheet_connections_payload(),
    }

def api_delete_source_payload(source_id: str) -> dict:
    data_manager.delete_source(source_id)
    return {"ok": True, **api_sources_payload()}

def api_delete_gsheet_payload(connection_id: str) -> dict:
    data_manager.disconnect_gsheet(connection_id)
    return {
        "ok": True,
        **api_gsheet_connections_payload(),
        **api_sources_payload(),
    }

def api_update_settings_payload(new_settings: dict) -> dict:
    updated = dashboard_snapshot_service.update_dashboard_settings(new_settings)
    return {"settings": updated}
