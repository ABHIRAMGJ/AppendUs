"""Client for the Lovable AI Gateway: streaming chat, strict JSON and embeddings."""

import json
from collections.abc import AsyncIterator, Sequence
from typing import Any

import httpx

from . import config

_FRIENDLY = {
    429: "Too many requests right now. Please wait a moment and try again.",
    402: "AI credits are used up. Add credits in Settings → Plans & credits.",
    403: "AI access is blocked for this workspace.",
}


class GatewayError(Exception):
    """An AI failure that can be shown to the user as-is."""

    def __init__(self, message: str, status: int = 502) -> None:
        super().__init__(message)
        self.status = status
        self.message = message


def friendly_message(status: int) -> str:
    return _FRIENDLY.get(status, "The AI service had a problem. Please try again.")


_client: httpx.AsyncClient | None = None


def client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            timeout=httpx.Timeout(180.0, connect=15.0),
            limits=httpx.Limits(max_connections=32, max_keepalive_connections=8),
        )
    return _client


async def close_client() -> None:
    global _client
    if _client is not None and not _client.is_closed:
        await _client.aclose()
    _client = None


def _headers() -> dict[str, str]:
    if not config.GATEWAY_KEY:
        raise GatewayError("AI is not configured", 401)
    return {
        "Authorization": f"Bearer {config.GATEWAY_KEY}",
        "Content-Type": "application/json",
    }


def _model_payload(system: str, messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return ([{"role": "system", "content": system}] if system else []) + messages


async def stream_text(system: str, messages: list[dict[str, Any]]) -> AsyncIterator[str]:
    """Yield answer text as it is produced by the model."""
    payload: dict[str, Any] = {
        "model": config.CHAT_MODEL,
        "stream": True,
        "messages": _model_payload(system, messages),
    }
    if config.REASONING_EFFORT:
        payload["reasoning_effort"] = config.REASONING_EFFORT

    async with client().stream(
        "POST", f"{config.GATEWAY_BASE}/chat/completions", headers=_headers(), json=payload
    ) as res:
        if res.status_code != 200:
            body = (await res.aread()).decode("utf-8", "replace")[:400]
            raise GatewayError(friendly_message(res.status_code), res.status_code)
        async for line in res.aiter_lines():
            if not line.startswith("data:"):
                continue
            data = line[5:].strip()
            if not data or data == "[DONE]":
                continue
            try:
                chunk = json.loads(data)
            except json.JSONDecodeError:
                continue
            for choice in chunk.get("choices") or []:
                delta = (choice.get("delta") or {}).get("content")
                if delta:
                    yield delta


async def complete_json(
    schema: dict[str, Any],
    *,
    system: str = "",
    prompt: str | None = None,
    messages: list[dict[str, Any]] | None = None,
    name: str = "response",
    attempts: int = 2,
) -> dict[str, Any]:
    """Ask the model for one JSON object that validates against `schema`."""
    from jsonschema import Draft202012Validator

    base = messages if messages is not None else [{"role": "user", "content": prompt or ""}]
    validator = Draft202012Validator(schema)
    last_error = "no attempt made"

    for attempt in range(attempts):
        notes = base if attempt == 0 else base + [
            {"role": "user", "content": f"Return only a JSON object that matches the schema. Problem: {last_error}"}
        ]
        payload: dict[str, Any] = {
            "model": config.CHAT_MODEL,
            "messages": _model_payload(system, notes),
            "response_format": {
                "type": "json_schema",
                "json_schema": {"name": name, "strict": True, "schema": schema},
            },
        }
        if config.REASONING_EFFORT:
            payload["reasoning_effort"] = config.REASONING_EFFORT

        res = await client().post(
            f"{config.GATEWAY_BASE}/chat/completions", headers=_headers(), json=payload
        )
        if res.status_code != 200:
            raise GatewayError(friendly_message(res.status_code), res.status_code)

        try:
            content = res.json()["choices"][0]["message"]["content"] or ""
            value = json.loads(content)
        except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
            last_error = f"model did not return valid JSON ({exc.__class__.__name__})"
            continue

        if isinstance(value, dict) and validator.is_valid(value):
            return value
        errors = sorted(validator.iter_errors(value), key=lambda e: list(e.path))
        last_error = "; ".join(e.message for e in errors[:3]) or "object does not match the schema"

    raise GatewayError(f"The AI reply could not be used ({last_error}). Please try again.", 502)


async def embed(texts: Sequence[str]) -> list[list[float]]:
    """Embed texts with the configured embedding model, preserving order."""
    if not texts:
        return []
    out: list[list[float]] = []
    for start in range(0, len(texts), config.EMBED_BATCH):
        batch = list(texts[start : start + config.EMBED_BATCH])
        res = await client().post(
            f"{config.GATEWAY_BASE}/embeddings",
            headers=_headers(),
            json={"model": config.EMBED_MODEL, "input": batch},
        )
        if res.status_code != 200:
            raise GatewayError(friendly_message(res.status_code), res.status_code)
        ordered: list[list[float] | None] = [None] * len(batch)
        for item in res.json().get("data", []):
            index = item.get("index")
            if isinstance(index, int) and 0 <= index < len(batch):
                ordered[index] = item.get("embedding")
        for value in ordered:
            if not value or len(value) != config.EMBED_DIMS:
                raise GatewayError("The AI service returned an unusable embedding.", 502)
        out.extend(v for v in ordered if v is not None)
    return out
