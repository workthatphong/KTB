import os
import re

base_dir = '/workspaces/KTB/backend/app/services/segmentation/segment_builder'
handlers_dir = os.path.join(base_dir, 'handlers')
os.makedirs(handlers_dir, exist_ok=True)

with open(os.path.join(handlers_dir, '__init__.py'), 'w') as f:
    f.write("")

# handlers/common.py
with open(os.path.join(handlers_dir, 'common.py'), 'w') as f:
    f.write('''from __future__ import annotations

def completion_segment_type(
    user_edit_count: int,
    user_metadata_edit_count: int,
) -> str:
    if user_edit_count > 0:
        return "USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL"
    if user_metadata_edit_count > 0:
        return "USER_EDITING_METADATA_CORRECTION_AND_COMPLETION_APPROVAL"
    return "USER_COMPLETION_APPROVAL"
''')

# handlers/handoff.py
with open(os.path.join(handlers_dir, 'handoff.py'), 'w') as f:
    f.write('''from __future__ import annotations

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
''')

# handlers/pending.py
with open(os.path.join(handlers_dir, 'pending.py'), 'w') as f:
    f.write('''from __future__ import annotations

from .....config.constants.constants_workflow import (
    COMPLETED_STATE,
    IN_REVIEW_STATE,
    PENDING_STATES,
)
from ..factory import build_segment
from ..helpers import (
    find_system_reprocess_cycle_end,
    first_system_evidence,
    has_same_timestamp_reopen_handoff,
    previous_in_review_entry_event,
    previous_status_event_before,
)

def _system_reprocess_start_event(
    interval: dict, all_events: list[dict], first_system: dict
) -> dict:
    if not (
        interval["enter_actor_type"] == "User"
        and interval["enter_from"] == IN_REVIEW_STATE
        and interval["enter_to"] in PENDING_STATES
        and interval["exit_actor_type"] == "System"
        and interval["exit_from"] == IN_REVIEW_STATE
        and interval["exit_to"] == COMPLETED_STATE
    ):
        return first_system

    previous_review_entry = previous_in_review_entry_event(
        all_events,
        interval["start_event"]["order_index"],
    )
    return previous_review_entry or first_system

def pending_segments(interval: dict, all_events: list[dict]) -> list[dict]:
    previous_status = previous_status_event_before(
        all_events,
        interval["start_event"]["order_index"],
    )
    if (
        interval["enter_actor_type"] == "System"
        and interval["enter_from"] == IN_REVIEW_STATE
        and interval["exit_to"] == COMPLETED_STATE
        and not interval["inner_events"]
        and previous_status is not None
        and has_same_timestamp_reopen_handoff(all_events, previous_status)
    ):
        return []

    first_system = first_system_evidence(
        [*interval["inner_events"], interval["end_event"]]
    )
    if first_system is not None:
        segments: list[dict] = []
        cycle_end = find_system_reprocess_cycle_end(first_system, all_events)
        system_start = _system_reprocess_start_event(
            interval,
            all_events,
            first_system,
        )

        if system_start["event_time"] > interval["start_time"]:
            segments.append(
                build_segment(
                    interval,
                    "IDLE_WAITING_FOR_SCHEDULED_REPROCESS",
                    interval["start_event"],
                    system_start,
                    actor_name=None,
                    actor_type="None",
                    is_active_work=False,
                    is_idle=True,
                    is_queue_wait=True,
                )
            )

        segments.append(
            build_segment(
                interval,
                "SYSTEM_SCHEDULED_REPROCESSING",
                system_start,
                cycle_end,
                actor_name="System",
                actor_type="System",
                is_active_work=True,
                is_idle=False,
            )
        )

        if (
            cycle_end["event_time"] < interval["end_time"]
            and interval["exit_actor_type"] == "User"
            and interval["exit_to"] == IN_REVIEW_STATE
        ):
            segments.append(
                build_segment(
                    interval,
                    "IDLE_AFTER_SYSTEM_REPROCESS",
                    cycle_end,
                    interval["end_event"],
                    actor_name=None,
                    actor_type="None",
                    is_active_work=False,
                    is_idle=True,
                )
            )
        return segments

    idle_segment_type = (
        "IDLE_WAITING_FOR_REVIEW"
        if interval["state"] == "Pending Review by Moodys"
        else "IDLE_WAITING_FOR_REREVIEW"
    )
    return [
        build_segment(
            interval,
            idle_segment_type,
            interval["start_event"],
            interval["end_event"],
            actor_name=None,
            actor_type="None",
            is_active_work=False,
            is_idle=True,
        )
    ]
''')

