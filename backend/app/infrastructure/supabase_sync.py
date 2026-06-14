from __future__ import annotations

import json
import os
import sqlite3
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from ..config.constants.constants_runtime import ALGORITHM_VERSION

_TABLES = {
    "source_files": "source_files",
    "source_pages": "source_pages",
    "unified_rows": "unified_rows",
    "connected_sheets": "connected_sheets",
}

_TABLE_DELETE_FILTERS = {
    "source_files": ("source_id", "not.is.null"),
    "source_pages": ("source_id", "not.is.null"),
    "unified_rows": ("row_id", "not.is.null"),
    "connected_sheets": ("connection_id", "not.is.null"),
}

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


def _fetch_table_rows(
    conn: sqlite3.Connection, table_name: str, order_by: str | None = None
) -> list[dict[str, Any]]:
    query = f"SELECT * FROM {table_name}"
    if order_by:
        query = f"{query} ORDER BY {order_by}"
    rows = conn.execute(query).fetchall()
    return [dict(row) for row in rows]


def _chunk(items: list[dict[str, Any]], chunk_size: int = 300):
    for idx in range(0, len(items), chunk_size):
        yield items[idx : idx + chunk_size]


def _fetch_all_rows(table_name: str, order: str | None = None) -> list[dict[str, Any]]:
    started_at = time.perf_counter()
    page_size = 1000
    offset = 0
    rows: list[dict[str, Any]] = []
    page_count = 0

    while True:
        query = {
            "select": "*",
            "limit": str(page_size),
            "offset": str(offset),
        }
        if order:
            query["order"] = order
        page = _supabase_request("GET", table_name, query=query) or []
        page_count += 1
        if not isinstance(page, list):
            raise RuntimeError(f"Unexpected Supabase response for table '{table_name}'")
        if not page:
            break
        rows.extend(page)
        _emit_supabase_trace(
            f"fetch_page table={table_name} page={page_count} offset={offset} rows={len(page)} total_rows={len(rows)}"
        )
        if len(page) < page_size:
            break
        offset += len(page)

    elapsed_ms = (time.perf_counter() - started_at) * 1000
    _emit_supabase_trace(
        f"fetch_table_done table={table_name} total_rows={len(rows)} pages={page_count} elapsed_ms={elapsed_ms:.1f}"
    )
    return rows


def fetch_dashboard_meta_state() -> dict[str, Any] | None:
    client = _get_client()
    if client is None:
        return None

    started_at = time.perf_counter()
    try:
        rows = _supabase_request(
            "GET",
            "dashboard_meta_state",
            query={
                "select": "updated_at,row_count,source_count",
                "id": "eq.state",
                "limit": "1",
            },
        )
    except Exception as exc:
        _set_last_error(f"{type(exc).__name__}: {exc}")
        raise
    finally:
        _emit_supabase_trace(
            f"fetch_dashboard_meta_state elapsed_ms={(time.perf_counter() - started_at) * 1000:.1f}"
        )

    if not rows:
        return None

    payload = rows[0] if isinstance(rows, list) else {}
    return {
        "updated_at": str(payload.get("updated_at") or ""),
        "row_count": int(payload.get("row_count") or 0),
        "source_count": int(payload.get("source_count") or 0),
    }


