from __future__ import annotations

def is_user_detail_event(event: dict) -> bool:
    return event["actor_type"] == "User" and not event["is_status_event"]

def previous_non_placeholder_user_actor(
    events: list[dict], event_index: int
) -> str | None:
    for idx in range(event_index - 1, -1, -1):
        candidate = events[idx]
        if candidate["actor_type"] != "User" or candidate["actor_name"] == "User0":
            continue
        return candidate["actor_name"]
    return None

def next_non_placeholder_user_detail_actor_before_next_status(
    events: list[dict], event_index: int
) -> set[str]:
    actors: set[str] = set()
    for idx in range(event_index + 1, len(events)):
        candidate = events[idx]
        if candidate["is_status_event"]:
            return actors
        if is_user_detail_event(candidate) and candidate["actor_name"] != "User0":
            actors.add(candidate["actor_name"])
    return actors