# handlers/synthetic.py
with open(os.path.join(handlers_dir, 'synthetic.py'), 'w') as f:
    f.write('''from __future__ import annotations

from .....config.constants.constants_workflow import (
    ACTIVITY_GRACE_MINUTES_DEFAULT,
    SESSION_TIMEOUT_MINUTES_DEFAULT,
    USER_EDIT_CHANGE_TYPES,
    USER_METADATA_EDIT_CHANGE_TYPES,
)
from ...engine_utils import seconds_between
from ..factory import build_segment
from ..helpers import (
    is_system_evidence,
    next_status_event_after,
)

def _edit_burst_segment_type(edit_count: int, metadata_edit_count: int) -> str:
    if edit_count > 0:
        return "USER_EDITING_CORRECTION"
    if metadata_edit_count > 0:
        return "USER_EDITING_METADATA_CORRECTION"
    return ""

def _synthetic_edit_split_gap_seconds() -> float:
    return max(
        float(ACTIVITY_GRACE_MINUTES_DEFAULT * 60),
        float((SESSION_TIMEOUT_MINUTES_DEFAULT - ACTIVITY_GRACE_MINUTES_DEFAULT) * 60),
    )

def _pending_idle_segment_type_for_synthetic_split(interval: dict) -> str:
    pending_state = (
        interval["start_event"].get("from_status")
        or interval["end_event"].get("to_status")
        or ""
    )
    if pending_state == "Pending Review by Moodys":
        return "IDLE_WAITING_FOR_REVIEW"
    return "IDLE_WAITING_FOR_REREVIEW"

def _resolve_synthetic_split_burst_end_event(
    interval: dict,
    all_events: list[dict],
    burst_index: int,
    burst_count: int,
    burst: list[dict],
) -> dict:
    if burst_index != burst_count - 1:
        return burst[-1]

    if not interval["end_event"].get("synthetic_status_event"):
        return interval["end_event"]

    next_status = next_status_event_after(
        all_events,
        interval["end_event"]["order_index"],
    )
    if next_status is None:
        return interval["end_event"]
    if next_status["from_status"] != interval["end_event"]["to_status"]:
        return interval["end_event"]
    if next_status["actor_type"] != "User":
        return interval["end_event"]

    return next_status

def split_synthetic_edit_burst_segments(
    interval: dict,
    all_events: list[dict],
) -> list[dict]:
    if not (
        interval["start_event"].get("synthetic_status_event")
        or interval["end_event"].get("synthetic_status_event")
    ):
        return []

    if any(is_system_evidence(event) for event in interval["inner_events"]):
        return []

    user_detail_events = [
        event
        for event in interval["inner_events"]
        if event["actor_type"] == "User"
        and not event["is_status_event"]
        and event["actor_name"] != "User0"
    ]
    if len(user_detail_events) < 2:
        return []

    gap_threshold_seconds = _synthetic_edit_split_gap_seconds()
    bursts: list[list[dict]] = [[user_detail_events[0]]]
    for event in user_detail_events[1:]:
        previous_event = bursts[-1][-1]
        gap_seconds = seconds_between(event["event_time"], previous_event["event_time"])
        if gap_seconds > gap_threshold_seconds:
            bursts.append([event])
            continue
        bursts[-1].append(event)

    if len(bursts) < 2:
        return []

    segments: list[dict] = []
    idle_segment_type = _pending_idle_segment_type_for_synthetic_split(interval)
    for burst_index, burst in enumerate(bursts):
        edit_count = len(
            [
                event
                for event in burst
                if event["change_type"] in USER_EDIT_CHANGE_TYPES
            ]
        )
        metadata_edit_count = len(
            [
                event
                for event in burst
                if event["change_type"] in USER_METADATA_EDIT_CHANGE_TYPES
            ]
        )
        segment_type = _edit_burst_segment_type(edit_count, metadata_edit_count)
        if not segment_type:
            return []

        start_event = interval["start_event"] if burst_index == 0 else burst[0]
        end_event = _resolve_synthetic_split_burst_end_event(
            interval,
            all_events,
            burst_index,
            len(bursts),
            burst,
        )
        actor_name = burst[0]["actor_name"]
        segments.append(
            build_segment(
                interval,
                segment_type,
                start_event,
                end_event,
                actor_name=actor_name,
                actor_type="User",
                is_active_work=True,
                is_idle=False,
            )
        )

        if burst_index == len(bursts) - 1:
            continue

        idle_start_event = burst[-1]
        idle_end_event = bursts[burst_index + 1][0]
        if idle_start_event["event_time"] >= idle_end_event["event_time"]:
            continue
        segments.append(
            build_segment(
                interval,
                idle_segment_type,
                idle_start_event,
                idle_end_event,
                actor_name=None,
                actor_type="None",
                is_active_work=False,
                is_idle=True,
            )
        )

    return segments
''')

