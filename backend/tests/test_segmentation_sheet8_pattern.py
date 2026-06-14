from __future__ import annotations

import datetime as dt
import unittest

from backend.app.services.segmentation.segment_builder.document import (
    build_segments_for_document,
)
from backend.app.services.segmentation.event_loader import (
    _is_disallowed_sheet_user,
    _resolve_sso_clapp_sheet_user,
)


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


class Sheet8PatternSegmentationTest(unittest.TestCase):
    def test_placeholder_pending_exit_does_not_split_single_edit_session(self) -> None:
        events = [
            _event(
                30,
                dt.datetime(2026, 4, 28, 3, 49, 28),
                "User5",
                "User",
                change_type="Spread Status",
                from_status="Completed",
                to_status="Pending Re-Review by Moodys",
            ),
            _event(
                29,
                dt.datetime(2026, 4, 28, 3, 49, 28),
                "User5",
                "User",
                change_type="Spread Status",
                from_status="Pending Re-Review by Moodys",
                to_status="In Review by Moodys",
            ),
            _event(
                28,
                dt.datetime(2026, 4, 28, 3, 51, 10),
                "User5",
                "User",
                change_type="Account Value",
                from_value="-70450000",
                to_value="-189000",
            ),
            _event(
                4,
                dt.datetime(2026, 4, 28, 4, 1, 4),
                "User0",
                "User",
                change_type="Spread Status",
                from_status="In Review by Moodys",
                to_status="Pending Re-Review by Moodys",
            ),
            _event(
                3,
                dt.datetime(2026, 4, 28, 4, 1, 5),
                "User5",
                "User",
                change_type="Account Value",
                from_value="75100000",
                to_value="-3838000",
            ),
            _event(
                2,
                dt.datetime(2026, 4, 28, 4, 1, 9),
                "User5",
                "User",
                change_type="Spread Status",
                from_status="Pending Re-Review by Moodys",
                to_status="Completed",
            ),
        ]

        segments = build_segments_for_document(events)
        user_segments = [
            segment
            for segment in segments
            if segment["segmentType"].startswith("USER_")
        ]

        self.assertEqual(len(user_segments), 1)
        self.assertEqual(
            user_segments[0]["segmentType"],
            "USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL",
        )
        self.assertEqual(user_segments[0]["start"], "2026-04-28T03:49:28")
        self.assertEqual(user_segments[0]["end"], "2026-04-28T04:01:09")
        self.assertFalse(
            any(segment["segmentType"] == "IDLE_WAITING_FOR_REREVIEW" for segment in segments)
        )


