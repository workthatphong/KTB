from __future__ import annotations

import sqlite3
from typing import Any

def _fetch_table_rows(
    conn: sqlite3.Connection, table_name: str, order_by: str | None = None
) -> list[dict[str, Any]]:
    query = f"SELECT * FROM {table_name}"
    if order_by:
        query = f"{query} ORDER BY {order_by}"
    rows = conn.execute(query).fetchall()
    return [dict(row) for row in rows]


def _chunk(items: list[dict[str, Any]], chunk_size: int = 300):
    for idx in range(0, len(items), chunk_size):
        yield items[idx : idx + chunk_size]


