from app import config, rag


def make_resume(lines: int, width: int = 60) -> str:
    return "\n".join(f"Line {i}: " + "word " * (width // 5) for i in range(lines))


def test_chunks_stay_under_the_token_limit():
    chunks = rag.chunk_resume(make_resume(200), max_tokens=100)
    assert chunks
    assert all(rag.count_tokens(chunk) <= 100 for chunk in chunks)
    assert all(chunk.strip() for chunk in chunks)


def test_short_resume_stays_one_chunk():
    text = "Abhi Ram\nB.Tech CSE\nBuilt a React dashboard with PostgreSQL."
    chunks = rag.chunk_resume(text)
    assert chunks == [text]


def test_chunk_count_is_capped():
    chunks = rag.chunk_resume(make_resume(4000), max_tokens=100)
    assert len(chunks) <= config.MAX_CHUNKS


def test_evidence_is_labelled_with_relevance():
    text = rag.format_evidence(
        [{"content": "Built a React dashboard", "similarity": 0.83}, {"content": "SQL queries", "similarity": 0.5}],
        fallback="full resume",
    )
    assert "[Excerpt 1 | relevance 0.83]" in text
    assert "Built a React dashboard" in text
    assert "SQL queries" in text


def test_evidence_falls_back_to_the_whole_resume_when_nothing_matched():
    assert rag.format_evidence([], fallback="the whole resume") == "the whole resume"


def test_query_mentions_the_target_role_and_job_description():
    query = rag.query_for("Frontend Engineer", "React and TypeScript")
    assert "Frontend Engineer" in query
    assert "React and TypeScript" in query
