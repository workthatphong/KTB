from __future__ import annotations
import datetime as dt
import re

def normalize_text(value: str | None) -> str:
    if value is None:
        return ""
    return re.sub(r"[^a-z0-9]+", "", str(value).lower())


def parse_int(value) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(float(str(value).strip()))
    except (TypeError, ValueError):
        return None


def excel_serial_to_datetime(serial: float) -> dt.datetime:
    # Excel 1900 date system with leap-year bug compensation
    epoch = dt.datetime(1899, 12, 30)
    return epoch + dt.timedelta(days=serial)


def col_to_index(col: str) -> int:
    result = 0
    for ch in col:
        result = result * 26 + (ord(ch) - ord("A") + 1)
    return result


def index_to_col(index: int) -> str:
    if index <= 0:
        return "A"
    chars: list[str] = []
    while index:
        index, rem = divmod(index - 1, 26)
        chars.append(chr(rem + ord("A")))
    return "".join(reversed(chars))


def is_date_number_format(code: str) -> bool:
    lower = code.lower()
    # Keep this conservative: require date tokens and avoid plain numbers
    return any(token in lower for token in ["yy", "dd", "mm", "hh", "ss"])


def dedupe_headers(headers: dict[int, str]) -> dict[int, str]:
    used: dict[str, int] = {}
    result: dict[int, str] = {}
    for col_idx, header in headers.items():
        cleaned = (header or "").strip()
        if not cleaned:
            cleaned = f"column_{index_to_col(col_idx)}"
        base = cleaned
        if base not in used:
            used[base] = 1
            result[col_idx] = base
            continue
        used[base] += 1
        result[col_idx] = f"{base}_{used[base]}"
    return result


def detect_header_row(rows: list[tuple[int, dict[int, object]]]) -> int:
    for idx, (_, row_values) in enumerate(rows):
        non_empty = [v for v in row_values.values() if v not in (None, "")]
        text_cells = [
            v for v in non_empty if isinstance(v, str) and not str(v).strip().isdigit()
        ]
        if len(non_empty) >= 2 and len(text_cells) >= 1:
            return idx
    return 0


