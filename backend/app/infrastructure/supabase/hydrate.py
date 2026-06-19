from __future__ import annotations

import sqlite3
import time
from pathlib import Path
from typing import Any

from .client import (
    _emit_supabase_trace,
    _get_client,
    _set_last_error,
    _clear_last_error,
    _supabase_request,
)
from .constants import _TABLES

def _fetch_all_rows(table_name: str, order: str | None = None) -> list[dict[str, Any]]:
    started_at = time.perf_counter()
    page_size = 1000
    offset = 0
    rows: list[dict[str, Any]] = []
    page_count = 0

    while True:
        query = {
            "select": "*",
            "limit": str(page_size),
            "offset": str(offset),
        }
        if order:
            query["order"] = order
        page = _supabase_request("GET", table_name, query=query) or []
        page_count += 1
        if not isinstance(page, list):
            raise RuntimeError(f"Unexpected Supabase response for table '{table_name}'")
        if not page:
            break
        rows.extend(page)
        _emit_supabase_trace(
            f"fetch_page table={table_name} page={page_count} offset={offset} rows={len(page)} total_rows={len(rows)}"
        )
        if len(page) < page_size:
            break
        offset += len(page)

    elapsed_ms = (time.perf_counter() - started_at) * 1000
    _emit_supabase_trace(
        f"fetch_table_done table={table_name} total_rows={len(rows)} pages={page_count} elapsed_ms={elapsed_ms:.1f}"
    )
    return rows


def _create_empty_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS source_files (
            source_id TEXT PRIMARY KEY,
            file_name TEXT NOT NULL UNIQUE,
            file_ext TEXT,
            uploaded_at TEXT NOT NULL,
            total_rows INTEGER NOT NULL DEFAULT 0,
            total_pages INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS source_pages (
            source_id TEXT NOT NULL,
            page_name TEXT NOT NULL,
            row_count INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (source_id, page_name),
            FOREIGN KEY (source_id) REFERENCES source_files(source_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS unified_rows (
            row_id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_id TEXT NOT NULL,
            file_name TEXT NOT NULL,
            page_name TEXT NOT NULL,
            row_number INTEGER NOT NULL,
            data_json TEXT NOT NULL,
            ingested_at TEXT NOT NULL,
            FOREIGN KEY (source_id) REFERENCES source_files(source_id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_unified_file_page ON unified_rows(file_name, page_name);
        CREATE INDEX IF NOT EXISTS idx_unified_source ON unified_rows(source_id);

        CREATE TABLE IF NOT EXISTS connected_sheets (
            connection_id TEXT PRIMARY KEY,
            url TEXT NOT NULL,
            spreadsheet_id TEXT NOT NULL,
            label TEXT NOT NULL,
            connected_at TEXT NOT NULL,
            last_sync_at TEXT,
            last_sync_rows INTEGER DEFAULT 0,
            last_sync_pages INTEGER DEFAULT 0,
            is_active INTEGER NOT NULL DEFAULT 1
        );
        """
    )


def hydrate_sqlite_from_supabase(db_path: Path) -> bool:
    client = _get_client()
    if client is None:
        return False

    total_started_at = time.perf_counter()
    try:
        fetch_started_at = time.perf_counter()
        source_rows = _fetch_all_rows(_TABLES["source_files"], order="uploaded_at.desc")
        page_rows = _fetch_all_rows(_TABLES["source_pages"])
        unified_rows = _fetch_all_rows(_TABLES["unified_rows"], order="row_id.asc")
        connection_rows = _fetch_all_rows(
            _TABLES["connected_sheets"], order="connected_at.desc"
        )
        _emit_supabase_trace(
            "hydrate_fetch_done "
            f"source_files={len(source_rows)} source_pages={len(page_rows)} "
            f"unified_rows={len(unified_rows)} connected_sheets={len(connection_rows)} "
            f"elapsed_ms={(time.perf_counter() - fetch_started_at) * 1000:.1f}"
        )
    except Exception as exc:
        _set_last_error(f"{type(exc).__name__}: {exc}")
        raise

    if not source_rows:
        return False

    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    try:
        sqlite_started_at = time.perf_counter()
        _create_empty_schema(conn)
        conn.executescript(
            """
            DELETE FROM unified_rows;
            DELETE FROM source_pages;
            DELETE FROM connected_sheets;
            DELETE FROM source_files;
            """
        )

        for row in source_rows:
            conn.execute(
                """
                INSERT OR REPLACE INTO source_files (source_id, file_name, file_ext, uploaded_at, total_rows, total_pages)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    row.get("source_id"),
                    row.get("file_name"),
                    row.get("file_ext"),
                    row.get("uploaded_at"),
                    int(row.get("total_rows") or 0),
                    int(row.get("total_pages") or 0),
                ),
            )

        for row in page_rows:
            conn.execute(
                """
                INSERT OR REPLACE INTO source_pages (source_id, page_name, row_count)
                VALUES (?, ?, ?)
                """,
                (
                    row.get("source_id"),
                    row.get("page_name"),
                    int(row.get("row_count") or 0),
                ),
            )

        for row in unified_rows:
            conn.execute(
                """
                INSERT OR REPLACE INTO unified_rows (row_id, source_id, file_name, page_name, row_number, data_json, ingested_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    int(row.get("row_id") or 0),
                    row.get("source_id"),
                    row.get("file_name"),
                    row.get("page_name"),
                    int(row.get("row_number") or 0),
                    row.get("data_json") or "{}",
                    row.get("ingested_at") or "",
                ),
            )

        for row in connection_rows:
            conn.execute(
                """
                INSERT OR REPLACE INTO connected_sheets (
                    connection_id, url, spreadsheet_id, label, connected_at,
                    last_sync_at, last_sync_rows, last_sync_pages, is_active
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    row.get("connection_id"),
                    row.get("url"),
                    row.get("spreadsheet_id"),
                    row.get("label"),
                    row.get("connected_at"),
                    row.get("last_sync_at"),
                    int(row.get("last_sync_rows") or 0),
                    int(row.get("last_sync_pages") or 0),
                    int(row.get("is_active") or 1),
                ),
            )

        seq_row = conn.execute("SELECT COALESCE(MAX(row_id), 0) FROM unified_rows").fetchone()
        max_row_id = int(seq_row[0] if seq_row else 0)
        try:
            conn.execute(
                "INSERT OR REPLACE INTO sqlite_sequence(name, seq) VALUES ('unified_rows', ?)",
                (max_row_id,),
            )
        except sqlite3.OperationalError:
            pass

        conn.commit()
        _emit_supabase_trace(
            "hydrate_sqlite_done "
            f"source_files={len(source_rows)} source_pages={len(page_rows)} "
            f"unified_rows={len(unified_rows)} connected_sheets={len(connection_rows)} "
            f"elapsed_ms={(time.perf_counter() - sqlite_started_at) * 1000:.1f}"
        )
    finally:
        conn.close()

    _emit_supabase_trace(
        f"hydrate_total_done elapsed_ms={(time.perf_counter() - total_started_at) * 1000:.1f}"
    )
    _clear_last_error()
    return True
