from __future__ import annotations

from .....config.constants.constants_workflow import IN_REVIEW_STATE
from .helpers import (
    is_user_detail_event,
    previous_non_placeholder_user_actor,
    next_non_placeholder_user_detail_actor_before_next_status,
)

def _is_placeholder_pending_exit_noise(events: list[dict], event_index: int) -> bool:
    event = events[event_index]
    if not (
        event["is_status_event"]
        and event["actor_name"] == "User0"
        and event["from_status"] == IN_REVIEW_STATE
        and event["to_status"] == "Pending Re-Review by Moodys"
    ):
        return False

    previous_user_actor = previous_non_placeholder_user_actor(events, event_index)
    next_user_actors = next_non_placeholder_user_detail_actor_before_next_status(
        events, event_index
    )
    if previous_user_actor is None or not next_user_actors:
        return False
    if next_user_actors != {previous_user_actor}:
        return False

    for idx in range(event_index - 1, -1, -1):
        candidate = events[idx]
        if candidate["is_status_event"]:
            return any(
                is_user_detail_event(inner)
                for inner in events[idx + 1 : event_index]
            )

    return False

def remove_placeholder_pending_exit_noise(events: list[dict]) -> list[dict]:
    filtered: list[dict] = []
    for idx, event in enumerate(events):
        if _is_placeholder_pending_exit_noise(events, idx):
            continue
        filtered.append(event)
    return filtered
