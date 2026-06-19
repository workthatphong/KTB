from __future__ import annotations
import unittest
from backend.app.services.segmentation.event_loader import _is_disallowed_sheet_user, _resolve_sso_clapp_sheet_user

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


