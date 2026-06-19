from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .client import (
    _get_client,
    _mark_sync_failure,
    _set_last_error,
    _clear_last_error,
    _supabase_request,
)
from .constants import _TABLES, _TABLE_DELETE_FILTERS
from .utils import _chunk, _fetch_table_rows

def sync_sqlite_to_supabase(db_path: Path) -> bool:
    client = _get_client()
    if client is None:
        error_message = _last_error or "Supabase client is not ready"
        _mark_sync_failure(error_message)
        return False

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        tables = {
            "source_files": _fetch_table_rows(conn, "source_files", "uploaded_at DESC"),
            "source_pages": _fetch_table_rows(conn, "source_pages"),
            "unified_rows": _fetch_table_rows(conn, "unified_rows", "row_id ASC"),
            "connected_sheets": _fetch_table_rows(
                conn, "connected_sheets", "connected_at DESC"
            ),
        }
    finally:
        conn.close()

    try:
        for table_name, remote_table in _TABLES.items():
            filter_name, filter_value = _TABLE_DELETE_FILTERS[table_name]
            _supabase_request(
                "DELETE",
                remote_table,
                query={filter_name: filter_value},
                prefer="return=minimal",
            )

            rows = tables[table_name]
            for row_batch in _chunk(rows, chunk_size=300):
                _supabase_request(
                    "POST",
                    remote_table,
                    payload=row_batch,
                    prefer="resolution=merge-duplicates,return=minimal",
                )

        _supabase_request(
            "POST",
            "dashboard_meta_state",
            payload=[
                {
                    "id": "state",
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "row_count": len(tables["unified_rows"]),
                    "source_count": len(tables["source_files"]),
                }
            ],
            prefer="resolution=merge-duplicates,return=minimal",
        )
    except Exception as exc:
        _set_last_error(f"{type(exc).__name__}: {exc}")
        raise

    _clear_last_error()
    return True


def _upsert_rows(table_name: str, rows: list[dict[str, Any]], chunk_size: int = 300) -> None:
    if not rows:
        return
    for row_batch in _chunk(rows, chunk_size=chunk_size):
        _supabase_request(
            "POST",
            table_name,
            payload=row_batch,
            prefer="resolution=merge-duplicates,return=minimal",
        )


def _delete_by_source_id(table_name: str, source_id: str) -> None:
    _supabase_request(
        "DELETE",
        table_name,
        query={"source_id": f"eq.{source_id}"},
        prefer="return=minimal",
    )


def sync_source_to_supabase(
    db_path: Path,
    source_id: str,
    removed_source_id: str | None = None,
) -> bool:
    client = _get_client()
    if client is None:
        error_message = _last_error or "Supabase client is not ready"
        _mark_sync_failure(error_message)
        return False

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        source_file = conn.execute(
            "SELECT * FROM source_files WHERE source_id = ?",
            (source_id,),
        ).fetchall()
        source_pages = conn.execute(
            "SELECT * FROM source_pages WHERE source_id = ?",
            (source_id,),
        ).fetchall()
        source_rows = conn.execute(
            "SELECT * FROM unified_rows WHERE source_id = ? ORDER BY row_id ASC",
            (source_id,),
        ).fetchall()
        totals = conn.execute(
            """
            SELECT
                (SELECT COUNT(*) FROM unified_rows) AS row_count,
                (SELECT COUNT(*) FROM source_files) AS source_count
            """
        ).fetchone()
        row_count = int(totals["row_count"] if totals else 0)
        source_count = int(totals["source_count"] if totals else 0)
        
        connected_sheets = conn.execute("SELECT * FROM connected_sheets").fetchall()
    finally:
        conn.close()

    try:
        if removed_source_id and removed_source_id != source_id:
            _delete_by_source_id("unified_rows", removed_source_id)
            _delete_by_source_id("source_pages", removed_source_id)
            _delete_by_source_id("source_files", removed_source_id)

        _upsert_rows("source_files", [dict(row) for row in source_file], chunk_size=100)
        _upsert_rows("source_pages", [dict(row) for row in source_pages], chunk_size=300)
        _upsert_rows("unified_rows", [dict(row) for row in source_rows], chunk_size=300)

        # Always sync connected_sheets during partial sync since it's very small and crucial for gsheet tracking
        _supabase_request("DELETE", "connected_sheets", query={"connection_id": "not.is.null"}, prefer="return=minimal")
        _upsert_rows("connected_sheets", [dict(row) for row in connected_sheets], chunk_size=100)

        _supabase_request(
            "POST",
            "dashboard_meta_state",
            payload=[
                {
                    "id": "state",
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "row_count": row_count,
                    "source_count": source_count,
                }
            ],
            prefer="resolution=merge-duplicates,return=minimal",
        )
    except Exception as exc:
        _set_last_error(f"{type(exc).__name__}: {exc}")
        raise

    _clear_last_error()
    return True