class Sheet19PatternSegmentationTest(unittest.TestCase):
    def test_missing_status_round_splits_into_edit_idle_edit_segments(self) -> None:
        events = [
            _event(
                49,
                dt.datetime(2026, 4, 24, 4, 21, 1),
                "User9",
                "User",
                change_type="Spread Status",
                from_status="Completed",
                to_status="Pending Re-Review by Moodys",
            ),
            _event(
                48,
                dt.datetime(2026, 4, 24, 4, 21, 2),
                "User9",
                "User",
                change_type="Spread Status",
                from_status="Pending Re-Review by Moodys",
                to_status="In Review by Moodys",
            ),
            _event(
                47,
                dt.datetime(2026, 4, 24, 4, 22, 7),
                "User9",
                "User",
                change_type="Account Value",
                from_value="11232356000",
                to_value="5683000",
            ),
            _event(
                33,
                dt.datetime(2026, 4, 24, 4, 32, 41),
                "User0",
                "User",
                change_type="Spread Status",
                from_status="In Review by Moodys",
                to_status="Pending Re-Review by Moodys",
            ),
            _event(
                32,
                dt.datetime(2026, 4, 24, 4, 35, 8),
                "User9",
                "User",
                change_type="Account Value",
                from_value="0",
                to_value="3100000",
            ),
            _event(
                31,
                dt.datetime(2026, 4, 24, 4, 35, 17),
                "User9",
                "User",
                change_type="Account Value",
                from_value="0",
                to_value="31000000",
            ),
            _event(
                30,
                dt.datetime(2026, 4, 24, 4, 35, 22),
                "User9",
                "User",
                change_type="Unmapped Account",
            ),
            _event(
                29,
                dt.datetime(2026, 4, 24, 4, 35, 28),
                "cognize user",
                "User",
                change_type="Unmapped Account",
            ),
            _event(
                26,
                dt.datetime(2026, 4, 24, 5, 4, 18),
                "cognize user",
                "User",
                change_type="Account Value",
                from_value="3100000",
                to_value="31000000",
            ),
            _event(
                25,
                dt.datetime(2026, 4, 24, 5, 22, 5),
                "cognize user",
                "User",
                change_type="Spread Status",
                from_status="Pending Re-Review by Moodys",
                to_status="In Review by Moodys",
            ),
            _event(
                24,
                dt.datetime(2026, 4, 24, 5, 26, 29),
                "cognize user",
                "User",
                change_type="Spread Status",
                from_status="In Review by Moodys",
                to_status="Completed",
            ),
        ]

        segments = build_segments_for_document(events)
        user_segments = [
            (segment["segmentType"], segment["userName"], segment["start"], segment["end"])
            for segment in segments
            if segment["segmentType"].startswith("USER_")
        ]

        self.assertEqual(user_segments[0], (
            "USER_EDITING_CORRECTION",
            "User9",
            "2026-04-24T04:21:02",
            "2026-04-24T04:32:41",
        ))
        self.assertEqual(user_segments[1], (
            "USER_EDITING_CORRECTION",
            "User9",
            "2026-04-24T04:35:07.999999",
            "2026-04-24T04:35:28",
        ))
        self.assertEqual(user_segments[2], (
            "USER_EDITING_CORRECTION",
            "cognize user",
            "2026-04-24T05:04:18",
            "2026-04-24T05:22:05",
        ))
        self.assertEqual(user_segments[3], (
            "USER_COMPLETION_APPROVAL",
            "cognize user",
            "2026-04-24T05:22:05",
            "2026-04-24T05:26:29",
        ))

        idle_segments = [
            (segment["segmentType"], segment["start"], segment["end"])
            for segment in segments
            if segment["segmentType"].startswith("IDLE_")
        ]
        self.assertIn(
            (
                "IDLE_WAITING_FOR_REREVIEW",
                "2026-04-24T04:35:28",
                "2026-04-24T05:04:18",
            ),
            idle_segments,
        )
        self.assertNotIn(
            (
                "IDLE_WAITING_FOR_REREVIEW",
                "2026-04-24T05:04:18.000001",
                "2026-04-24T05:22:05",
            ),
            idle_segments,
        )

    def test_explicit_in_review_interval_with_large_gap_is_not_split(self) -> None:
        events = [
            _event(
                4,
                dt.datetime(2026, 1, 1, 10, 0, 0),
                "User4",
                "User",
                change_type="Spread Status",
                from_status="Pending Re-Review by Moodys",
                to_status="In Review by Moodys",
            ),
            _event(
                3,
                dt.datetime(2026, 1, 1, 10, 2, 0),
                "User4",
                "User",
                change_type="Account Value",
                from_value="1",
                to_value="2",
            ),
            _event(
                2,
                dt.datetime(2026, 1, 1, 10, 30, 0),
                "User4",
                "User",
                change_type="Account Value",
                from_value="2",
                to_value="3",
            ),
            _event(
                1,
                dt.datetime(2026, 1, 1, 10, 35, 0),
                "User4",
                "User",
                change_type="Spread Status",
                from_status="In Review by Moodys",
                to_status="Pending Re-Review by Moodys",
            ),
        ]

        segments = build_segments_for_document(events)
        user_segments = [
            (segment["segmentType"], segment["userName"], segment["start"], segment["end"])
            for segment in segments
            if segment["segmentType"].startswith("USER_")
        ]

        self.assertEqual(user_segments, [
            (
                "USER_EDITING_CORRECTION",
                "User4",
                "2026-01-01T10:00:00",
                "2026-01-01T10:35:00",
            )
        ])


