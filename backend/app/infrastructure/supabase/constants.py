from __future__ import annotations

_TABLES = {
    "source_files": "source_files",
    "source_pages": "source_pages",
    "unified_rows": "unified_rows",
    "connected_sheets": "connected_sheets",
}

_TABLE_DELETE_FILTERS = {
    "source_files": ("source_id", "not.is.null"),
    "source_pages": ("source_id", "not.is.null"),
    "unified_rows": ("row_id", "not.is.null"),
    "connected_sheets": ("connection_id", "not.is.null"),
}
