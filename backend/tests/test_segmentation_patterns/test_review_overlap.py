from __future__ import annotations
import datetime as dt
import unittest
from backend.app.services.segmentation.segment_builder.document import build_segments_for_document
from .helpers import _event

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


