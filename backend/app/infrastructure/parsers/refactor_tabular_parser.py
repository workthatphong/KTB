import os

base_dir = '/workspaces/KTB/backend/app/infrastructure/parsers/tabular_parser_impl'
os.makedirs(base_dir, exist_ok=True)
filepath = '/workspaces/KTB/backend/app/infrastructure/parsers/tabular_parser.py'

with open(filepath, 'r') as f:
    content = f.read()

def extract_block(text, start_str, end_str=None):
    start = text.find(start_str)
    if start == -1: return ""
    if end_str is None: return text[start:]
    end = text.find(end_str, start)
    if end == -1: return text[start:]
    return text[start:end]

# 1. __init__.py
with open(os.path.join(base_dir, '__init__.py'), 'w') as f:
    f.write("")

# 2. utils.py
utils_part1 = extract_block(content, "def normalize_text", "def parse_shared_strings")
utils_part2 = extract_block(content, "def dedupe_headers", "def parse_xlsx_bytes")
utils_content = """from __future__ import annotations
import datetime as dt
import re

""" + utils_part1 + utils_part2
with open(os.path.join(base_dir, 'utils.py'), 'w') as f:
    f.write(utils_content)

# 3. xlsx_parser.py
xlsx_part1 = extract_block(content, "def parse_shared_strings", "def dedupe_headers")
xlsx_part2 = extract_block(content, "def parse_xlsx_bytes", "def score_text_quality")
xlsx_content = """from __future__ import annotations
import io
import re
import zipfile
import xml.etree.ElementTree as ET

from ....config.constants.constants_parsing import DATE_NUMBER_FORMAT_IDS
from .utils import (
    parse_int, is_date_number_format, excel_serial_to_datetime,
    normalize_text, col_to_index, index_to_col, dedupe_headers, detect_header_row
)

""" + xlsx_part1 + xlsx_part2
with open(os.path.join(base_dir, 'xlsx_parser.py'), 'w') as f:
    f.write(xlsx_content)

# 4. csv_parser.py
csv_part = extract_block(content, "def score_text_quality", "def parse_uploaded_file")
csv_content = """from __future__ import annotations
import csv
import io

from ....config.constants.constants_parsing import (
    CSV_DECODE_CANDIDATES,
    MOJIBAKE_MARKERS,
)

""" + csv_part
with open(os.path.join(base_dir, 'csv_parser.py'), 'w') as f:
    f.write(csv_content)

# 5. tabular_parser.py (Proxy)
proxy_part = extract_block(content, "def parse_uploaded_file", None)
proxy_content = """from __future__ import annotations
from pathlib import Path

from .tabular_parser_impl.xlsx_parser import parse_xlsx_bytes, parse_shared_strings, parse_date_style_indexes, parse_cell_value
from .tabular_parser_impl.csv_parser import parse_csv_bytes, score_text_quality, decode_csv_payload
from .tabular_parser_impl.utils import (
    normalize_text, parse_int, excel_serial_to_datetime, 
    col_to_index, index_to_col, is_date_number_format,
    dedupe_headers, detect_header_row
)

""" + proxy_part
with open(filepath, 'w') as f:
    f.write(proxy_content)

print("tabular_parser refactoring complete.")
