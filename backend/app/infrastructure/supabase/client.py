from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

_client_config: dict[str, Any] | None = None
_enabled_cache: bool | None = None
_last_error: str = ""


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


def _set_last_error(message: str) -> None:
    global _last_error
    _last_error = message.strip()


def _supabase_timeout_seconds() -> float:
    raw = os.getenv("SUPABASE_HTTP_TIMEOUT_SECONDS", "").strip()
    if not raw:
        return 12.0
    try:
        return max(1.0, float(raw))
    except ValueError:
        return 12.0


def _clear_last_error() -> None:
    global _last_error
    _last_error = ""


def _mark_sync_failure(message: str) -> None:
    _set_last_error(message or "Supabase sync failed")


def _is_missing_column_error(exc: Exception, column_name: str) -> bool:
    message = str(exc)
    return "42703" in message and f"column dashboard_meta_state.{column_name} does not exist" in message


def _build_supabase_config() -> dict[str, Any]:
    base_url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
    service_key = (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        or os.getenv("SUPABASE_KEY", "").strip()
    )
    schema = os.getenv("SUPABASE_SCHEMA", "public").strip() or "public"

    has_url = bool(base_url)
    has_service_key = bool(service_key)
    enabled = bool(has_url and has_service_key)
    configured = bool(has_url or has_service_key)

    reasons: list[str] = []
    if not has_url:
        reasons.append("Missing SUPABASE_URL")
    if not has_service_key:
        reasons.append("Missing SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY)")

    return {
        "configured": configured,
        "enabled": enabled,
        "base_url": base_url,
        "rest_url": f"{base_url}/rest/v1" if base_url else "",
        "service_key": service_key,
        "schema": schema,
        "reason": "; ".join(reasons),
    }


def is_supabase_enabled() -> bool:
    global _enabled_cache
    if _enabled_cache is not None:
        return _enabled_cache

    _enabled_cache = bool(_build_supabase_config()["enabled"])
    return _enabled_cache


def get_supabase_status(probe_client: bool = True) -> dict[str, Any]:
    config = _build_supabase_config()
    status = {
        "configured": bool(config["configured"]),
        "enabled": bool(config["enabled"]),
        "projectUrl": str(config["base_url"] or ""),
        "schema": str(config["schema"] or "public"),
        "clientReady": False,
        "error": "",
        "reason": str(config["reason"] or ""),
    }

    if not status["enabled"]:
        if status["configured"] and status["reason"]:
            status["error"] = status["reason"]
        return status

    if not probe_client:
        status["clientReady"] = _client_config is not None
        status["error"] = _last_error
        return status

    client = _get_client()
    status["clientReady"] = client is not None
    status["error"] = _last_error
    return status


def _get_client() -> dict[str, Any] | None:
    global _client_config
    if _client_config is not None:
        _clear_last_error()
        return _client_config

    config = _build_supabase_config()
    if not config["enabled"]:
        if config["configured"]:
            _set_last_error(str(config["reason"] or "Supabase is not enabled due to invalid configuration"))
        else:
            _clear_last_error()
        return None

    _client_config = {
        "rest_url": str(config["rest_url"]),
        "service_key": str(config["service_key"]),
        "schema": str(config["schema"]),
    }
    _clear_last_error()
    return _client_config


def _supabase_request(
    method: str,
    path: str,
    query: dict[str, str] | None = None,
    payload: Any | None = None,
    prefer: str | None = None,
) -> Any:
    client = _get_client()
    if client is None:
        raise RuntimeError(_last_error or "Supabase client is not ready")

    base_url = str(client["rest_url"]).rstrip("/")
    if query:
        encoded_query = urllib.parse.urlencode(query, doseq=True, safe=",.()*")
        url = f"{base_url}/{path}?{encoded_query}"
    else:
        url = f"{base_url}/{path}"

    data: bytes | None = None
    headers = {
        "Accept": "application/json",
        "apikey": str(client["service_key"]),
        "Authorization": f"Bearer {client['service_key']}",
        "Accept-Profile": str(client["schema"]),
        "Content-Profile": str(client["schema"]),
    }

    if prefer:
        headers["Prefer"] = prefer

    if payload is not None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json"

    request = urllib.request.Request(url, method=method, headers=headers, data=data)
    started_at = time.perf_counter()
    try:
        with urllib.request.urlopen(
            request,
            timeout=_supabase_timeout_seconds(),
        ) as response:
            raw = response.read()
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        message = f"Supabase {method} {path} failed ({exc.code}): {detail[:500]}"
        _set_last_error(message)
        raise RuntimeError(message) from exc
    except Exception as exc:
        message = f"Supabase {method} {path} failed: {type(exc).__name__}: {exc}"
        _set_last_error(message)
        raise RuntimeError(message) from exc
    finally:
        elapsed_ms = (time.perf_counter() - started_at) * 1000
        payload_rows = len(payload) if isinstance(payload, list) else (1 if payload is not None else 0)
        _emit_supabase_trace(
            f"request method={method} path={path} elapsed_ms={elapsed_ms:.1f} "
            f"query={query or {}} payload_rows={payload_rows}"
        )

    if not raw:
        _clear_last_error()
        return None

    try:
        result = json.loads(raw.decode("utf-8"))
    except Exception:
        _clear_last_error()
        return raw.decode("utf-8", errors="replace")

    _clear_last_error()
    return result