class Sheet20PatternSegmentationTest(unittest.TestCase):
    def test_review_boundary_is_preserved_before_edit_round(self) -> None:
        events = [
            _event(
                46,
                dt.datetime(2026, 4, 24, 3, 23, 22),
                "User9",
                "User",
                change_type="Spread Status",
                from_status="Pending Re-Review by Moodys",
                to_status="In Review by Moodys",
            ),
            _event(
                45,
                dt.datetime(2026, 4, 24, 3, 33, 8),
                "User0",
                "User",
                change_type="Spread Status",
                from_status="In Review by Moodys",
                to_status="Pending Re-Review by Moodys",
            ),
            _event(
                44,
                dt.datetime(2026, 4, 24, 3, 38, 22),
                "User9",
                "User",
                change_type="Account Value",
                from_value="0",
                to_value="44149472",
            ),
            _event(
                43,
                dt.datetime(2026, 4, 24, 3, 39, 27),
                "User9",
                "User",
                change_type="Account Value",
                from_value="44149472",
                to_value="16381836",
            ),
            _event(
                42,
                dt.datetime(2026, 4, 24, 3, 50, 16),
                "User9",
                "User",
                change_type="Account Value",
                from_value="0",
                to_value="-47778385",
            ),
            _event(
                41,
                dt.datetime(2026, 4, 24, 3, 54, 1),
                "sso clapp user",
                "User",
                change_type="Spread Status",
                from_status="Pending Re-Review by Moodys",
                to_status="Completed",
            ),
        ]

        segments = build_segments_for_document(events)
        user_segments = [
            (segment["segmentType"], segment["userName"], segment["start"], segment["end"])
            for segment in segments
            if segment["segmentType"].startswith("USER_")
        ]

        self.assertEqual(user_segments[0], (
            "USER_REVIEW_COMMENT_CHECK",
            "User9",
            "2026-04-24T03:23:22",
            "2026-04-24T03:33:08",
        ))
        self.assertEqual(user_segments[1], (
            "USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL",
            "User9",
            "2026-04-24T03:38:21.999999",
            "2026-04-24T03:54:01",
        ))


class ReviewActorOverlapSegmentationTest(unittest.TestCase):
    def test_creates_parallel_overlap_when_different_user_performs_all_detail_work(self) -> None:
        events = [
            _event(
                4,
                dt.datetime(2026, 4, 21, 12, 57, 42),
                "User1",
                "User",
                change_type="Spread Status",
                from_status="Pending Re-Review by Moodys",
                to_status="In Review by Moodys",
            ),
            _event(
                3,
                dt.datetime(2026, 4, 21, 13, 0, 14),
                "cognize user",
                "User",
                change_type="Income Statement",
                from_value="General & Admin Expense",
                to_value="",
            ),
            _event(
                2,
                dt.datetime(2026, 4, 21, 13, 1, 49),
                "cognize user",
                "User",
                change_type="Income Statement",
                from_value="3094",
                to_value="3094000",
            ),
            _event(
                1,
                dt.datetime(2026, 4, 21, 13, 6, 41),
                "cognize user",
                "User",
                change_type="Spread Status",
                from_status="In Review by Moodys",
                to_status="Pending Re-Review by Moodys",
            ),
        ]

        segments = build_segments_for_document(events)
        user_segments = [
            (segment["segmentType"], segment["userName"], segment["start"], segment["end"])
            for segment in segments
            if segment["segmentType"].startswith("USER_")
        ]

        self.assertEqual(user_segments, [
            (
                "USER_EDITING_CORRECTION",
                "cognize user",
                "2026-04-21T12:57:42",
                "2026-04-21T13:06:41",
            ),
            (
                "USER_REVIEW_COMMENT_CHECK",
                "User1",
                "2026-04-21T12:57:42",
                "2026-04-21T13:06:41",
            ),
        ])


