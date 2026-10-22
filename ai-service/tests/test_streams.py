import json

from app import streams


async def fake_chunks(*pieces: str):
    for piece in pieces:
        yield piece


def run(async_gen) -> list[str]:
    import asyncio

    async def drain():
        return [part async for part in async_gen]

    return asyncio.run(drain())


def test_ui_stream_carries_the_text_and_terminates():
    parts = run(streams.ui_message_parts(fake_chunks("Hel", "lo ", "there")))
    events = [json.loads(p[6:]) for p in parts if p.startswith("data: {")]

    assert events[0]["type"] == "start"
    assert events[1]["type"] == "text-start"
    deltas = [e["delta"] for e in events if e["type"] == "text-delta"]
    assert "".join(deltas) == "Hello there"
    assert events[-1]["type"] == "finish"
    assert parts[-1] == "data: [DONE]\n\n"


def test_empty_model_reply_is_reported_as_an_error():
    parts = run(streams.ui_message_parts(fake_chunks()))
    assert any('"type": "error"' in p or "error" in p for p in parts)


def test_plain_stream_passes_text_through():
    out = run(streams.plain_text_stream(fake_chunks("a", "", "b")))
    assert out == ["a", "b"]


def test_collect_stream_joins_everything():
    import asyncio

    assert asyncio.run(streams.collect_stream(fake_chunks("a", "b", ""))) == "ab"


def test_provider_rejection_is_reported_and_stream_terminates():
    from app.gateway import GatewayError

    async def rejected():
        raise GatewayError("AI request rejected.", 401)
        yield "unreachable"

    parts = run(streams.ui_message_parts(rejected()))
    events = [json.loads(p[6:]) for p in parts if p.startswith("data: {")]
    assert {"type": "error", "errorText": "AI request rejected."} in events
    assert events[-1]["type"] == "finish"
    assert parts[-1] == "data: [DONE]\n\n"


def test_unexpected_failure_does_not_expose_internal_details():
    async def failed():
        raise RuntimeError("private diagnostic detail")
        yield "unreachable"

    parts = run(streams.ui_message_parts(failed()))
    assert "private diagnostic detail" not in "".join(parts)
    assert any('"type": "error"' in part for part in parts)
    assert parts[-1] == "data: [DONE]\n\n"