def fetch_dashboard_snapshot_state() -> dict[str, Any] | None:
    client = _get_client()
    if client is None:
        return None

    started_at = time.perf_counter()
    try:
        try:
            rows = _supabase_request(
                "GET",
                "dashboard_meta_state",
                query={
                    "select": "updated_at,row_count,source_count,algorithm_version,payload_json",
                    "id": "eq.state",
                    "limit": "1",
                },
            )
        except Exception as exc:
            if not _is_missing_column_error(exc, "algorithm_version"):
                raise
            rows = _supabase_request(
                "GET",
                "dashboard_meta_state",
                query={
                    "select": "updated_at,row_count,source_count,payload_json",
                    "id": "eq.state",
                    "limit": "1",
                },
            )
    except Exception as exc:
        _set_last_error(f"{type(exc).__name__}: {exc}")
        raise
    finally:
        _emit_supabase_trace(
            f"fetch_dashboard_snapshot_state elapsed_ms={(time.perf_counter() - started_at) * 1000:.1f}"
        )

    if not rows:
        return None

    payload = rows[0] if isinstance(rows, list) else {}
    raw_snapshot = payload.get("payload_json")
    snapshot_payload: dict[str, Any] | None = None

    if isinstance(raw_snapshot, dict):
        snapshot_payload = raw_snapshot
    elif isinstance(raw_snapshot, str) and raw_snapshot.strip():
        try:
            decoded = json.loads(raw_snapshot)
            if isinstance(decoded, dict):
                snapshot_payload = decoded
        except json.JSONDecodeError:
            snapshot_payload = None

    return {
        "updated_at": str(payload.get("updated_at") or ""),
        "row_count": int(payload.get("row_count") or 0),
        "source_count": int(payload.get("source_count") or 0),
        "algorithm_version": str(payload.get("algorithm_version") or ""),
        "payload": snapshot_payload,
    }


def sync_dashboard_snapshot_to_supabase(snapshot_payload: dict[str, Any]) -> bool:
    client = _get_client()
    if client is None:
        error_message = _last_error or "Supabase client is not ready"
        _mark_sync_failure(error_message)
        return False

    snapshot_meta = snapshot_payload.get("snapshotMeta") or {}
    try:
        _supabase_request(
            "POST",
            "dashboard_meta_state",
            payload=[
                {
                    "id": "state",
                    "updated_at": str(
                        snapshot_meta.get("updatedAt")
                        or datetime.now(timezone.utc).isoformat()
                    ),
                    "row_count": int(snapshot_meta.get("rowCount") or 0),
                    "source_count": int(snapshot_meta.get("sourceCount") or 0),
                    "algorithm_version": str(
                        snapshot_meta.get("algorithmVersion") or ALGORITHM_VERSION
                    ),
                    "payload_json": json.dumps(snapshot_payload, ensure_ascii=False),
                }
            ],
            prefer="resolution=merge-duplicates,return=minimal",
        )
    except Exception as exc:
        _set_last_error(f"{type(exc).__name__}: {exc}")
        raise

    _clear_last_error()
    return True


def sync_sqlite_to_supabase(db_path: Path) -> bool:
    client = _get_client()
    if client is None:
        error_message = _last_error or "Supabase client is not ready"
        _mark_sync_failure(error_message)
        return False

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        tables = {
            "source_files": _fetch_table_rows(conn, "source_files", "uploaded_at DESC"),
            "source_pages": _fetch_table_rows(conn, "source_pages"),
            "unified_rows": _fetch_table_rows(conn, "unified_rows", "row_id ASC"),
            "connected_sheets": _fetch_table_rows(
                conn, "connected_sheets", "connected_at DESC"
            ),
        }
    finally:
        conn.close()

    try:
        for table_name, remote_table in _TABLES.items():
            filter_name, filter_value = _TABLE_DELETE_FILTERS[table_name]
            _supabase_request(
                "DELETE",
                remote_table,
                query={filter_name: filter_value},
                prefer="return=minimal",
            )

            rows = tables[table_name]
            for row_batch in _chunk(rows, chunk_size=300):
                _supabase_request(
                    "POST",
                    remote_table,
                    payload=row_batch,
                    prefer="resolution=merge-duplicates,return=minimal",
                )

        _supabase_request(
            "POST",
            "dashboard_meta_state",
            payload=[
                {
                    "id": "state",
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "row_count": len(tables["unified_rows"]),
                    "source_count": len(tables["source_files"]),
                }
            ],
            prefer="resolution=merge-duplicates,return=minimal",
        )
    except Exception as exc:
        _set_last_error(f"{type(exc).__name__}: {exc}")
        raise

    _clear_last_error()
    return True


def _upsert_rows(table_name: str, rows: list[dict[str, Any]], chunk_size: int = 300) -> None:
    if not rows:
        return
    for row_batch in _chunk(rows, chunk_size=chunk_size):
        _supabase_request(
            "POST",
            table_name,
            payload=row_batch,
            prefer="resolution=merge-duplicates,return=minimal",
        )