class Sheet25PatternSegmentationTest(unittest.TestCase):
    def test_timeout_completion_and_same_timestamp_reopen_stay_as_review_sessions(self) -> None:
        events = [
            _event(
                7,
                dt.datetime(2026, 4, 28, 3, 38, 35),
                "User10",
                "User",
                change_type="Spread Status",
                from_status="Pending Re-Review by Moodys",
                to_status="In Review by Moodys",
            ),
            _event(
                6,
                dt.datetime(2026, 4, 28, 3, 38, 35),
                "sso clapp user",
                "User",
                change_type="Spread Status",
                from_status="Completed",
                to_status="Pending Re-Review by Moodys",
            ),
            _event(
                5,
                dt.datetime(2026, 4, 28, 4, 10, 0),
                "System",
                "System",
                change_type="Spread Status",
                from_status="In Review by Moodys",
                to_status="Pending Re-Review by Moodys",
            ),
            _event(
                4,
                dt.datetime(2026, 4, 28, 4, 13, 25),
                "sso clapp user",
                "User",
                change_type="Spread Status",
                from_status="Pending Re-Review by Moodys",
                to_status="Completed",
            ),
            _event(
                3,
                dt.datetime(2026, 4, 28, 4, 15, 16),
                "User10",
                "User",
                change_type="Spread Status",
                from_status="Pending Re-Review by Moodys",
                to_status="In Review by Moodys",
            ),
            _event(
                2,
                dt.datetime(2026, 4, 28, 4, 15, 16),
                "sso clapp user",
                "User",
                change_type="Spread Status",
                from_status="Completed",
                to_status="Pending Re-Review by Moodys",
            ),
            _event(
                1,
                dt.datetime(2026, 4, 28, 4, 15, 23),
                "User10",
                "User",
                change_type="Spread Status",
                from_status="In Review by Moodys",
                to_status="Completed",
            ),
        ]

        segments = build_segments_for_document(events)
        user_segments = [
            (segment["segmentType"], segment["userName"], segment["start"], segment["end"])
            for segment in segments
            if segment["segmentType"].startswith("USER_")
        ]

        self.assertEqual(user_segments, [
            (
                "USER_COMPLETION_APPROVAL",
                "User10",
                "2026-04-28T03:38:35",
                "2026-04-28T04:13:25",
            ),
            (
                "USER_COMPLETION_APPROVAL",
                "User10",
                "2026-04-28T04:15:16",
                "2026-04-28T04:15:23",
            ),
        ])
        self.assertFalse(
            any(segment["segmentType"] == "USER_REVIEW_AUTO_TIMEOUT" for segment in segments)
        )
        self.assertFalse(
            any(
                segment["segmentType"] == "IDLE_WAITING_FOR_REREVIEW"
                and segment["start"] in {"2026-04-28T04:10:00", "2026-04-28T04:15:16"}
                for segment in segments
            )
        )

    def test_timeout_completion_merge_does_not_apply_without_same_timestamp_reopen(self) -> None:
        events = [
            _event(
                3,
                dt.datetime(2026, 1, 1, 10, 0, 0),
                "UserA",
                "User",
                change_type="Spread Status",
                from_status="Pending Re-Review by Moodys",
                to_status="In Review by Moodys",
            ),
            _event(
                2,
                dt.datetime(2026, 1, 1, 10, 10, 0),
                "System",
                "System",
                change_type="Spread Status",
                from_status="In Review by Moodys",
                to_status="Pending Re-Review by Moodys",
            ),
            _event(
                1,
                dt.datetime(2026, 1, 1, 10, 12, 0),
                "sso clapp user",
                "User",
                change_type="Spread Status",
                from_status="Pending Re-Review by Moodys",
                to_status="Completed",
            ),
        ]

        segments = build_segments_for_document(events)
        segment_types = [segment["segmentType"] for segment in segments]

        self.assertEqual(segment_types, [
            "USER_REVIEW_AUTO_TIMEOUT",
            "AUTO_TIMEOUT_MARKER",
            "IDLE_WAITING_FOR_REREVIEW",
        ])


class SsoClappUserResolutionTest(unittest.TestCase):
    def test_cognize_user_is_excluded_from_sheet_user_candidates(self) -> None:
        self.assertTrue(_is_disallowed_sheet_user("cognize user"))
        self.assertTrue(
            _is_disallowed_sheet_user(
                "cognize user", allow_large_user_numbers=True
            )
        )

    def test_falls_back_to_smallest_numbered_user_when_no_user_10_or_less_exists(self) -> None:
        resolved_user = _resolve_sso_clapp_sheet_user(
            [],
            [
                (30, "Idle system"),
                (20, "cognize user"),
                (10, "User12"),
                (40, "User14"),
            ],
            25,
        )

        self.assertEqual(resolved_user, "User12")

    def test_prefers_nearest_primary_candidate_when_available(self) -> None:
        resolved_user = _resolve_sso_clapp_sheet_user(
            [(10, "User9"), (40, "User8")],
            [(5, "User12"), (20, "User14")],
            18,
        )

        self.assertEqual(resolved_user, "User9")


if __name__ == "__main__":
    unittest.main()
