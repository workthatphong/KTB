from __future__ import annotations

_USER_PERFORMANCE_CACHE_SIGNATURE: tuple[int, int, str] | None = None
_USER_PERFORMANCE_CACHE_VALUE: dict | None = None


def get_cached_user_performance(signature: tuple[int, int, str]) -> dict | None:
    if _USER_PERFORMANCE_CACHE_VALUE is None:
        return None
    if _USER_PERFORMANCE_CACHE_SIGNATURE != signature:
        return None
    return _USER_PERFORMANCE_CACHE_VALUE


def set_cached_user_performance(signature: tuple[int, int, str], value: dict) -> None:
    global _USER_PERFORMANCE_CACHE_SIGNATURE, _USER_PERFORMANCE_CACHE_VALUE
    _USER_PERFORMANCE_CACHE_SIGNATURE = signature
    _USER_PERFORMANCE_CACHE_VALUE = value


def clear_user_performance_cache() -> None:
    global _USER_PERFORMANCE_CACHE_SIGNATURE, _USER_PERFORMANCE_CACHE_VALUE
    _USER_PERFORMANCE_CACHE_SIGNATURE = None
    _USER_PERFORMANCE_CACHE_VALUE = None