# handlers/overlap.py
with open(os.path.join(handlers_dir, 'overlap.py'), 'w') as f:
    f.write('''from __future__ import annotations

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
''')

# handlers/in_review.py
with open(os.path.join(handlers_dir, 'in_review.py'), 'w') as f:
    f.write('''from __future__ import annotations

from .....config.constants.constants_workflow import (
    COMPLETED_STATE,
    PENDING_STATES,
    USER_EDIT_CHANGE_TYPES,
    USER_METADATA_EDIT_CHANGE_TYPES,
)
from ..factory import build_segment
from ..helpers import (
    first_system_evidence,
    has_same_timestamp_reopen_handoff,
    next_status_event_after,
)
from .common import completion_segment_type
from .overlap import overlap_review_actor_segments
from .synthetic import split_synthetic_edit_burst_segments

def _timeout_completion_event(interval: dict, all_events: list[dict]) -> dict | None:
    if not has_same_timestamp_reopen_handoff(all_events, interval["start_event"]):
        return None

    next_status = next_status_event_after(
        all_events,
        interval["end_event"]["order_index"],
    )
    if next_status is None:
        return None
    if (
        next_status["from_status"] != interval["exit_to"]
        or next_status["to_status"] != COMPLETED_STATE
    ):
        return None

    between_events = [
        event
        for event in all_events
        if interval["end_event"]["order_index"] < event["order_index"] < next_status["order_index"]
    ]
    if between_events:
        return None
    return next_status

def in_review_segments(interval: dict, all_events: list[dict]) -> list[dict]:
    overlap_segments = overlap_review_actor_segments(interval)
    if overlap_segments:
        return overlap_segments

    synthetic_burst_segments = split_synthetic_edit_burst_segments(interval, all_events)
    if synthetic_burst_segments:
        return synthetic_burst_segments

    user_edit_count = len(
        [
            event
            for event in interval["inner_events"]
            if event["actor_type"] == "User"
            and event["change_type"] in USER_EDIT_CHANGE_TYPES
        ]
    )
    user_metadata_edit_count = len(
        [
            event
            for event in interval["inner_events"]
            if event["actor_type"] == "User"
            and event["change_type"] in USER_METADATA_EDIT_CHANGE_TYPES
        ]
    )

    if (
        interval["enter_actor_type"] == "User"
        and interval["exit_to"] != COMPLETED_STATE
        and user_edit_count > 0
    ):
        return [
            build_segment(
                interval,
                "USER_EDITING_CORRECTION",
                interval["start_event"],
                interval["end_event"],
                actor_name=interval["enter_actor"],
                actor_type="User",
                is_active_work=True,
                is_idle=False,
            )
        ]

    if (
        interval["enter_actor_type"] == "User"
        and interval["exit_to"] != COMPLETED_STATE
        and user_metadata_edit_count > 0
    ):
        return [
            build_segment(
                interval,
                "USER_EDITING_METADATA_CORRECTION",
                interval["start_event"],
                interval["end_event"],
                actor_name=interval["enter_actor"],
                actor_type="User",
                is_active_work=True,
                is_idle=False,
            )
        ]

    if (
        interval["enter_actor_type"] == "User"
        and interval["exit_actor_type"] == "System"
        and interval["exit_to"] in PENDING_STATES
    ):
        timeout_completion_event = _timeout_completion_event(interval, all_events)
        if timeout_completion_event is not None:
            return [
                build_segment(
                    interval,
                    completion_segment_type(
                        user_edit_count,
                        user_metadata_edit_count,
                    ),
                    interval["start_event"],
                    timeout_completion_event,
                    actor_name=interval["enter_actor"],
                    actor_type="User",
                    is_active_work=True,
                    is_idle=False,
                )
            ]
        return [
            build_segment(
                interval,
                "USER_REVIEW_AUTO_TIMEOUT",
                interval["start_event"],
                interval["end_event"],
                actor_name=interval["enter_actor"],
                actor_type="User",
                is_active_work=True,
                is_idle=False,
                is_auto_timeout=True,
            ),
            build_segment(
                interval,
                "AUTO_TIMEOUT_MARKER",
                interval["end_event"],
                interval["end_event"],
                actor_name="System",
                actor_type="System",
                is_active_work=False,
                is_idle=False,
                is_milestone=True,
                is_auto_timeout=True,
            ),
        ]

    if (
        interval["enter_actor_type"] == "User"
        and interval["exit_to"] == COMPLETED_STATE
        and user_edit_count > 0
    ):
        return [
            build_segment(
                interval,
                "USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL",
                interval["start_event"],
                interval["end_event"],
                actor_name=interval["enter_actor"],
                actor_type="User",
                is_active_work=True,
                is_idle=False,
            )
        ]

    if (
        interval["enter_actor_type"] == "User"
        and interval["exit_to"] == COMPLETED_STATE
        and user_metadata_edit_count > 0
    ):
        return [
            build_segment(
                interval,
                "USER_EDITING_METADATA_CORRECTION_AND_COMPLETION_APPROVAL",
                interval["start_event"],
                interval["end_event"],
                actor_name=interval["enter_actor"],
                actor_type="User",
                is_active_work=True,
                is_idle=False,
            )
        ]

    if (
        interval["enter_actor_type"] == "User"
        and interval["exit_to"] == COMPLETED_STATE
        and user_edit_count == 0
        and interval["exit_actor_type"] == "System"
    ):
        first_system = first_system_evidence(
            [*interval["inner_events"], interval["end_event"]]
        )
        if first_system is not None:
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
                    "SYSTEM_SCHEDULED_REPROCESSING",
                    interval["start_event"],
                    interval["end_event"],
                    actor_name="System",
                    actor_type="System",
                    is_active_work=True,
                    is_idle=False,
                ),
            ]

    if (
        interval["enter_actor_type"] == "User"
        and interval["exit_to"] == COMPLETED_STATE
        and user_edit_count == 0
    ):
        return [
            build_segment(
                interval,
                "USER_COMPLETION_APPROVAL",
                interval["start_event"],
                interval["end_event"],
                actor_name=interval["enter_actor"],
                actor_type="User",
                is_active_work=True,
                is_idle=False,
            )
        ]

    if (
        interval["enter_actor_type"] == "User"
        and interval["exit_to"] != COMPLETED_STATE
        and not (
            interval["exit_actor_type"] == "System"
            and interval["exit_to"] in PENDING_STATES
        )
        and user_edit_count == 0
    ):
        segments = [
            build_segment(
                interval,
                "USER_REVIEW_COMMENT_CHECK",
                interval["start_event"],
                interval["end_event"],
                actor_name=interval["enter_actor"],
                actor_type="User",
                is_active_work=True,
                is_idle=False,
            )
        ]

        first_system = first_system_evidence(interval["inner_events"])
        if first_system is not None and first_system["event_time"] < interval["end_time"]:
            segments.append(
                build_segment(
                    interval,
                    "SYSTEM_INTERNAL_TRANSITION",
                    first_system,
                    interval["end_event"],
                    actor_name="System",
                    actor_type="System",
                    is_active_work=True,
                    is_idle=False,
                )
            )
        return segments

    if interval["enter_actor_type"] == "System":
        return [
            build_segment(
                interval,
                "SYSTEM_INTERNAL_TRANSITION",
                interval["start_event"],
                interval["end_event"],
                actor_name="System",
                actor_type="System",
                is_active_work=True,
                is_idle=False,
            )
        ]

    return []
''')

