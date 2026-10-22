"""Session verification: a bearer token from the app becomes a user id."""

from typing import Any

import httpx

from . import config


class AuthError(Exception):
    pass


async def user_from_token(token: str | None) -> dict[str, Any] | None:
    """Return {"user_id", "email"} when the bearer token is a live session."""
    if not token or not config.SUPABASE_URL or not config.SUPABASE_KEY:
        return None
    if token.count(".") != 2:  # not a JWT at all
        return None
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(12.0, connect=6.0)) as http:
            res = await http.get(
                f"{config.SUPABASE_URL}/auth/v1/user",
                headers={"Authorization": f"Bearer {token}", "apikey": config.SUPABASE_KEY},
            )
    except httpx.HTTPError:
        return None
    if res.status_code != 200:
        return None
    data = res.json()
    user_id = data.get("id")
    if not user_id:
        return None
    return {"user_id": str(user_id), "email": data.get("email") or ""}


def bearer(request_headers: dict[str, str]) -> str | None:
    raw = request_headers.get("authorization") or request_headers.get("Authorization") or ""
    if raw.startswith("Bearer "):
        return raw[7:].strip() or None
    return None
