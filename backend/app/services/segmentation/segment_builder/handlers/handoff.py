from __future__ import annotations

from ..factory import build_segment

def same_timestamp_handoff_segments(interval: dict) -> list[dict]:
    actor_name = interval["exit_actor"] or interval["enter_actor"]
    actor_type = (
        interval["exit_actor_type"]
        if interval["exit_actor_type"] in {"System", "User"}
        else interval["enter_actor_type"]
    )
    return [
        build_segment(
            interval,
            "REOPEN_TO_REVIEW_HANDOFF_MARKER",
            interval["start_event"],
            interval["end_event"],
            actor_name=actor_name,
            actor_type=actor_type,
            is_active_work=False,
            is_idle=False,
            is_milestone=True,
            same_timestamp_handoff=True,
        )
    ]
