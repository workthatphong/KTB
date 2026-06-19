import os
import shutil

src_file = '/workspaces/KTB/backend/tests/test_segmentation_sheet8_pattern.py'
dest_dir = '/workspaces/KTB/backend/tests/test_segmentation_patterns'

os.makedirs(dest_dir, exist_ok=True)

with open(src_file, 'r') as f:
    content = f.read()

def extract_block(text, start_str, end_str=None):
    start = text.find(start_str)
    if start == -1: return ""
    if end_str is None: return text[start:]
    end = text.find(end_str, start)
    if end == -1: return text[start:]
    return text[start:end]

helpers_content = """from __future__ import annotations
import datetime as dt

def _event(
    row_number: int,
    event_time: dt.datetime,
    actor_name: str,
    actor_type: str,
    *,
    change_type: str,
    from_status: str = "",
    to_status: str = "",
    from_value: str = "",
    to_value: str = "",
) -> dict:
    is_status_event = change_type == "Spread Status"
    return {
        "event_id": f"sheet8#{row_number}",
        "source_id": 1,
        "file_name": "gsheet_1bXaHSLaUAkW.csv",
        "page_name": "ชีต8",
        "row_number": row_number,
        "event_time": event_time,
        "actor_name": actor_name,
        "actor_type": actor_type,
        "document_id": "gsheet_1bXaHSLaUAkW.csv::ชีต8",
        "change_type": change_type,
        "statement_type": "N/A",
        "changed_value": "Status" if is_status_event else "Depreciation for the year",
        "from_value": from_status if is_status_event else from_value,
        "to_value": to_status if is_status_event else to_value,
        "from_status": from_status if is_status_event else "",
        "to_status": to_status if is_status_event else "",
        "from_status_raw": from_status,
        "to_status_raw": to_status,
        "action_type": change_type,
        "submitted_for_reanalysis": False,
        "auto_closed": False,
        "is_status_event": is_status_event,
        "is_detail_event": not is_status_event,
        "order_index": -1,
        "raw": {},
    }
"""
with open(os.path.join(dest_dir, 'helpers.py'), 'w') as f:
    f.write(helpers_content)

test_sheet8 = extract_block(content, "class Sheet8PatternSegmentationTest(unittest.TestCase):", "class Sheet19PatternSegmentationTest(unittest.TestCase):")
with open(os.path.join(dest_dir, 'test_sheet8.py'), 'w') as f:
    f.write(f"""from __future__ import annotations
import datetime as dt
import unittest
from backend.app.services.segmentation.segment_builder.document import build_segments_for_document
from .helpers import _event

""" + test_sheet8)

test_sheet19 = extract_block(content, "class Sheet19PatternSegmentationTest(unittest.TestCase):", "class Sheet20PatternSegmentationTest(unittest.TestCase):")
with open(os.path.join(dest_dir, 'test_sheet19.py'), 'w') as f:
    f.write(f"""from __future__ import annotations
import datetime as dt
import unittest
from backend.app.services.segmentation.segment_builder.document import build_segments_for_document
from .helpers import _event

""" + test_sheet19)

test_sheet20 = extract_block(content, "class Sheet20PatternSegmentationTest(unittest.TestCase):", "class ReviewActorOverlapSegmentationTest(unittest.TestCase):")
with open(os.path.join(dest_dir, 'test_sheet20.py'), 'w') as f:
    f.write(f"""from __future__ import annotations
import datetime as dt
import unittest
from backend.app.services.segmentation.segment_builder.document import build_segments_for_document
from .helpers import _event

""" + test_sheet20)

test_review_overlap = extract_block(content, "class ReviewActorOverlapSegmentationTest(unittest.TestCase):", "class Sheet25PatternSegmentationTest(unittest.TestCase):")
with open(os.path.join(dest_dir, 'test_review_overlap.py'), 'w') as f:
    f.write(f"""from __future__ import annotations
import datetime as dt
import unittest
from backend.app.services.segmentation.segment_builder.document import build_segments_for_document
from .helpers import _event

""" + test_review_overlap)

test_sheet25 = extract_block(content, "class Sheet25PatternSegmentationTest(unittest.TestCase):", "class SsoClappUserResolutionTest(unittest.TestCase):")
with open(os.path.join(dest_dir, 'test_sheet25.py'), 'w') as f:
    f.write(f"""from __future__ import annotations
import datetime as dt
import unittest
from backend.app.services.segmentation.segment_builder.document import build_segments_for_document
from .helpers import _event

""" + test_sheet25)

test_sso = extract_block(content, "class SsoClappUserResolutionTest(unittest.TestCase):", "if __name__ == \"__main__\":")
with open(os.path.join(dest_dir, 'test_sso_clapp_user.py'), 'w') as f:
    f.write(f"""from __future__ import annotations
import unittest
from backend.app.services.segmentation.event_loader import _is_disallowed_sheet_user, _resolve_sso_clapp_sheet_user

""" + test_sso)

os.remove(src_file)
print("Tests refactor complete.")
