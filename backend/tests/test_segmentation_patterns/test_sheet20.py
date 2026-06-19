from __future__ import annotations
import datetime as dt
import unittest
from backend.app.services.segmentation.segment_builder.document import build_segments_for_document
from .helpers import _event

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


