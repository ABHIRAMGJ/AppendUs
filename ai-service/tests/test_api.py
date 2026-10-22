"""Endpoint behaviour, with the AI gateway and database faked out."""

from fastapi.testclient import TestClient

from app import auth, db, gateway, main


def install(monkeypatch, reply="Hello from Python"):
    """Replace the network and database calls so tests never leave the machine."""

    async def fake_stream(system, messages):
        for piece in (reply, "!"):
            yield piece

    monkeypatch.setattr(gateway, "stream_text", fake_stream)
    monkeypatch.setattr(auth, "user_from_token", lambda token: _coro({"user_id": "u-1", "email": "a@b.c"}))
    monkeypatch.setattr(db, "select_one", lambda *a, **k: _coro({"id": "row-1", "title": "New conversation"}))
    monkeypatch.setattr(db, "insert", lambda *a, **k: _coro([{"id": "row-1"}]))
    monkeypatch.setattr(db, "update", lambda *a, **k: _coro(None))
    monkeypatch.setattr(db, "delete", lambda *a, **k: _coro(None))
    monkeypatch.setattr(db, "rpc", lambda *a, **k: _coro([]))


def _coro(value):
    async def go():
        return value

    return go()


client = TestClient(main.app)


def test_health_says_which_runtime_serves_the_app():
    body = client.get("/health").json()
    assert body["runtime"] == "python-fastapi"
    assert body["gateway"] == "configured"


def test_chat_streams_the_model_reply(monkeypatch):
    install(monkeypatch)
    res = client.post("/chat", json={"messages": [{"role": "user", "parts": [{"type": "text", "text": "hi"}]}]})
    assert res.status_code == 200
    assert res.headers["x-vercel-ai-ui-message-stream"] == "v1"
    assert "Hello from Python" in res.text
    assert res.text.rstrip().endswith("data: [DONE]")


def test_chat_needs_something_to_answer(monkeypatch):
    install(monkeypatch)
    assert client.post("/chat", json={"messages": []}).status_code == 400


def test_generate_rejects_unknown_task():
    assert client.post("/generate", json={"task": "nope", "input": {}}).status_code == 400


def test_generate_streams_plain_text(monkeypatch):
    install(monkeypatch)
    res = client.post("/generate", json={"task": "career", "input": {"role": "Data Analyst"}})
    assert res.status_code == 200
    assert res.text == "Hello from Python!"


def test_signed_in_only_endpoints_refuse_anonymous_callers():
    for path, payload in (
        ("/mentor", {"id": "t-1", "messages": [{"role": "user", "parts": [{"type": "text", "text": "hi"}]}]}),
        ("/quiz", {"topic": "SQL"}),
        ("/resume", {"resume": "x" * 200}),
        ("/interview", {"action": "generate", "mode": "real"}),
    ):
        assert client.post(path, json=payload).status_code == 401, path


def test_quiz_returns_five_valid_questions(monkeypatch):
    install(monkeypatch)
    good = {
        "questions": [
            {"question": f"Q{i}", "options": ["a", "b", "c", "d"], "correct_index": 0, "explanation": "e"}
            for i in range(5)
        ]
    }

    async def fake_json(schema, **kwargs):
        return good

    monkeypatch.setattr(gateway, "complete_json", fake_json)
    res = client.post("/quiz", json={"topic": "SQL", "level": "Beginner"}, headers={"Authorization": "Bearer t"})
    assert res.status_code == 200
    assert len(res.json()["questions"]) == 5


def test_quiz_is_rejected_when_the_reply_breaks_the_rules(monkeypatch):
    install(monkeypatch)

    async def bad_json(schema, **kwargs):
        return {"questions": [{"question": "Q", "options": ["a", "b", "c"], "correct_index": 0, "explanation": ""}]}

    monkeypatch.setattr(gateway, "complete_json", bad_json)
    res = client.post("/quiz", json={"topic": "SQL"}, headers={"Authorization": "Bearer t"})
    assert res.status_code == 502
    assert "requirements" in res.json()["error"]


def test_resume_needs_a_real_file(monkeypatch):
    install(monkeypatch)
    res = client.post("/resume", json={"resume": "too short"}, headers={"Authorization": "Bearer t"})
    assert res.status_code == 400
    assert "resume" in res.json()["error"].lower()


def test_resume_returns_a_checked_analysis(monkeypatch):
    install(monkeypatch)

    async def fake_index(token, user_id, resume, role, jd, limit=10):
        return "[Excerpt 1 | relevance 0.90]\nBuilt a React dashboard with PostgreSQL."

    async def fake_json(schema, **kwargs):
        return {
            "overall_score": 95,
            "summary": "Solid frontend resume.",
            "ats_compatibility": 80,
            "skills_match": 60,
            "content_quality": 60,
            "format_structure": 60,
            "strengths": ["Ships real apps"],
            "improvements": ["Add numbers"],
            "matched_keywords": ["React", "GraphQL"],
            "missing_keywords": ["PostgreSQL", "Next.js"],
            "suggestions": ["Quantify impact"],
            "improved_bullets": [{"original": "Did dashboards", "improved": "Built dashboards used by 200 users"}],
        }

    monkeypatch.setattr(main.rag, "index_resume", fake_index)
    monkeypatch.setattr(gateway, "complete_json", fake_json)

    res = client.post(
        "/resume",
        json={"resume": "Built a React dashboard with PostgreSQL." * 6, "role": "Frontend Engineer", "jd": "React"},
        headers={"Authorization": "Bearer t"},
    )
    assert res.status_code == 200
    result = res.json()["result"]
    assert result["overall_score"] == 65  # recomputed from the four parts
    assert result["matched_keywords"] == ["React"]  # GraphQL is not in the resume
    assert set(result["missing_keywords"]) == {"GraphQL", "Next.js"}  # PostgreSQL really is there
    assert res.json()["id"] == "row-1"


def test_interview_evaluate_saves_a_recomputed_report(monkeypatch):
    install(monkeypatch)

    async def fake_json(schema, **kwargs):
        return {
            "overall_percentage": 99,
            "communication_level": "Good",
            "communication_feedback": "clear",
            "summary": "ok",
            "strengths": ["Clear"],
            "improvements": ["Depth"],
            "items": [
                {"question": "q", "your_answer": "x", "score": 90, "feedback": "f", "ideal_answer": "i"},
                {"question": "q", "your_answer": "x", "score": 30, "feedback": "f", "ideal_answer": "i"},
            ],
        }

    monkeypatch.setattr(gateway, "complete_json", fake_json)
    res = client.post(
        "/interview",
        json={
            "action": "evaluate",
            "mode": "real",
            "role": "Frontend Engineer",
            "answers": [
                {"question": "Tell me about yourself", "answer": "I build React apps.", "seconds": 30},
                {"question": "Explain your project", "skipped": True},
            ],
            "stats": {"total": 2, "answered": 1, "skipped": 1, "wpm": 110, "fillers": 2},
        },
        headers={"Authorization": "Bearer t"},
    )
    assert res.status_code == 200
    result = res.json()["result"]
    assert result["overall_percentage"] == 45  # (90 + 0) / 2 — the skipped answer scores nothing
    assert result["items"][1]["your_answer"] == "Skipped"
    assert result["stats"]["skipped"] == 1


def test_interview_proctor_needs_an_image(monkeypatch):
    install(monkeypatch)
    res = client.post("/interview", json={"action": "proctor", "image": "not-an-image"}, headers={"Authorization": "Bearer t"})
    assert res.status_code == 400
