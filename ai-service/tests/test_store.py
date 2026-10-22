"""The REST data layer: right endpoint, right headers, caller's own token."""

import asyncio

import httpx

from app import config, db


def capture(handler):
    """Run a request against a mocked Supabase REST server and record what was sent."""
    seen: dict = {}

    def wrapped(request: httpx.Request) -> httpx.Response:
        seen["url"] = str(request.url)
        seen["auth"] = request.headers.get("authorization")
        seen["apikey"] = request.headers.get("apikey")
        seen["prefer"] = request.headers.get("prefer")
        seen["body"] = request.read().decode()
        return handler(request)

    return seen, httpx.MockTransport(wrapped)


def test_reads_use_the_callers_token_and_scoped_filters(monkeypatch):
    monkeypatch.setattr(config, "SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setattr(config, "SUPABASE_KEY", "publishable-key")
    seen, transport = capture(lambda request: httpx.Response(200, json=[{"id": "row-1"}]))

    row = asyncio.run(db._request("GET", "profiles", "user-token", params={"id": "eq.u-1"}, transport=transport))

    assert seen["url"] == "https://example.supabase.co/rest/v1/profiles?id=eq.u-1"
    assert seen["auth"] == "Bearer user-token"
    assert seen["apikey"] == "publishable-key"
    assert row.json() == [{"id": "row-1"}]


def test_inserts_ask_for_the_saved_row_back(monkeypatch):
    monkeypatch.setattr(config, "SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setattr(config, "SUPABASE_KEY", "publishable-key")
    seen, transport = capture(lambda request: httpx.Response(200, json=[{"id": "row-1"}]))

    rows = asyncio.run(db.insert("user-token", "resume_analyses", [{"user_id": "u-1"}], returning=True, transport=transport))

    assert seen["prefer"] == "return=representation"
    assert rows == [{"id": "row-1"}]


def test_errors_become_store_errors(monkeypatch):
    monkeypatch.setattr(config, "SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setattr(config, "SUPABASE_KEY", "publishable-key")
    seen, transport = capture(lambda request: httpx.Response(403, json={"message": "no"}))

    try:
        asyncio.run(db.select_one("user-token", "profiles", {"id": "u-1"}, transport=transport))
    except db.StoreError:
        pass
    else:
        raise AssertionError("expected StoreError")


def test_missing_configuration_fails_fast():
    # conftest clears SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY.
    try:
        asyncio.run(db.select_one("user-token", "profiles", {"id": "u-1"}))
    except db.StoreError:
        pass
    else:
        raise AssertionError("expected StoreError")
