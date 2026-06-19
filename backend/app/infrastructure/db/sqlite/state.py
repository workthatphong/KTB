from __future__ import annotations

class SyncState:
    SUPABASE_BOOTSTRAPPED = False
    SNAPSHOT_BOOTSTRAPPED = False
    REMOTE_META_SIGNATURE: tuple[str, int, int] | None = None
    LAST_REMOTE_META_CHECK_AT = 0.0

state = SyncState()
