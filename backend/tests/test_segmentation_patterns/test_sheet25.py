from __future__ import annotations
import datetime as dt
import unittest
from backend.app.services.segmentation.segment_builder.document import build_segments_for_document
from .helpers import _event

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


