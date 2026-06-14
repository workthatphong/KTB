from __future__ import annotations

import csv
import datetime as dt
import io
import re
import zipfile
from pathlib import Path
import xml.etree.ElementTree as ET

from ...config.constants.constants_parsing import (
    CSV_DECODE_CANDIDATES,
    DATE_NUMBER_FORMAT_IDS,
    MOJIBAKE_MARKERS,
)


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


def parse_shared_strings(zf: zipfile.ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in zf.namelist():
        return []
    root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
    ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    values: list[str] = []
    for si in root.findall("m:si", ns):
        # shared string can have multiple runs
        parts = [node.text or "" for node in si.findall(".//m:t", ns)]
        values.append("".join(parts))
    return values


def parse_date_style_indexes(zf: zipfile.ZipFile) -> set[int]:
    if "xl/styles.xml" not in zf.namelist():
        return set()

    root = ET.fromstring(zf.read("xl/styles.xml"))
    ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

    custom_num_formats: dict[int, str] = {}
    for num_fmt in root.findall(".//m:numFmts/m:numFmt", ns):
        fmt_id = parse_int(num_fmt.attrib.get("numFmtId"))
        fmt_code = num_fmt.attrib.get("formatCode", "")
        if fmt_id is not None:
            custom_num_formats[fmt_id] = fmt_code

    date_style_indexes: set[int] = set()
    for idx, xf in enumerate(root.findall(".//m:cellXfs/m:xf", ns)):
        num_fmt_id = parse_int(xf.attrib.get("numFmtId")) or 0
        is_date = num_fmt_id in DATE_NUMBER_FORMAT_IDS
        if not is_date and num_fmt_id in custom_num_formats:
            is_date = is_date_number_format(custom_num_formats[num_fmt_id])
        if is_date:
            date_style_indexes.add(idx)
    return date_style_indexes


def parse_cell_value(
    cell: ET.Element,
    shared_strings: list[str],
    date_style_indexes: set[int],
    header_hint: str | None = None,
) -> str | float | int | bool | None:
    ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    cell_type = cell.attrib.get("t")
    style_index = parse_int(cell.attrib.get("s")) or 0

    if cell_type == "inlineStr":
        parts = [node.text or "" for node in cell.findall(".//m:t", ns)]
        return "".join(parts).strip()

    value_node = cell.find("m:v", ns)
    if value_node is None:
        return None
    raw = (value_node.text or "").strip()
    if raw == "":
        return None

    if cell_type == "s":
        idx = parse_int(raw)
        if idx is None or idx < 0 or idx >= len(shared_strings):
            return raw
        return shared_strings[idx]

    if cell_type == "b":
        return raw == "1"

    # numeric or general string
    try:
        number = float(raw)
        is_date_style = style_index in date_style_indexes
        if not is_date_style and header_hint:
            hint = normalize_text(header_hint)
            is_date_style = any(
                token in hint for token in ("date", "time", "timestamp")
            )
        if is_date_style:
            return excel_serial_to_datetime(number).strftime("%Y-%m-%d %H:%M:%S")
        if number.is_integer():
            return int(number)
        return number
    except ValueError:
        return raw


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


def parse_xlsx_bytes(payload: bytes) -> list[tuple[str, list[dict]]]:
    with zipfile.ZipFile(io.BytesIO(payload)) as zf:
        workbook = ET.fromstring(zf.read("xl/workbook.xml"))
        ns = {
            "m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
            "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
        }
        rel_ns = {"r": "http://schemas.openxmlformats.org/package/2006/relationships"}

        shared_strings = parse_shared_strings(zf)
        date_style_indexes = parse_date_style_indexes(zf)

        rel_root = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
        rel_map: dict[str, str] = {}
        for rel in rel_root.findall("r:Relationship", rel_ns):
            rel_map[rel.attrib["Id"]] = rel.attrib["Target"]

        result_pages: list[tuple[str, list[dict]]] = []
        for sheet in workbook.findall("m:sheets/m:sheet", ns):
            sheet_name = sheet.attrib.get("name", "Sheet")
            rel_id = sheet.attrib.get(
                "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
            )
            if not rel_id:
                continue

            target = rel_map.get(rel_id, "")
            if not target:
                continue
            if target.startswith("/"):
                sheet_path = target.lstrip("/")
            else:
                sheet_path = f"xl/{target}" if not target.startswith("xl/") else target
            if sheet_path not in zf.namelist():
                continue

            sheet_root = ET.fromstring(zf.read(sheet_path))
            row_nodes = sheet_root.findall(".//m:sheetData/m:row", ns)
            parsed_rows: list[tuple[int, dict[int, object]]] = []

            for row_node in row_nodes:
                row_number = parse_int(row_node.attrib.get("r")) or 0
                row_values: dict[int, object] = {}
                for cell in row_node.findall("m:c", ns):
                    ref = cell.attrib.get("r", "")
                    match = re.match(r"([A-Z]+)", ref)
                    if not match:
                        continue
                    col_idx = col_to_index(match.group(1))
                    value = parse_cell_value(cell, shared_strings, date_style_indexes)
                    if value not in (None, ""):
                        row_values[col_idx] = value
                if row_values:
                    parsed_rows.append((row_number, row_values))

            if not parsed_rows:
                result_pages.append((sheet_name, []))
                continue

            header_row_index = detect_header_row(parsed_rows)
            _, header_values = parsed_rows[header_row_index]
            headers = {
                col_idx: str(value).strip() for col_idx, value in header_values.items()
            }
            headers = dedupe_headers(headers)

            page_rows: list[dict] = []
            for row_num, row_values in parsed_rows[header_row_index + 1 :]:
                row_obj: dict[str, object] = {"__sheet_row_number": row_num}
                data_cells = 0
                for col_idx, value in row_values.items():
                    key = headers.get(col_idx, f"column_{index_to_col(col_idx)}")
                    if value not in (None, ""):
                        row_obj[key] = value
                        data_cells += 1
                if data_cells > 0:
                    page_rows.append(row_obj)

            # If there is no data row after header, keep page but empty list.
            result_pages.append((sheet_name, page_rows))

    return result_pages


def score_text_quality(text: str) -> int:
    score = 0
    score += text.count("\ufffd") * 10
    score += text.count("\x00") * 10
    for marker in MOJIBAKE_MARKERS:
        score += text.count(marker) * 4
    score += sum(1 for ch in text if ch not in "\r\n\t" and ord(ch) < 32) * 6

    thai_codes = [ord(ch) for ch in text if "\u0e00" <= ch <= "\u0e7f"]
    if thai_codes:
        thai_consonants = sum(1 for code in thai_codes if 0x0E01 <= code <= 0x0E2E)
        thai_total = len(thai_codes)
        # cp1252 decoded as cp874 often yields Thai marks but almost no consonants.
        if thai_total >= 2 and thai_consonants == 0:
            score += thai_total * 8
        elif thai_total >= 4 and thai_consonants * 3 < thai_total:
            score += (thai_total - (thai_consonants * 3)) * 3

    return score


def decode_csv_payload(payload: bytes) -> str:
    candidates: list[tuple[int, int, str]] = []
    for priority, encoding in enumerate(CSV_DECODE_CANDIDATES):
        try:
            decoded = payload.decode(encoding)
        except UnicodeDecodeError:
            continue
        candidates.append((score_text_quality(decoded), priority, decoded))
        if priority <= 1 and candidates[-1][0] == 0:
            break

    if not candidates:
        return payload.decode("utf-8", errors="replace")

    candidates.sort(key=lambda item: (item[0], item[1]))
    return candidates[0][2]


def parse_csv_bytes(payload: bytes) -> list[dict]:
    text = decode_csv_payload(payload)

    sample = text[:4096]
    delimiter = ","
    try:
        dialect = csv.Sniffer().sniff(sample)
        delimiter = dialect.delimiter
    except csv.Error:
        delimiter = ","

    stream = io.StringIO(text)
    reader = csv.DictReader(stream, delimiter=delimiter)
    rows: list[dict] = []
    for idx, row in enumerate(reader, start=2):
        normalized = {"__sheet_row_number": idx}
        for key, value in row.items():
            cleaned_key = (key or "").strip()
            if not cleaned_key:
                continue
            normalized[cleaned_key] = (value or "").strip()
        if len(normalized) > 1:
            rows.append(normalized)
    return rows


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
