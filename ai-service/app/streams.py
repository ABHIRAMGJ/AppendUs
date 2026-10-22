"""Encoders that turn model text into the stream formats the React client reads."""

import json
from collections.abc import AsyncIterator
from uuid import uuid4

from .gateway import GatewayError


def sse(part: dict) -> str:
    return f"data: {json.dumps(part, ensure_ascii=False)}\n\n"


def ui_message_parts(chunks: AsyncIterator[str], text_id: str = "text_1") -> AsyncIterator[str]:
    """Emit the UI message stream the AI SDK `useChat` transport consumes."""
    message_id = f"msg_{uuid4().hex}"

    async def gen() -> AsyncIterator[str]:
        yield sse({"type": "start", "messageId": message_id})
        yield sse({"type": "text-start", "id": text_id})
        saw_text = False
        try:
            async for delta in chunks:
                if delta:
                    saw_text = True
                    yield sse({"type": "text-delta", "id": text_id, "delta": delta})
        except Exception as exc:
            # Once streaming starts, FastAPI's JSON exception handler cannot run.
            # Send a safe protocol error instead of breaking the connection.
            message = exc.message if isinstance(exc, GatewayError) else "The AI connection was interrupted. Please try again."
            yield sse({"type": "error", "errorText": message})
            yield sse({"type": "text-end", "id": text_id})
            yield sse({"type": "finish"})
            yield "data: [DONE]\n\n"
            return
        yield sse({"type": "text-end", "id": text_id})
        yield sse({"type": "finish"})
        if not saw_text:
            yield sse({"type": "error", "errorText": "The AI returned an empty reply. Please try again."})
        yield "data: [DONE]\n\n"

    return gen()


def plain_text_stream(chunks: AsyncIterator[str]) -> AsyncIterator[str]:
    """Pass model text through unchanged (used by the long-form generators)."""

    async def gen() -> AsyncIterator[str]:
        async for delta in chunks:
            if delta:
                yield delta

    return gen()


async def collect_stream(chunks: AsyncIterator[str]) -> str:
    """Drain a model stream into one string (used when a reply must be stored)."""
    return "".join([delta async for delta in chunks if delta])
