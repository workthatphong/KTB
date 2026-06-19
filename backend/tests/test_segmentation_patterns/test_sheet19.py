from __future__ import annotations
import datetime as dt
import unittest
from backend.app.services.segmentation.segment_builder.document import build_segments_for_document
from .helpers import _event

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


