"""Backup models: a busy main model must fall through to the next configured one."""

import asyncio
import json

import pytest

from app import config, gateway


class FakeResponse:
    def __init__(self, status: int, body: str = "", payload: dict | None = None) -> None:
        self.status_code = status
        self.text = body
        self._payload = payload or {}

    def json(self) -> dict:
        return self._payload

    async def aread(self) -> bytes:
        return self.text.encode()


class FakeStream:
    def __init__(self, response: FakeResponse, lines: list[str] | None = None) -> None:
        self._response = response
        self._lines = lines or []

    async def __aenter__(self) -> "FakeStream":
        return self

    async def __aexit__(self, *args: object) -> None:
        return None

    @property
    def status_code(self) -> int:
        return self._response.status_code

    async def aread(self) -> bytes:
        return await self._response.aread()

    async def aiter_lines(self):
        for line in self._lines:
            yield line


class FakeClient:
    """Scripts one outcome per chat request, in order, and records the models tried."""

    is_closed = False

    def __init__(self, outcomes: list[tuple[int, list[str] | dict]]) -> None:
        self.outcomes = outcomes
        self.models: list[str] = []

    def _next(self, payload: dict) -> tuple[int, list[str] | dict]:
        self.models.append(payload["model"])
        assert self.outcomes, "more requests than scripted outcomes"
        return self.outcomes.pop(0)

    def stream(self, method: str, url: str, headers: dict, json: dict, timeout=None) -> FakeStream:
        status, data = self._next(json)
        return FakeStream(FakeResponse(status, json_module.dumps(data) if isinstance(data, dict) else ""), data if isinstance(data, list) else None)

    async def post(self, url: str, headers: dict, json: dict, timeout=None) -> FakeResponse:
        if status_hang := getattr(self, "hang_models", None):
            if json.get("model") in status_hang:
                import httpx
                raise httpx.ReadTimeout("stuck")
        status, data = self._next(json)
        if isinstance(data, dict):
            return FakeResponse(status, payload=data)
        return FakeResponse(status, "\n".join(data))


json_module = json


def _use_client(monkeypatch: pytest.MonkeyPatch, fake: FakeClient) -> None:
    monkeypatch.setattr(gateway, "_client", fake)
    monkeypatch.setattr(config, "CHAT_MODEL", "main-model")
    monkeypatch.setattr(config, "CHAT_MODEL_FALLBACKS", ["backup-one", "backup-two"])


def _sse(text: str) -> list[str]:
    return [f"data: {json.dumps({'choices': [{'delta': {'content': text}}]})}", "data: [DONE]"]


def test_busy_main_model_falls_back_for_streaming(monkeypatch: pytest.MonkeyPatch) -> None:
    fake = FakeClient([
        (503, {"error": {"message": "high demand"}}),
        (200, _sse("hello")),
    ])
    _use_client(monkeypatch, fake)

    async def drain() -> str:
        return "".join([part async for part in gateway.stream_text("sys", [{"role": "user", "content": "hi"}])])

    assert asyncio.run(drain()) == "hello"
    assert fake.models == ["main-model", "backup-one"]


def test_bad_key_does_not_fall_back(monkeypatch: pytest.MonkeyPatch) -> None:
    fake = FakeClient([(401, {"error": {"message": "bad key"}})])
    _use_client(monkeypatch, fake)

    async def drain() -> str:
        return "".join([part async for part in gateway.stream_text("", [{"role": "user", "content": "hi"}])])

    with pytest.raises(gateway.GatewayError):
        asyncio.run(drain())
    assert fake.models == ["main-model"]


def test_all_models_busy_raises_the_last_error(monkeypatch: pytest.MonkeyPatch) -> None:
    busy = (503, {"error": {"message": "high demand"}})
    fake = FakeClient([busy, busy, busy])
    _use_client(monkeypatch, fake)

    async def drain() -> str:
        return "".join([part async for part in gateway.stream_text("", [{"role": "user", "content": "hi"}])])

    with pytest.raises(gateway.GatewayError) as excinfo:
        asyncio.run(drain())
    assert "high demand" in excinfo.value.message
    assert fake.models == ["main-model", "backup-one", "backup-two"]


def test_busy_main_model_falls_back_for_json(monkeypatch: pytest.MonkeyPatch) -> None:
    schema = {"type": "object", "properties": {"ok": {"type": "boolean"}}, "required": ["ok"]}
    good = {"choices": [{"message": {"content": json.dumps({"ok": True})}}]}
    fake = FakeClient([
        (503, {"error": {"message": "overloaded"}}),
        (200, good),
    ])
    _use_client(monkeypatch, fake)

    result = asyncio.run(gateway.complete_json(schema, prompt="hi"))
    assert result == {"ok": True}
    assert fake.models == ["main-model", "backup-one"]


def test_probe_reports_the_model_that_answered(monkeypatch: pytest.MonkeyPatch) -> None:
    fake = FakeClient([
        (503, {"error": {"message": "high demand"}}),
        (200, {"choices": [{"message": {"content": "OK"}}]}),
    ])
    _use_client(monkeypatch, fake)

    result = asyncio.run(gateway.provider_probe())
    assert result["accepted"] is True
    assert result["model"] == "backup-one"


def test_gemini_default_fallbacks_are_set() -> None:
    assert config.AI_PROVIDER in {"gemini", "lovable"}
    if config.AI_PROVIDER == "gemini":
        assert config.CHAT_MODEL_FALLBACKS
        assert config.CHAT_MODEL not in config.CHAT_MODEL_FALLBACKS


def test_stuck_main_model_falls_back_instead_of_hanging(monkeypatch: pytest.MonkeyPatch) -> None:
    fake = FakeClient([(200, {"choices": [{"message": {"content": "OK"}}]})])
    fake.hang_models = {"main-model"}
    _use_client(monkeypatch, fake)

    result = asyncio.run(gateway.provider_probe())
    assert result["model"] == "backup-one"
