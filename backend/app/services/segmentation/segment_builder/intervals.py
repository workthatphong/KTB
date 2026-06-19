from __future__ import annotations

from ....config.constants.constants_workflow import (
    COMPLETED_STATE,
    IN_REVIEW_STATE,
    PENDING_STATES,
)
from .factory import build_segment
from .helpers import is_same_timestamp_reopen_to_review_handoff
from .handlers.handoff import same_timestamp_handoff_segments
from .handlers.pending import pending_segments
from .handlers.in_review import in_review_segments
from .handlers.completed import completed_segments

def build_interval_segments(interval: dict, all_events: list[dict]) -> list[dict]:
    state = interval["state"]

    if is_same_timestamp_reopen_to_review_handoff(interval):
        return same_timestamp_handoff_segments(interval)

    if state == "Uploading":
        return [
            build_segment(
                interval,
                "USER_UPLOADING",
                interval["start_event"],
                interval["end_event"],
                actor_name=interval["enter_actor"],
                actor_type=interval["enter_actor_type"],
                is_active_work=True,
                is_idle=False,
            )
        ]

    if state == "Processing":
        return [
            build_segment(
                interval,
                "SYSTEM_INITIAL_PROCESSING",
                interval["start_event"],
                interval["end_event"],
                actor_name="System",
                actor_type="System",
                is_active_work=True,
                is_idle=False,
            )
        ]

    if state in PENDING_STATES:
        return pending_segments(interval, all_events)

    if state == IN_REVIEW_STATE:
        segments = in_review_segments(interval, all_events)
        if segments:
            return segments

    if state == COMPLETED_STATE:
        return completed_segments(interval)

    return [
        build_segment(
            interval,
            "UNKNOWN_OR_LOW_CONFIDENCE",
            interval["start_event"],
            interval["end_event"],
            actor_name=interval["enter_actor"],
            actor_type=interval["enter_actor_type"],
            is_active_work=False,
            is_idle=False,
        )
    ]
