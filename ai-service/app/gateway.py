"""Client for the Lovable AI Gateway: streaming chat, strict JSON and embeddings."""

import json
from collections.abc import AsyncIterator, Mapping, Sequence
from typing import Any

import httpx

from . import config

_FRIENDLY = {
    400: "The AI provider rejected the request settings. Please check the configured model and provider.",
    401: "The AI provider could not authenticate. Please check the API key in the hosting settings.",
    404: "The configured AI model or endpoint is unavailable. Please check the hosting settings.",
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


def provider_detail(status: int, body: str) -> str:
    """Friendly wording plus the provider's own short reason, with secrets removed."""
    try:
        data = json.loads(body)
    except (json.JSONDecodeError, TypeError):
        data = None
    if isinstance(data, Mapping):
        err = data.get("error")
        if isinstance(err, Mapping):
            detail = str(err.get("message") or err.get("status") or "")
        elif isinstance(err, str):
            detail = err
        else:
            detail = str(data.get("message") or data.get("detail") or "")
    else:
        detail = body
    detail = " ".join(detail.split())[:180]
    for secret in (config.GATEWAY_KEY, config.SUPABASE_KEY):
        if secret:
            detail = detail.replace(secret, "[redacted]")
    base = friendly_message(status)
    return base if not detail or detail == base else f"{base} Provider says: {detail}"


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
        if config.AI_PROVIDER == "gemini":
            raise GatewayError("Gemini is not configured. Add GEMINI_API_KEY in Render's Environment settings.", 503)
        raise GatewayError("AI is not configured", 401)
    return {
        "Authorization": f"Bearer {config.GATEWAY_KEY}",
        "Content-Type": "application/json",
    }


def _model_payload(system: str, messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return ([{"role": "system", "content": system}] if system else []) + messages


_RETRYABLE = {429, 500, 502, 503, 504, 529}

# A stuck model must not hang the request: give up on it and move to the backup.
ATTEMPT_TIMEOUT = httpx.Timeout(60.0, connect=10.0)
_SLOW = "The AI model took too long to answer."


async def _post(path: str, payload: dict[str, Any]) -> httpx.Response:
    try:
        return await client().post(
            f"{config.GATEWAY_BASE}{path}", headers=_headers(), json=payload, timeout=ATTEMPT_TIMEOUT
        )
    except httpx.TimeoutException as exc:
        raise GatewayError(_SLOW, 504) from exc
    except httpx.HTTPError as exc:
        raise GatewayError("Could not reach the AI provider.", 502) from exc


def _chat_models() -> list[str]:
    """Main model first, then each configured backup."""
    return [config.CHAT_MODEL, *config.CHAT_MODEL_FALLBACKS]


def _is_retryable(err: "GatewayError") -> bool:
    """Busy/overloaded answers are worth retrying on a backup model; bad keys are not."""
    if err.status in _RETRYABLE:
        return True
    text = err.message.lower()
    return "high demand" in text or "overloaded" in text or "temporarily unavailable" in text


async def stream_text(system: str, messages: list[dict[str, Any]]) -> AsyncIterator[str]:
    """Yield answer text as it is produced by the model, falling back to backup models."""
    models = _chat_models()
    last_error: GatewayError | None = None
    for index, model in enumerate(models):
        payload: dict[str, Any] = {
            "model": model,
            "stream": True,
            "messages": _model_payload(system, messages),
        }
        if config.REASONING_EFFORT:
            payload["reasoning_effort"] = config.REASONING_EFFORT
        try:
            sent_any = False
            async with client().stream(
                "POST", f"{config.GATEWAY_BASE}/chat/completions", headers=_headers(), json=payload,
                timeout=ATTEMPT_TIMEOUT,
            ) as res:
                if res.status_code != 200:
                    body = (await res.aread()).decode("utf-8", "replace")[:600]
                    raise GatewayError(provider_detail(res.status_code, body), res.status_code)
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
                            sent_any = True
                            yield delta
            return
        except httpx.TimeoutException as exc:
            last_error = GatewayError(_SLOW, 504)
            if not sent_any and index + 1 < len(models):
                continue
            raise last_error from exc
        except GatewayError as exc:
            last_error = exc
            if index + 1 < len(models) and _is_retryable(exc):
                continue
            raise
    raise last_error or GatewayError("The AI service had a problem. Please try again.", 502)


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
        res: httpx.Response | None = None
        model_error: GatewayError | None = None
        models = _chat_models()
        for index, model in enumerate(models):
            if config.AI_PROVIDER == "gemini":
                # Gemini's compatible endpoint only promises JSON mode, not strict schemas:
                # describe the schema in the prompt and keep the jsonschema retry loop.
                schema_text = json.dumps(schema)
                payload: dict[str, Any] = {
                    "model": model,
                    "messages": _model_payload(
                        (system + "\n\n" if system else "")
                        + f"Respond with a single JSON object that fits this JSON Schema:\n{schema_text}",
                        notes,
                    ),
                    "response_format": {"type": "json_object"},
                }
            else:
                payload = {
                    "model": model,
                    "messages": _model_payload(system, notes),
                    "response_format": {
                        "type": "json_schema",
                        "json_schema": {"name": name, "strict": True, "schema": schema},
                    },
                }
            if config.REASONING_EFFORT:
                payload["reasoning_effort"] = config.REASONING_EFFORT

            try:
                res = await _post("/chat/completions", payload)
            except GatewayError as exc:
                model_error = exc
                if index + 1 < len(models) and _is_retryable(exc):
                    continue
                raise
            if res.status_code == 200:
                break
            model_error = GatewayError(provider_detail(res.status_code, res.text[:600]), res.status_code)
            if index + 1 < len(models) and _is_retryable(model_error):
                continue
            raise model_error
        else:
            raise model_error or GatewayError("The AI service had a problem. Please try again.", 502)

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
            json={"model": config.EMBED_MODEL, "input": batch, "dimensions": config.EMBED_DIMS},
        )
        if res.status_code != 200:
            raise GatewayError(provider_detail(res.status_code, res.text[:600]), res.status_code)
        ordered: list[list[float] | None] = [None] * len(batch)
        for position, item in enumerate(res.json().get("data", [])):
            index = item.get("index", position)
            if isinstance(index, int) and 0 <= index < len(batch):
                ordered[index] = item.get("embedding")
        for value in ordered:
            if not value or len(value) != config.EMBED_DIMS:
                raise GatewayError("The AI service returned an unusable embedding.", 502)
        out.extend(v for v in ordered if v is not None)
    return out


async def provider_probe() -> dict[str, Any]:
    """One tiny real request so the hosting settings can be checked from outside."""
    models = _chat_models()
    last_error: GatewayError | None = None
    for index, model in enumerate(models):
        try:
            res = await _post("/chat/completions", {
                "model": model,
                "max_tokens": 8,
                "messages": [{"role": "user", "content": "Reply with the single word OK."}],
            })
        except GatewayError as exc:
            last_error = exc
            if index + 1 < len(models):
                continue
            raise
        if res.status_code == 200:
            return {"provider": config.AI_PROVIDER, "model": model, "accepted": True}
        last_error = GatewayError(provider_detail(res.status_code, res.text[:600]), res.status_code)
        if index + 1 < len(models) and _is_retryable(last_error):
            continue
        raise last_error
    raise last_error or GatewayError("The AI service had a problem. Please try again.", 502)


async def provider_models() -> list[str]:
    """Model names the configured key can actually use."""
    res = await client().get(f"{config.GATEWAY_BASE}/models", headers=_headers())
    if res.status_code != 200:
        raise GatewayError(provider_detail(res.status_code, res.text[:600]), res.status_code)
    data = res.json()
    items = data.get("data") if isinstance(data, Mapping) else None
    if not isinstance(items, list):
        items = data.get("models") if isinstance(data, Mapping) else []
    names = [str(item.get("id") or item.get("name")) for item in items if isinstance(item, Mapping)]
    return sorted(name for name in names if name and name != "None")[:80]
