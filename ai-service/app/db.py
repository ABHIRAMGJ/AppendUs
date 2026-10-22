"""Supabase REST access.

Every call carries the caller's own bearer token, so row level security — not
this service — decides what is visible. No database password is ever needed.
"""

from typing import Any

import httpx

from . import config


class StoreError(Exception):
    """The data store is unavailable or rejected the request."""


def _filters(filters: dict[str, Any]) -> dict[str, str]:
    out: dict[str, str] = {}
    for key, value in filters.items():
        text = str(value)
        if isinstance(value, bool):
            text = text.lower()
        out[key] = f"eq.{text}"
    return out


def _headers(token: str) -> dict[str, str]:
    return {
        "apikey": config.SUPABASE_KEY,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


async def _request(
    method: str,
    path: str,
    token: str,
    *,
    params: dict[str, str] | None = None,
    body: Any = None,
    prefer: str | None = None,
    transport: httpx.AsyncBaseTransport | None = None,
) -> httpx.Response:
    if not (config.SUPABASE_URL and config.SUPABASE_KEY and token):
        raise StoreError("Data store is not configured")
    headers = _headers(token)
    if prefer:
        headers["Prefer"] = prefer
    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(30.0, connect=8.0), transport=transport
        ) as http:
            res = await http.request(
                method,
                f"{config.SUPABASE_URL}/rest/v1/{path}",
                params=params,
                json=body,
                headers=headers,
            )
    except httpx.HTTPError as exc:
        raise StoreError(f"Data store unreachable ({exc.__class__.__name__})") from exc
    if res.status_code >= 400:
        raise StoreError(f"Data store request failed ({res.status_code})")
    return res


async def select_one(
    token: str, table: str, filters: dict[str, Any], columns: str = "*"
) -> dict[str, Any] | None:
    params = {**_filters(filters), "select": columns, "limit": "1"}
    res = await _request("GET", table, token, params=params)
    rows = res.json()
    return rows[0] if isinstance(rows, list) and rows else None


async def insert(
    token: str, table: str, rows: list[dict[str, Any]], *, returning: bool = False
) -> list[dict[str, Any]]:
    prefer = "return=representation" if returning else "return=minimal"
    res = await _request("POST", table, token, body=rows, prefer=prefer)
    return res.json() if returning else []


async def update(token: str, table: str, filters: dict[str, Any], values: dict[str, Any]) -> None:
    await _request("PATCH", table, token, params=_filters(filters), body=values, prefer="return=minimal")


async def delete(token: str, table: str, filters: dict[str, Any]) -> None:
    await _request("DELETE", table, token, params=_filters(filters), prefer="return=minimal")


async def rpc(token: str, fn: str, params: dict[str, Any]) -> Any:
    res = await _request("POST", f"rpc/{fn}", token, body=params)
    return res.json()
