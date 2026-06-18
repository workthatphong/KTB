from __future__ import annotations

import datetime as dt

from backend.app.services.segmentation.segment_builder.factory import build_segment


def _event(
    row_number: int,
    order_index: int,
    event_time: dt.datetime,
    *,
    actor_name: str,
    actor_type: str,
    change_type: str,
    is_status_event: bool,
) -> dict:
    return {
        "row_number": row_number,
        "order_index": order_index,
        "event_time": event_time,
        "actor_name": actor_name,
        "actor_type": actor_type,
        "change_type": change_type,
        "is_status_event": is_status_event,
        "file_name": "demo.xlsx",
        "page_name": "Sheet 1",
    }


def test_build_segment_counts_multiple_metadata_rows_in_one_edit_session() -> None:
    base_time = dt.datetime(2026, 4, 20, 17, 11, 49)
    start_event = _event(
        10,
        10,
        base_time,
        actor_name="cognize user",
        actor_type="User",
        change_type="Spread Status",
        is_status_event=True,
    )
    meta_event_1 = _event(
        11,
        11,
        dt.datetime(2026, 4, 20, 17, 12, 42),
        actor_name="cognize user",
        actor_type="User",
        change_type="Spread Metadata",
        is_status_event=False,
    )
    meta_event_2 = _event(
        12,
        12,
        dt.datetime(2026, 4, 20, 17, 12, 42),
        actor_name="cognize user",
        actor_type="User",
        change_type="Spread Metadata",
        is_status_event=False,
    )
    end_event = _event(
        13,
        13,
        dt.datetime(2026, 4, 20, 17, 16, 33),
        actor_name="cognize user",
        actor_type="User",
        change_type="Spread Status",
        is_status_event=True,
    )

    interval = {
        "document_id": "demo.xlsx::Sheet 1",
        "inner_events": [meta_event_1, meta_event_2],
    }

    segment = build_segment(
        interval,
        "USER_EDITING_METADATA_CORRECTION",
        start_event,
        end_event,
        actor_name="cognize user",
        actor_type="User",
        is_active_work=True,
        is_idle=False,
    )

    assert segment["editMetaItemCount"] == 2
    assert segment["editDataItemCount"] == 0


def test_build_segment_counts_multiple_data_rows_in_one_edit_session() -> None:
    base_time = dt.datetime(2026, 4, 20, 12, 10, 2)
    start_event = _event(
        20,
        20,
        base_time,
        actor_name="cognize user",
        actor_type="User",
        change_type="Spread Status",
        is_status_event=True,
    )
    data_event_1 = _event(
        21,
        21,
        dt.datetime(2026, 4, 20, 12, 14, 19),
        actor_name="cognize user",
        actor_type="User",
        change_type="Mapped Account",
        is_status_event=False,
    )
    data_event_2 = _event(
        22,
        22,
        dt.datetime(2026, 4, 20, 12, 27, 20),
        actor_name="cognize user",
        actor_type="User",
        change_type="Mapped Account",
        is_status_event=False,
    )
    end_event = _event(
        23,
        23,
        dt.datetime(2026, 4, 20, 12, 36, 20),
        actor_name="cognize user",
        actor_type="User",
        change_type="Spread Status",
        is_status_event=True,
    )

    interval = {
        "document_id": "demo.xlsx::Sheet 1",
        "inner_events": [data_event_1, data_event_2],
    }

    segment = build_segment(
        interval,
        "USER_EDITING_CORRECTION",
        start_event,
        end_event,
        actor_name="cognize user",
        actor_type="User",
        is_active_work=True,
        is_idle=False,
    )

    assert segment["editDataItemCount"] == 2
    assert segment["editMetaItemCount"] == 0
