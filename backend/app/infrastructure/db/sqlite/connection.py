from __future__ import annotations
import sqlite3
from ....config.constants.constants_paths import DB_PATH

def get_conn() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def current_unified_rows_signature(
    conn: sqlite3.Connection | None = None,
) -> tuple[int, int]:
    owns_conn = conn is None
    local_conn = conn or get_conn()
    try:
        row = local_conn.execute(
            "SELECT COUNT(*) AS c, COALESCE(MAX(row_id), 0) AS max_row_id FROM unified_rows"
        ).fetchone()
        count = int(row["c"] if row else 0)
        max_row_id = int(row["max_row_id"] if row else 0)
        return count, max_row_id
    finally:
        if owns_conn:
            local_conn.close()


def init_db() -> None:
    with get_conn() as conn:
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

            CREATE TABLE IF NOT EXISTS dashboard_snapshots (
                snapshot_key TEXT PRIMARY KEY,
                updated_at TEXT NOT NULL,
                row_count INTEGER NOT NULL DEFAULT 0,
                source_count INTEGER NOT NULL DEFAULT 0,
                algorithm_version TEXT NOT NULL DEFAULT '',
                payload_json TEXT NOT NULL
            );
            """
        )