def _delete_by_source_id(table_name: str, source_id: str) -> None:
    _supabase_request(
        "DELETE",
        table_name,
        query={"source_id": f"eq.{source_id}"},
        prefer="return=minimal",
    )


def sync_source_to_supabase(
    db_path: Path,
    source_id: str,
    removed_source_id: str | None = None,
) -> bool:
    client = _get_client()
    if client is None:
        error_message = _last_error or "Supabase client is not ready"
        _mark_sync_failure(error_message)
        return False

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        source_file = conn.execute(
            "SELECT * FROM source_files WHERE source_id = ?",
            (source_id,),
        ).fetchall()
        source_pages = conn.execute(
            "SELECT * FROM source_pages WHERE source_id = ?",
            (source_id,),
        ).fetchall()
        source_rows = conn.execute(
            "SELECT * FROM unified_rows WHERE source_id = ? ORDER BY row_id ASC",
            (source_id,),
        ).fetchall()
        totals = conn.execute(
            """
            SELECT
                (SELECT COUNT(*) FROM unified_rows) AS row_count,
                (SELECT COUNT(*) FROM source_files) AS source_count
            """
        ).fetchone()
        row_count = int(totals["row_count"] if totals else 0)
        source_count = int(totals["source_count"] if totals else 0)
    finally:
        conn.close()

    try:
        if removed_source_id and removed_source_id != source_id:
            _delete_by_source_id("unified_rows", removed_source_id)
            _delete_by_source_id("source_pages", removed_source_id)
            _delete_by_source_id("source_files", removed_source_id)

        _upsert_rows("source_files", [dict(row) for row in source_file], chunk_size=100)
        _upsert_rows("source_pages", [dict(row) for row in source_pages], chunk_size=300)
        _upsert_rows("unified_rows", [dict(row) for row in source_rows], chunk_size=300)

        _supabase_request(
            "POST",
            "dashboard_meta_state",
            payload=[
                {
                    "id": "state",
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "row_count": row_count,
                    "source_count": source_count,
                }
            ],
            prefer="resolution=merge-duplicates,return=minimal",
        )
    except Exception as exc:
        _set_last_error(f"{type(exc).__name__}: {exc}")
        raise

    _clear_last_error()
    return True


