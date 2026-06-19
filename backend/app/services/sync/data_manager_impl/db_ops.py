from __future__ import annotations
import sqlite3

def clear_source_by_file_name(conn: sqlite3.Connection, file_name: str) -> str | None:
    row = conn.execute(
        "SELECT source_id FROM source_files WHERE file_name = ?",
        (file_name,),
    ).fetchone()
    if not row:
        return None
    source_id = row["source_id"]
    conn.execute("DELETE FROM unified_rows WHERE source_id = ?", (source_id,))
    conn.execute("DELETE FROM source_pages WHERE source_id = ?", (source_id,))
    conn.execute("DELETE FROM source_files WHERE source_id = ?", (source_id,))
    return str(source_id)
