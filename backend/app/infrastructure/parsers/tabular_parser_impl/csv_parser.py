from __future__ import annotations
import csv
import io

from ....config.constants.constants_parsing import (
    CSV_DECODE_CANDIDATES,
    MOJIBAKE_MARKERS,
)

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


