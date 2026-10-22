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


async def index_resume(user_id: str, resume: str, role: str, jd: str, limit: int = 10) -> str:
    """Store this resume as vectors and return the excerpts most relevant to the target role."""
    chunks = chunk_resume(resume)
    if not chunks:
        raise ValueError("Resume text is empty")

    vectors = await gateway.embed(chunks + [query_for(role, jd)])
    chunk_vectors, query_vector = vectors[: len(chunks)], vectors[-1]

    await db.execute("delete from public.resume_chunks where user_id = %s", (user_id,))
    await db.execute_many(
        """
        insert into public.resume_chunks (user_id, content, embedding, metadata)
        values (%s, %s, %s::vector, %s::jsonb)
        """,
        [
            (user_id, chunk, json.dumps(vector), json.dumps({"index": i, "role": role or None}))
            for i, (chunk, vector) in enumerate(zip(chunks, chunk_vectors))
        ],
    )

    needle = json.dumps(query_vector)
    matches = await db.fetch(
        """
        select content,
               1 - (embedding::halfvec(3072) <=> %s::halfvec(3072)) as similarity
          from public.resume_chunks
         where user_id = %s
         order by embedding::halfvec(3072) <=> %s::halfvec(3072)
         limit %s
        """,
        (needle, user_id, needle, max(1, min(limit, len(chunks)))),
    )
    return format_evidence(matches, resume)
