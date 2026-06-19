from __future__ import annotations
import os

def _supabase_trace_enabled() -> bool:
    return os.getenv("SUPABASE_TRACE_TIMING", "").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def _emit_supabase_trace(message: str) -> None:
    if _supabase_trace_enabled():
        print(f"[SupabaseTrace] {message}")


def _supabase_refresh_interval_seconds() -> float:
    raw = os.getenv("SUPABASE_REFRESH_INTERVAL_SECONDS", "").strip()
    if not raw:
        return 60.0
    try:
        return max(0.0, float(raw))
    except ValueError:
        return 60.0


