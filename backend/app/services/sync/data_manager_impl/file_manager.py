from __future__ import annotations
import uuid
import json
from pathlib import Path

from ....infrastructure.db.sqlite_store import (
    _sync_dashboard_snapshot_to_supabase_if_enabled,
    _sync_source_to_supabase_if_enabled,
    ensure_full_raw_state_from_supabase_if_enabled,
    get_conn,
)
from ...segmentation import engine as segmentation_engine
from ...dashboard_snapshot import rebuild_dashboard_snapshot
from ....infrastructure.parsers import tabular_parser
from .utils import utc_now_iso, invalidate_runtime_caches
from .db_ops import clear_source_by_file_name

def ingest_file(file_name: str, payload: bytes) -> dict:
    ensure_full_raw_state_from_supabase_if_enabled()
    pages = tabular_parser.parse_uploaded_file(file_name, payload)
    now = utc_now_iso()
    source_id = uuid.uuid4().hex
    file_ext = Path(file_name).suffix.lower()
    total_rows = 0
    removed_source_id: str | None = None
    with get_conn() as conn:
        removed_source_id = clear_source_by_file_name(conn, file_name)
        conn.execute("INSERT INTO source_files (source_id, file_name, file_ext, uploaded_at, total_rows, total_pages) VALUES (?, ?, ?, ?, 0, 0)", (source_id, file_name, file_ext, now))
        for page_name, rows in pages:
            conn.execute("INSERT INTO source_pages (source_id, page_name, row_count) VALUES (?, ?, ?)", (source_id, page_name, len(rows)))
            for idx, row in enumerate(rows, start=1):
                row_number = segmentation_engine.parse_int(row.get("__sheet_row_number")) or idx
                data_json = json.dumps(row, ensure_ascii=False)
                conn.execute("INSERT INTO unified_rows (source_id, file_name, page_name, row_number, data_json, ingested_at) VALUES (?, ?, ?, ?, ?, ?)", (source_id, file_name, page_name, row_number, data_json, now))
            total_rows += len(rows)
        conn.execute("UPDATE source_files SET total_rows = ?, total_pages = ? WHERE source_id = ?", (total_rows, len(pages), source_id))
    invalidate_runtime_caches()
    snapshot_payload = rebuild_dashboard_snapshot(sync_remote=False)
    _sync_source_to_supabase_if_enabled(
        source_id=source_id,
        removed_source_id=removed_source_id,
        required=True,
    )
    _sync_dashboard_snapshot_to_supabase_if_enabled(snapshot_payload, required=False)
    return {"source_id": source_id, "file_name": file_name, "total_rows": total_rows, "total_pages": len(pages), "pages": [name for name, _ in pages], "uploaded_at": now}

def list_sources() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute("""
            SELECT sf.source_id, sf.file_name, sf.file_ext, sf.uploaded_at, sf.total_rows, sf.total_pages,
                   GROUP_CONCAT(sp.page_name, ' | ') AS page_names
            FROM source_files sf
            LEFT JOIN source_pages sp ON sf.source_id = sp.source_id
            GROUP BY sf.source_id, sf.file_name, sf.file_ext, sf.uploaded_at, sf.total_rows, sf.total_pages
            ORDER BY sf.uploaded_at DESC
        """).fetchall()
    result = []
    for row in rows:
        page_names = [name.strip() for name in (row["page_names"] or "").split("|") if name.strip()]
        result.append({"sourceId": row["source_id"], "name": row["file_name"], "fileName": row["file_name"], "type": (row["file_ext"] or "").replace(".", "") or "file", "rows": row["total_rows"], "pageCount": row["total_pages"], "pages": page_names, "status": "Active", "date": row["uploaded_at"]})
    return result

def delete_source(source_id: str) -> None:
    ensure_full_raw_state_from_supabase_if_enabled()
    with get_conn() as conn:
        conn.execute("DELETE FROM unified_rows WHERE source_id = ?", (source_id,))
        conn.execute("DELETE FROM source_pages WHERE source_id = ?", (source_id,))
        conn.execute("DELETE FROM source_files WHERE source_id = ?", (source_id,))
    invalidate_runtime_caches()
    snapshot_payload = rebuild_dashboard_snapshot(sync_remote=False)
    _sync_to_supabase_if_enabled(required=True)
    _sync_dashboard_snapshot_to_supabase_if_enabled(snapshot_payload, required=False)