def _create_empty_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS source_files (
            source_id TEXT PRIMARY KEY,
            file_name TEXT NOT NULL UNIQUE,
            file_ext TEXT,
            uploaded_at TEXT NOT NULL,
            total_rows INTEGER NOT NULL DEFAULT 0,
            total_pages INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS source_pages (
            source_id TEXT NOT NULL,
            page_name TEXT NOT NULL,
            row_count INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (source_id, page_name),
            FOREIGN KEY (source_id) REFERENCES source_files(source_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS unified_rows (
            row_id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_id TEXT NOT NULL,
            file_name TEXT NOT NULL,
            page_name TEXT NOT NULL,
            row_number INTEGER NOT NULL,
            data_json TEXT NOT NULL,
            ingested_at TEXT NOT NULL,
            FOREIGN KEY (source_id) REFERENCES source_files(source_id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_unified_file_page ON unified_rows(file_name, page_name);
        CREATE INDEX IF NOT EXISTS idx_unified_source ON unified_rows(source_id);

        CREATE TABLE IF NOT EXISTS connected_sheets (
            connection_id TEXT PRIMARY KEY,
            url TEXT NOT NULL,
            spreadsheet_id TEXT NOT NULL,
            label TEXT NOT NULL,
            connected_at TEXT NOT NULL,
            last_sync_at TEXT,
            last_sync_rows INTEGER DEFAULT 0,
            last_sync_pages INTEGER DEFAULT 0,
            is_active INTEGER NOT NULL DEFAULT 1
        );
        """
    )


def hydrate_sqlite_from_supabase(db_path: Path) -> bool:
    client = _get_client()
    if client is None:
        return False

    total_started_at = time.perf_counter()
    try:
        fetch_started_at = time.perf_counter()
        source_rows = _fetch_all_rows(_TABLES["source_files"], order="uploaded_at.desc")
        page_rows = _fetch_all_rows(_TABLES["source_pages"])
        unified_rows = _fetch_all_rows(_TABLES["unified_rows"], order="row_id.asc")
        connection_rows = _fetch_all_rows(
            _TABLES["connected_sheets"], order="connected_at.desc"
        )
        _emit_supabase_trace(
            "hydrate_fetch_done "
            f"source_files={len(source_rows)} source_pages={len(page_rows)} "
            f"unified_rows={len(unified_rows)} connected_sheets={len(connection_rows)} "
            f"elapsed_ms={(time.perf_counter() - fetch_started_at) * 1000:.1f}"
        )
    except Exception as exc:
        _set_last_error(f"{type(exc).__name__}: {exc}")
        raise

    if not source_rows:
        return False

    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    try:
        sqlite_started_at = time.perf_counter()
        _create_empty_schema(conn)
        conn.executescript(
            """
            DELETE FROM unified_rows;
            DELETE FROM source_pages;
            DELETE FROM connected_sheets;
            DELETE FROM source_files;
            """
        )

        for row in source_rows:
            conn.execute(
                """
                INSERT OR REPLACE INTO source_files (source_id, file_name, file_ext, uploaded_at, total_rows, total_pages)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    row.get("source_id"),
                    row.get("file_name"),
                    row.get("file_ext"),
                    row.get("uploaded_at"),
                    int(row.get("total_rows") or 0),
                    int(row.get("total_pages") or 0),
                ),
            )

        for row in page_rows:
            conn.execute(
                """
                INSERT OR REPLACE INTO source_pages (source_id, page_name, row_count)
                VALUES (?, ?, ?)
                """,
                (
                    row.get("source_id"),
                    row.get("page_name"),
                    int(row.get("row_count") or 0),
                ),
            )

        for row in unified_rows:
            conn.execute(
                """
                INSERT OR REPLACE INTO unified_rows (row_id, source_id, file_name, page_name, row_number, data_json, ingested_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    int(row.get("row_id") or 0),
                    row.get("source_id"),
                    row.get("file_name"),
                    row.get("page_name"),
                    int(row.get("row_number") or 0),
                    row.get("data_json") or "{}",
                    row.get("ingested_at") or "",
                ),
            )

        for row in connection_rows:
            conn.execute(
                """
                INSERT OR REPLACE INTO connected_sheets (
                    connection_id, url, spreadsheet_id, label, connected_at,
                    last_sync_at, last_sync_rows, last_sync_pages, is_active
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    row.get("connection_id"),
                    row.get("url"),
                    row.get("spreadsheet_id"),
                    row.get("label"),
                    row.get("connected_at"),
                    row.get("last_sync_at"),
                    int(row.get("last_sync_rows") or 0),
                    int(row.get("last_sync_pages") or 0),
                    int(row.get("is_active") or 1),
                ),
            )

        seq_row = conn.execute("SELECT COALESCE(MAX(row_id), 0) FROM unified_rows").fetchone()
        max_row_id = int(seq_row[0] if seq_row else 0)
        try:
            conn.execute(
                "INSERT OR REPLACE INTO sqlite_sequence(name, seq) VALUES ('unified_rows', ?)",
                (max_row_id,),
            )
        except sqlite3.OperationalError:
            pass

        conn.commit()
        _emit_supabase_trace(
            "hydrate_sqlite_done "
            f"source_files={len(source_rows)} source_pages={len(page_rows)} "
            f"unified_rows={len(unified_rows)} connected_sheets={len(connection_rows)} "
            f"elapsed_ms={(time.perf_counter() - sqlite_started_at) * 1000:.1f}"
        )
    finally:
        conn.close()

    _emit_supabase_trace(
        f"hydrate_total_done elapsed_ms={(time.perf_counter() - total_started_at) * 1000:.1f}"
    )
    _clear_last_error()
    return True
