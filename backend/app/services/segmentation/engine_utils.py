from __future__ import annotations

import datetime as dt
import re

from ...config.constants.constants_workflow import (
    COMPLETED_STATUSES,
    IDLE_TIME_SEGMENT_TYPES,
    IN_REVIEW_STATUSES,
    PENDING_REREVIEW_STATUSES,
    PENDING_REVIEW_STATUSES,
    SYSTEM_TIME_SEGMENT_TYPES,
    USER_TIME_SEGMENT_TYPES,
)


def normalize_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (value or "").strip().lower())


def normalize_text(value: str | None) -> str:
    if value is None:
        return ""
    return re.sub(r"[^a-z0-9]+", "", str(value).lower())


def canonicalize_workflow_state(value: str | None) -> str:
    token = normalize_text(value)
    if not token:
        return ""
    if "upload" in token:
        return "Uploading"
    if "process" in token:
        return "Processing"
    if token in PENDING_REREVIEW_STATUSES or "pendingrereview" in token:
        return "Pending Re-Review by Moodys"
    if token in PENDING_REVIEW_STATUSES or "pendingreview" in token:
        return "Pending Review by Moodys"
    if token in IN_REVIEW_STATUSES or "inreview" in token:
        return "In Review by Moodys"
    if token in COMPLETED_STATUSES or "complete" in token:
        return "Completed"
    return str(value).strip() if value is not None else ""


def status_bucket(status: str | None) -> str:
    canonical = canonicalize_workflow_state(status)
    token = normalize_text(canonical)
    if token == normalize_text("Pending Re-Review by Moodys"):
        return "pending_rereview"
    if token == normalize_text("Pending Review by Moodys"):
        return "pending_review"
    if token == normalize_text("In Review by Moodys"):
        return "in_review"
    if token == normalize_text("Completed"):
        return "completed"
    if token == normalize_text("Uploading"):
        return "uploading"
    if token == normalize_text("Processing"):
        return "processing"
    return "other"


def looks_like_workflow_status(value: str | None) -> bool:
    return bool(canonicalize_workflow_state(value))


def normalize_workflow_status(value: str | None) -> str:
    return canonicalize_workflow_state(value)


def is_upload_status(value: str | None) -> bool:
    token = normalize_text(value)
    return bool(token) and "upload" in token


def infer_actor_type(actor_type: str | None, actor_name: str | None) -> str:
    joined = f"{actor_type or ''} {actor_name or ''}".lower()
    if "system" in joined or "ai " in joined or joined.startswith("ai"):
        return "System"
    if "user" in joined or "cognize" in joined or "moodys" in joined:
        return "User"
    if (actor_name or "").strip():
        # In most audit files, non-system named actors are human users.
        return "User"
    return "User"


def seconds_between(end_time: dt.datetime, start_time: dt.datetime) -> float:
    return max(0.0, (end_time - start_time).total_seconds())


def parse_bool(value) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    token = str(value).strip().lower()
    return token in {"1", "true", "yes", "y", "t", "on"}


def parse_int(value) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(float(str(value).strip()))
    except (TypeError, ValueError):
        return None


def excel_serial_to_datetime(serial: float) -> dt.datetime:
    epoch = dt.datetime(1899, 12, 30)
    return epoch + dt.timedelta(days=serial)


def parse_datetime(value) -> dt.datetime | None:
    if value is None or value == "":
        return None
    if isinstance(value, dt.datetime):
        return value
    if isinstance(value, dt.date):
        return dt.datetime.combine(value, dt.time())
    if isinstance(value, (int, float)):
        try:
            if 1.0 <= float(value) <= 100000.0:
                return excel_serial_to_datetime(float(value))
        except (ValueError, TypeError):
            pass

    text = str(value).strip()
    if not text:
        return None

    if text.replace(".", "", 1).isdigit():
        try:
            num = float(text)
            if 1.0 <= num <= 100000.0:
                return excel_serial_to_datetime(num)
        except (ValueError, TypeError):
            pass

    if text.endswith("Z"):
        text = text[:-1]
    text = text.replace("T", " ")

    datetime_formats = [
        "%m/%d/%Y %I:%M:%S %p",
        "%m/%d/%Y %I:%M %p",
        "%d/%m/%Y %I:%M:%S %p",
        "%d/%m/%Y %I:%M %p",
    ]

    result = None
    for fmt in datetime_formats:
        try:
            result = dt.datetime.strptime(text, fmt)
            break
        except ValueError:
            continue

    if result and result.year > 2400:
        try:
            result = result.replace(year=result.year - 543)
        except ValueError:
            pass

    return result


def build_canonical_map(row: dict) -> dict[str, object]:
    result: dict[str, object] = {}
    for key, value in row.items():
        result[normalize_key(str(key))] = value
    return result


def pick_field(
    row: dict, aliases: set[str], canonical: dict[str, object] | None = None
):
    canonical_row = canonical if canonical is not None else build_canonical_map(row)
    for alias in aliases:
        if alias in canonical_row:
            return canonical_row[alias]
    return None


def assign_time_group(
    segment_type: str,
    actor_type: str,
    is_milestone: bool = False,
    metric_only: bool = False,
    is_queue_wait: bool = False,
) -> tuple[str, str, str, bool]:
    if segment_type in SYSTEM_TIME_SEGMENT_TYPES:
        return (
            "System",
            "SYSTEM_SEGMENT_TYPE",
            "SYSTEM_ACTIVE_TIME",
            not (metric_only or is_milestone),
        )
    if segment_type in USER_TIME_SEGMENT_TYPES:
        return (
            "User",
            "USER_SEGMENT_TYPE",
            "USER_ACTIVE_TIME",
            not (metric_only or is_milestone),
        )
    if segment_type in IDLE_TIME_SEGMENT_TYPES:
        original_bucket = (
            "QUEUE_OR_SCHEDULED_WAIT_TIME" if is_queue_wait else "IDLE_WAITING_TIME"
        )
        return (
            "Idle Time",
            "IDLE_SEGMENT_TYPE",
            original_bucket,
            not (metric_only or is_milestone),
        )
    if segment_type in {"REOPEN_MARKER", "REOPEN_TO_REVIEW_HANDOFF_MARKER"}:
        group = "User" if actor_type == "User" else "System"
        return group, "REOPEN_OR_HANDOFF_MARKER_BY_ACTOR", "MILESTONE_OR_MARKER", False
    return (
        "Idle Time",
        "UNKNOWN_FALLBACK_TO_IDLE",
        "UNKNOWN_OR_LOW_CONFIDENCE",
        not (metric_only or is_milestone),
    )
