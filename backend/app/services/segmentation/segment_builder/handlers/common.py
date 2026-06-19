from __future__ import annotations

def completion_segment_type(
    user_edit_count: int,
    user_metadata_edit_count: int,
) -> str:
    if user_edit_count > 0:
        return "USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL"
    if user_metadata_edit_count > 0:
        return "USER_EDITING_METADATA_CORRECTION_AND_COMPLETION_APPROVAL"
    return "USER_COMPLETION_APPROVAL"
