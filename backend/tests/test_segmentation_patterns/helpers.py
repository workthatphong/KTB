from __future__ import annotations
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
