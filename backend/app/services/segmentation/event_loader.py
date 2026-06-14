from __future__ import annotations

from bisect import bisect_left
import json

from ...config.constants.constants_parsing import FIELD_ALIASES
from ...infrastructure.db.sqlite_store import current_unified_rows_signature, get_conn
from .engine_utils import (
    build_canonical_map,
    canonicalize_workflow_state,
    infer_actor_type,
    normalize_text,
    parse_bool,
    parse_datetime,
    parse_int,
    pick_field,
)

_NORMALIZED_EVENTS_CACHE_SIGNATURE: tuple[int, int] | None = None
_NORMALIZED_EVENTS_CACHE_VALUE: tuple[list[dict], dict[str, int]] | None = None


def _is_sso_clapp_user(actor_name: str | None) -> bool:
    return normalize_text(actor_name) == "ssoclappuser"


def _parse_sheet_user_number(actor_name: str | None) -> int | None:
    token = normalize_text(actor_name)
    if token.startswith("user") and token[4:].isdigit():
        return int(token[4:])
    return None


def _is_disallowed_sheet_user(
    actor_name: str | None, *, allow_large_user_numbers: bool = False
) -> bool:
    normalized_name = str(actor_name or "").strip()
    if not normalized_name:
        return True

    token = normalize_text(normalized_name)
    if token in {
        "system",
        "idle",
        "unknownuser",
        "ssoclappuser",
        "user0",
        "cognizeuser",
    }:
        return True

    user_number = _parse_sheet_user_number(normalized_name)
    if user_number is not None:
        return user_number > 10 and not allow_large_user_numbers

    return False


def _find_nearest_sheet_user(
    sheet_candidates: list[tuple[int, str]], row_number: int
) -> str | None:
    if not sheet_candidates:
        return None

    candidate_row_numbers = [candidate_row for candidate_row, _ in sheet_candidates]
    insert_at = bisect_left(candidate_row_numbers, row_number)
    nearest_candidates: list[tuple[int, str]] = []

    if insert_at < len(sheet_candidates):
        nearest_candidates.append(sheet_candidates[insert_at])
    if insert_at > 0:
        nearest_candidates.append(sheet_candidates[insert_at - 1])

    if not nearest_candidates:
        return None

    nearest_row, nearest_user = min(
        nearest_candidates,
        key=lambda candidate: (abs(candidate[0] - row_number), candidate[0]),
    )
    return nearest_user if nearest_row >= 0 else None


def _find_smallest_sheet_user(sheet_candidates: list[tuple[int, str]]) -> str | None:
    numbered_candidates: list[tuple[int, int, str]] = []
    for candidate_row, candidate_user in sheet_candidates:
        user_number = _parse_sheet_user_number(candidate_user)
        if user_number is None:
            continue
        numbered_candidates.append((user_number, candidate_row, candidate_user))

    if not numbered_candidates:
        return None

    _, _, smallest_user = min(numbered_candidates, key=lambda candidate: candidate[:2])
    return smallest_user


def _resolve_sso_clapp_sheet_user(
    preferred_candidates: list[tuple[int, str]],
    fallback_candidates: list[tuple[int, str]],
    row_number: int,
) -> str | None:
    nearest_user = _find_nearest_sheet_user(preferred_candidates, row_number)
    if nearest_user:
        return nearest_user
    return _find_smallest_sheet_user(fallback_candidates)


