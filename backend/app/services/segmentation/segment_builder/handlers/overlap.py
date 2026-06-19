from __future__ import annotations

from .....config.constants.constants_workflow import (
    COMPLETED_STATE,
    USER_EDIT_CHANGE_TYPES,
    USER_METADATA_EDIT_CHANGE_TYPES,
)
from ..factory import build_segment
from .common import completion_segment_type

def _review_overlap_detail_event(interval: dict) -> dict | None:
    if (
        interval["enter_actor_type"] != "User"
        or interval["exit_actor_type"] != "User"
        or not interval["enter_actor"]
        or not interval["exit_actor"]
        or interval["enter_actor"] == interval["exit_actor"]
    ):
        return None

    user_detail_events = [
        event
        for event in interval["inner_events"]
        if event["actor_type"] == "User"
        and not event["is_status_event"]
        and event["actor_name"] != "User0"
    ]
    if not user_detail_events:
        return None

    first_user_detail = user_detail_events[0]
    overlap_actor = first_user_detail["actor_name"]
    if not overlap_actor or overlap_actor == interval["enter_actor"]:
        return None
    if interval["exit_actor"] != overlap_actor:
        return None
    if any(event["actor_name"] == interval["enter_actor"] for event in user_detail_events):
        return None
    if any(event["actor_name"] != overlap_actor for event in user_detail_events):
        return None

    return first_user_detail

def overlap_review_actor_segments(interval: dict) -> list[dict]:
    overlap_start_event = _review_overlap_detail_event(interval)
    if overlap_start_event is None:
        return []

    overlap_actor = overlap_start_event["actor_name"]
    overlap_user_events = [
        event
        for event in interval["inner_events"]
        if event["order_index"] >= overlap_start_event["order_index"]
        and event["actor_type"] == "User"
        and not event["is_status_event"]
        and event["actor_name"] == overlap_actor
    ]
    overlap_edit_count = len(
        [
            event
            for event in overlap_user_events
            if event["change_type"] in USER_EDIT_CHANGE_TYPES
        ]
    )
    overlap_metadata_edit_count = len(
        [
            event
            for event in overlap_user_events
            if event["change_type"] in USER_METADATA_EDIT_CHANGE_TYPES
        ]
    )
    overlap_segment_type = "USER_EDITING_CORRECTION"
    if interval["exit_to"] == COMPLETED_STATE:
        overlap_segment_type = completion_segment_type(
            overlap_edit_count,
            overlap_metadata_edit_count,
        )
        if (
            overlap_segment_type == "USER_COMPLETION_APPROVAL"
            and overlap_user_events
        ):
            overlap_segment_type = "USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL"
    elif overlap_edit_count == 0 and overlap_metadata_edit_count > 0:
        overlap_segment_type = "USER_EDITING_METADATA_CORRECTION"

    return [
        build_segment(
            interval,
            "USER_REVIEW_COMMENT_CHECK",
            interval["start_event"],
            interval["end_event"],
            actor_name=interval["enter_actor"],
            actor_type="User",
            is_active_work=True,
            is_idle=False,
        ),
        build_segment(
            interval,
            overlap_segment_type,
            interval["start_event"],
            interval["end_event"],
            actor_name=overlap_actor,
            actor_type="User",
            is_active_work=True,
            is_idle=False,
        ),
    ]
