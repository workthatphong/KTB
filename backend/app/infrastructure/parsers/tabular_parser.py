from __future__ import annotations
from pathlib import Path

from .tabular_parser_impl.xlsx_parser import parse_xlsx_bytes, parse_shared_strings, parse_date_style_indexes, parse_cell_value
from .tabular_parser_impl.csv_parser import parse_csv_bytes, score_text_quality, decode_csv_payload
from .tabular_parser_impl.utils import (
    normalize_text, parse_int, excel_serial_to_datetime, 
    col_to_index, index_to_col, is_date_number_format,
    dedupe_headers, detect_header_row
)

def parse_uploaded_file(file_name: str, payload: bytes) -> list[tuple[str, list[dict]]]:
    suffix = Path(file_name).suffix.lower()
    if suffix in {".xlsx", ".xlsm"}:
        return parse_xlsx_bytes(payload)
    if suffix == ".csv":
        return [("CSV", parse_csv_bytes(payload))]
    if suffix == ".xls":
        raise ValueError(
            "Unsupported .xls format. Please save as .xlsx and upload again."
        )
    raise ValueError(f"Unsupported file type: {suffix or '(no extension)'}")
