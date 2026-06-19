from __future__ import annotations
import datetime as dt
import unittest
from backend.app.services.segmentation.segment_builder.document import build_segments_for_document
from .helpers import _event

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