# handlers/completed.py
with open(os.path.join(handlers_dir, 'completed.py'), 'w') as f:
    f.write('''from __future__ import annotations

from .....config.constants.constants_workflow import COMPLETED_STATE
from ..factory import build_segment
from ..helpers import is_system_evidence

def _completed_system_evidence_events(interval: dict) -> list[dict]:
    candidates = [
        event for event in interval["inner_events"] if is_system_evidence(event)
    ]
    if is_system_evidence(interval["end_event"]):
        candidates.append(interval["end_event"])
    return sorted(candidates, key=lambda event: event["order_index"])

def _completed_idle_segment(
    interval: dict, start_event: dict, end_event: dict
) -> dict | None:
    if start_event["event_time"] >= end_event["event_time"]:
        return None
    return build_segment(
        interval,
        "POST_COMPLETED_ELAPSED",
        start_event,
        end_event,
        actor_name=None,
        actor_type="None",
        is_active_work=False,
        is_idle=True,
    )

def completed_segments(interval: dict) -> list[dict]:
    segments = []
    system_events = _completed_system_evidence_events(interval)

    if system_events:
        system_start = interval["start_event"]
        system_end = system_events[-1]

        segments.append(
            build_segment(
                interval,
                "SYSTEM_SCHEDULED_REPROCESSING",
                system_start,
                system_end,
                actor_name="System",
                actor_type="System",
                is_active_work=True,
                is_idle=False,
            )
        )

        after_system = _completed_idle_segment(
            interval, system_end, interval["end_event"]
        )
        if after_system is not None:
            segments.append(after_system)
    else:
        idle_segment = _completed_idle_segment(
            interval, interval["start_event"], interval["end_event"]
        )
        if idle_segment is not None:
            segments.append(idle_segment)

    if (
        interval["exit_from"] == COMPLETED_STATE
        and interval["exit_to"] == "Pending Re-Review by Moodys"
    ):
        segments.append(
            build_segment(
                interval,
                "REOPEN_MARKER",
                interval["end_event"],
                interval["end_event"],
                actor_name=interval["exit_actor"],
                actor_type=interval["exit_actor_type"],
                is_active_work=False,
                is_idle=False,
                is_milestone=True,
            )
        )
    return segments
''')

# Now rewrite intervals.py
with open(os.path.join(base_dir, 'intervals.py'), 'w') as f:
    f.write('''from __future__ import annotations

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
''')

print("Backend refactor complete.")
