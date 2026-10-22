"""Retrieval-augmented resume analysis: chunk, embed, store, then retrieve by similarity."""

import json
from typing import Any

from . import config, db, gateway

MAX_TOKENS = 1200
CHARS_PER_TOKEN = 4


def count_tokens(text: str) -> int:
    """Rough estimate used only to keep chunks under the model's window."""
    return max(1, -(-len(text) // CHARS_PER_TOKEN))


def chunk_resume(text: str, max_tokens: int = MAX_TOKENS) -> list[str]:
    """Split on paragraph/line boundaries, then hard-split anything still oversized."""
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    chunks: list[str] = []
    current = ""
    for line in lines:
        candidate = f"{current}\n{line}" if current else line
        if count_tokens(candidate) > max_tokens and current:
            chunks.append(current)
            current = line
        else:
            current = candidate
    if current:
        chunks.append(current)

    out: list[str] = []
    max_chars = max_tokens * CHARS_PER_TOKEN
    for chunk in chunks:
        if count_tokens(chunk) <= max_tokens:
            out.append(chunk)
            continue
        for start in range(0, len(chunk), max_chars):
            out.append(chunk[start : start + max_chars])
    return [chunk for chunk in out if chunk.strip()][: config.MAX_CHUNKS]


def query_for(role: str, jd: str) -> str:
    return f"Target role: {role or 'general'}\nJob description: {jd or 'not provided'}"


def format_evidence(matches: list[dict[str, Any]], fallback: str) -> str:
    if not matches:
        return fallback[:12000]
    blocks = [
        f"[Excerpt {index + 1} | relevance {float(m.get('similarity') or 0):.2f}]\n{m.get('content')}"
        for index, m in enumerate(matches)
    ]
    return "\n\n---\n\n".join(blocks)


async def index_resume(token: str, user_id: str, resume: str, role: str, jd: str, limit: int = 10) -> str:
    """Store this resume as vectors and return the excerpts most relevant to the target role."""
    chunks = chunk_resume(resume)
    if not chunks:
        raise ValueError("Resume text is empty")

    vectors = await gateway.embed(chunks + [query_for(role, jd)])
    chunk_vectors, query_vector = vectors[: len(chunks)], vectors[-1]

    await db.delete(token, "resume_chunks", {"user_id": user_id})
    rows = [
        {
            "user_id": user_id,
            "content": chunk,
            "embedding": json.dumps(vector),
            "metadata": {"index": index, "role": role or None},
        }
        for index, (chunk, vector) in enumerate(zip(chunks, chunk_vectors))
    ]
    for start in range(0, len(rows), 10):  # keep request bodies modest
        await db.insert(token, "resume_chunks", rows[start : start + 10])

    try:
        matches = await db.rpc(
            token,
            "match_resume_chunks",
            {"query_embedding": json.dumps(query_vector), "match_count": max(1, min(limit, len(chunks)))},
        )
    except db.StoreError:
        matches = []  # search hiccup: fall back to the full resume text below
    if not isinstance(matches, list):
        matches = []
    return format_evidence(matches, resume)