def fetch_normalized_events(
    signature: tuple[int, int] | None = None,
) -> tuple[list[dict], dict[str, int]]:
    global _NORMALIZED_EVENTS_CACHE_SIGNATURE, _NORMALIZED_EVENTS_CACHE_VALUE
    cache_signature = signature or current_unified_rows_signature()
    if (
        _NORMALIZED_EVENTS_CACHE_VALUE is not None
        and _NORMALIZED_EVENTS_CACHE_SIGNATURE == cache_signature
    ):
        events_cache, invalid_counts_cache = _NORMALIZED_EVENTS_CACHE_VALUE
        return [event.copy() for event in events_cache], invalid_counts_cache.copy()

    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT source_id, file_name, page_name, row_number, data_json
            FROM unified_rows
            ORDER BY file_name ASC, page_name ASC, row_number DESC
            """
        ).fetchall()

    events: list[dict] = []
    invalid_counts: dict[str, int] = {}
    sheet_user_candidates: dict[str, list[tuple[int, str]]] = {}
    sheet_fallback_candidates: dict[str, list[tuple[int, str]]] = {}

    for db_row in rows:
        sheet_key = f"{db_row['file_name']}::{db_row['page_name']}"
        try:
            raw = json.loads(db_row["data_json"])
        except json.JSONDecodeError:
            raw = {}
        canonical = build_canonical_map(raw)

        event_time = parse_datetime(
            pick_field(raw, FIELD_ALIASES["event_time"], canonical)
        )
        if not event_time:
            invalid_counts[sheet_key] = invalid_counts.get(sheet_key, 0) + 1
            continue

        actor_name_raw = pick_field(raw, FIELD_ALIASES["actor_name"], canonical)
        actor_type_raw = pick_field(raw, FIELD_ALIASES["actor_type"], canonical)
        actor_name = str(actor_name_raw).strip() if actor_name_raw is not None else ""
        actor_type = infer_actor_type(
            str(actor_type_raw).strip() if actor_type_raw is not None else "",
            actor_name,
        )
        resolved_actor_name = actor_name or (
            "System" if actor_type == "System" else "Unknown User"
        )
        if not _is_disallowed_sheet_user(
            resolved_actor_name, allow_large_user_numbers=True
        ):
            sheet_fallback_candidates.setdefault(sheet_key, []).append(
                (int(db_row["row_number"]), resolved_actor_name)
            )
        if not _is_disallowed_sheet_user(resolved_actor_name):
            sheet_user_candidates.setdefault(sheet_key, []).append(
                (int(db_row["row_number"]), resolved_actor_name)
            )

        change_type_raw = pick_field(raw, FIELD_ALIASES["change_type"], canonical)
        if change_type_raw is None:
            change_type_raw = pick_field(raw, FIELD_ALIASES["action_type"], canonical)
        statement_type_raw = pick_field(raw, FIELD_ALIASES["statement_type"], canonical)
        changed_value_raw = pick_field(raw, FIELD_ALIASES["changed_value"], canonical)
        from_value_raw = pick_field(raw, FIELD_ALIASES["from_value"], canonical)
        to_value_raw = pick_field(raw, FIELD_ALIASES["to_value"], canonical)

        change_type = (
            str(change_type_raw).strip() if change_type_raw is not None else ""
        )
        statement_type = (
            str(statement_type_raw).strip() if statement_type_raw is not None else ""
        )
        changed_value_text = (
            str(changed_value_raw).strip() if changed_value_raw is not None else ""
        )
        from_status_text = (
            str(from_value_raw).strip() if from_value_raw is not None else ""
        )
        to_status_text = str(to_value_raw).strip() if to_value_raw is not None else ""

        is_status_event = (
            normalize_text(change_type) == "spreadstatus"
            and normalize_text(changed_value_text) == "status"
        )
        workflow_from_state = (
            canonicalize_workflow_state(from_status_text) if is_status_event else ""
        )
        workflow_to_state = (
            canonicalize_workflow_state(to_status_text) if is_status_event else ""
        )

        document_id_raw = pick_field(raw, FIELD_ALIASES["document_id"], canonical)
        document_id = (
            str(document_id_raw).strip()
            if document_id_raw is not None and str(document_id_raw).strip()
            else f"{db_row['file_name']}::{db_row['page_name']}"
        )

        events.append(
            {
                "event_id": f"{db_row['file_name']}::{db_row['page_name']}#{db_row['row_number']}",
                "source_id": db_row["source_id"],
                "file_name": db_row["file_name"],
                "page_name": db_row["page_name"],
                "row_number": int(db_row["row_number"]),
                "event_time": event_time,
                "actor_name": resolved_actor_name,
                "actor_type": actor_type,
                "document_id": document_id,
                "change_type": change_type,
                "statement_type": statement_type,
                "changed_value": changed_value_raw,
                "from_value": from_value_raw,
                "to_value": to_value_raw,
                "from_status": workflow_from_state,
                "to_status": workflow_to_state,
                "from_status_raw": from_status_text,
                "to_status_raw": to_status_text,
                "action_type": change_type,
                "submitted_for_reanalysis": parse_bool(
                    pick_field(raw, FIELD_ALIASES["submitted_for_reanalysis"], canonical)
                ),
                "auto_closed": parse_bool(
                    pick_field(raw, FIELD_ALIASES["auto_closed"], canonical)
                ),
                "timeout_minutes": parse_int(
                    pick_field(raw, FIELD_ALIASES["timeout_minutes"], canonical)
                ),
                "is_status_event": is_status_event,
                "is_detail_event": not is_status_event,
                "order_index": -1,
                "raw": raw,
            }
        )

    for sheet_key, candidates in sheet_user_candidates.items():
        candidates.sort(key=lambda candidate: candidate[0])
    for sheet_key, candidates in sheet_fallback_candidates.items():
        candidates.sort(key=lambda candidate: candidate[0])

    for event in events:
        if not _is_sso_clapp_user(event.get("actor_name")):
            continue
        sheet_key = f"{event['file_name']}::{event['page_name']}"
        resolved_user = _resolve_sso_clapp_sheet_user(
            sheet_user_candidates.get(sheet_key, []),
            sheet_fallback_candidates.get(sheet_key, []),
            int(event["row_number"]),
        )
        if resolved_user:
            event["actor_name"] = resolved_user

    _NORMALIZED_EVENTS_CACHE_SIGNATURE = cache_signature
    _NORMALIZED_EVENTS_CACHE_VALUE = (events, invalid_counts)
    return [event.copy() for event in events], invalid_counts.copy()


def clear_normalized_events_cache() -> None:
    global _NORMALIZED_EVENTS_CACHE_SIGNATURE, _NORMALIZED_EVENTS_CACHE_VALUE
    _NORMALIZED_EVENTS_CACHE_SIGNATURE = None
    _NORMALIZED_EVENTS_CACHE_VALUE = None
