from __future__ import annotations
import uuid
import json

from ....infrastructure.db.sqlite_store import (
    _sync_dashboard_snapshot_to_supabase_if_enabled,
    _sync_source_to_supabase_if_enabled,
    ensure_full_raw_state_from_supabase_if_enabled,
    get_conn,
)
from ...segmentation import engine as segmentation_engine
from ...dashboard_snapshot import rebuild_dashboard_snapshot
from .utils import utc_now_iso, invalidate_runtime_caches
from .db_ops import clear_source_by_file_name
from .gsheet_fetcher import _extract_gsheet_id, _extract_gsheet_gid, _download_gsheet_pages

def _ingest_gsheet_pages(spreadsheet_id: str, all_pages: list[tuple[str, list[dict]]]) -> dict:
    file_name = f"gsheet_{spreadsheet_id[:12]}.csv"
    now = utc_now_iso()
    source_id = uuid.uuid4().hex
    total_rows = 0
    removed_source_id: str | None = None
    with get_conn() as conn:
        removed_source_id = clear_source_by_file_name(conn, file_name)
        conn.execute(
            "INSERT INTO source_files (source_id, file_name, file_ext, uploaded_at, total_rows, total_pages) VALUES (?, ?, ?, ?, 0, 0)",
            (source_id, file_name, ".gsheet", now),
        )
        for page_name, rows in all_pages:
            conn.execute("INSERT INTO source_pages (source_id, page_name, row_count) VALUES (?, ?, ?)", (source_id, page_name, len(rows)))
            for idx, row in enumerate(rows, start=1):
                row_number = segmentation_engine.parse_int(row.get("__sheet_row_number")) or idx
                data_json = json.dumps(row, ensure_ascii=False)
                conn.execute(
                    "INSERT INTO unified_rows (source_id, file_name, page_name, row_number, data_json, ingested_at) VALUES (?, ?, ?, ?, ?, ?)",
                    (source_id, file_name, page_name, row_number, data_json, now),
                )
            total_rows += len(rows)
        conn.execute("UPDATE source_files SET total_rows = ?, total_pages = ? WHERE source_id = ?", (total_rows, len(all_pages), source_id))
    invalidate_runtime_caches()
    return {
        "source_id": source_id,
        "removed_source_id": removed_source_id,
        "total_rows": total_rows,
        "total_pages": len(all_pages)
    }

def connect_gsheet(url: str) -> dict:
    ensure_full_raw_state_from_supabase_if_enabled()
    spreadsheet_id = _extract_gsheet_id(url)
    if not spreadsheet_id:
        raise ValueError("Invalid Google Sheet URL.")
    with get_conn() as conn:
        existing = conn.execute("SELECT connection_id FROM connected_sheets WHERE spreadsheet_id = ? AND is_active = 1", (spreadsheet_id,)).fetchone()
        if existing: raise ValueError("This Google Sheet is already connected.")
    preferred_gid = _extract_gsheet_gid(url)
    all_pages = _download_gsheet_pages(spreadsheet_id, preferred_gid=preferred_gid)
    if not all_pages: raise ValueError("Could not download any data.")
    result = _ingest_gsheet_pages(spreadsheet_id, all_pages)
    connection_id = uuid.uuid4().hex
    now = utc_now_iso()
    label = f"Google Sheet ({spreadsheet_id[:8]}...)"
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO connected_sheets (connection_id, url, spreadsheet_id, label, connected_at, last_sync_at, last_sync_rows, last_sync_pages, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)",
            (connection_id, url, spreadsheet_id, label, now, now, result["total_rows"], result["total_pages"]),
        )
    snapshot_payload = rebuild_dashboard_snapshot(sync_remote=False)
    _sync_source_to_supabase_if_enabled(
        source_id=result["source_id"],
        removed_source_id=result.get("removed_source_id"),
        required=True,
    )
    _sync_dashboard_snapshot_to_supabase_if_enabled(snapshot_payload, required=False)
    return {"connection_id": connection_id, "spreadsheet_id": spreadsheet_id, "label": label, "total_rows": result["total_rows"], "total_pages": result["total_pages"], "connected_at": now}

def sync_all_gsheets() -> list[dict]:
    ensure_full_raw_state_from_supabase_if_enabled()
    with get_conn() as conn:
        rows = conn.execute("SELECT connection_id, url, spreadsheet_id, label FROM connected_sheets WHERE is_active = 1").fetchall()
    if not rows: return []
    results = []
    for row in rows:
        spreadsheet_id = row["spreadsheet_id"]
        connection_id = row["connection_id"]
        try:
            preferred_gid = _extract_gsheet_gid(str(row["url"] or ""))
            all_pages = _download_gsheet_pages(
                spreadsheet_id,
                preferred_gid=preferred_gid,
                force_tab_refresh=True,
            )
            if not all_pages:
                results.append({"connection_id": connection_id, "status": "no_data"})
                continue
            result = _ingest_gsheet_pages(spreadsheet_id, all_pages)
            _sync_source_to_supabase_if_enabled(
                source_id=result["source_id"],
                removed_source_id=result.get("removed_source_id"),
                required=True,
            )
            now = utc_now_iso()
            with get_conn() as conn:
                conn.execute("UPDATE connected_sheets SET last_sync_at = ?, last_sync_rows = ?, last_sync_pages = ? WHERE connection_id = ?", (now, result["total_rows"], result["total_pages"], connection_id))
            results.append({"connection_id": connection_id, "status": "ok", "total_rows": result["total_rows"], "synced_at": now})
        except Exception as exc:
            results.append({"connection_id": connection_id, "status": "error", "error": str(exc)})
    snapshot_payload = rebuild_dashboard_snapshot(sync_remote=False)

    _sync_dashboard_snapshot_to_supabase_if_enabled(snapshot_payload, required=False)
    return results

def disconnect_gsheet(connection_id: str) -> None:
    ensure_full_raw_state_from_supabase_if_enabled()
    removed_source_id: str | None = None
    with get_conn() as conn:
        row = conn.execute("SELECT spreadsheet_id FROM connected_sheets WHERE connection_id = ?", (connection_id,)).fetchone()
        if row:
            file_name = f"gsheet_{row['spreadsheet_id'][:12]}.csv"
            removed_source_id = clear_source_by_file_name(conn, file_name)
        conn.execute("DELETE FROM connected_sheets WHERE connection_id = ?", (connection_id,))
    invalidate_runtime_caches()
    snapshot_payload = rebuild_dashboard_snapshot(sync_remote=False)
    _sync_source_to_supabase_if_enabled(
        source_id="dummy-deleted-id",
        removed_source_id=removed_source_id,
        required=True,
    )
    _sync_dashboard_snapshot_to_supabase_if_enabled(snapshot_payload, required=False)

def list_gsheet_connections() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute("SELECT connection_id, url, spreadsheet_id, label, connected_at, last_sync_at, last_sync_rows, last_sync_pages FROM connected_sheets WHERE is_active = 1 ORDER BY connected_at DESC").fetchall()
    return [{"connectionId": r["connection_id"], "url": r["url"], "spreadsheetId": r["spreadsheet_id"], "label": r["label"], "connectedAt": r["connected_at"], "lastSyncAt": r["last_sync_at"], "lastSyncRows": r["last_sync_rows"], "lastSyncPages": r["last_sync_pages"]} for r in rows]

