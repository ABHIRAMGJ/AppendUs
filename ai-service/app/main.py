"""AppendUs AI service — Python + FastAPI.

Every AI feature of the platform is served from here: the Global Assistant, the
AI Mentor, long-form generators, quizzes, resume analysis with pgvector RAG, and
the real/coding mock interviews. The React app only forwards signed-in requests.
"""

from collections.abc import AsyncIterator, Awaitable, Callable, Mapping
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, StreamingResponse

from . import config, db, gateway, prompts, rag, schemas, scoring, streams

@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Free the gateway connection on shutdown."""
    try:
        yield
    finally:
        await gateway.close_client()


app = FastAPI(
    title="AppendUs AI service",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
    lifespan=lifespan,
)

UI_HEADERS = {
    "x-vercel-ai-ui-message-stream": "v1",
    "cache-control": "no-cache",
    "x-accel-buffering": "no",
}


@app.exception_handler(gateway.GatewayError)
async def gateway_error_handler(_: Request, exc: gateway.GatewayError) -> JSONResponse:
    return JSONResponse({"error": exc.message}, status_code=exc.status)


@app.exception_handler(db.StoreError)
async def store_error_handler(_: Request, exc: db.StoreError) -> JSONResponse:
    return JSONResponse(
        {"error": f"Saved data is temporarily unavailable ({exc}). Please try again."}, status_code=503
    )


@app.exception_handler(scoring.QuizInvalid)
async def invalid_reply_handler(_: Request, exc: scoring.QuizInvalid) -> JSONResponse:
    return JSONResponse(
        {"error": f"The AI reply did not meet the requirements ({exc}). Please try again."},
        status_code=502,
    )




# ---------------------------------------------------------------- helpers ----


def text(value: Any, limit: int) -> str:
    return str(value if value is not None else "")[:limit]


def model_messages(messages: Any, limit: int = 40) -> list[dict[str, str]]:
    """Convert UI messages (parts) into the plain shape the model endpoint wants."""
    out: list[dict[str, str]] = []
    for message in messages if isinstance(messages, list) else []:
        if not isinstance(message, Mapping):
            continue
        role = message.get("role")
        if role not in ("user", "assistant", "system"):
            continue
        parts = message.get("parts")
        if isinstance(parts, list):
            body = "".join(
                str(part.get("text") or "")
                for part in parts
                if isinstance(part, Mapping) and part.get("type") == "text"
            )
        else:
            body = str(message.get("content") or "")
        if body.strip():
            out.append({"role": str(role), "content": body[:12000]})
    return out[-limit:]


async def complete_checked(
    schema: dict[str, Any],
    checker: Callable[[dict[str, Any]], dict[str, Any]],
    *,
    system: str,
    prompt: str,
    name: str,
    attempts: int = 3,
) -> dict[str, Any]:
    """Ask the model, then keep retrying until the reply passes the code checks."""
    note = ""
    for attempt in range(attempts):
        brief = prompt if attempt == 0 else f"{prompt}\n\nYour previous reply was rejected: {note}. Fix it."
        value = await gateway.complete_json(schema, system=system, prompt=brief, name=name)
        try:
            return checker(value)
        except scoring.QuizInvalid as exc:
            note = str(exc)
    raise gateway.GatewayError(
        f"The AI reply did not meet the requirements ({note}). Please try again.", 502
    )


async def user_id_from(request: Request) -> str | None:
    """The caller's user id, or None when the bearer token is missing or stale."""
    from . import auth

    user = await auth.user_from_token(auth.bearer(dict(request.headers)))
    return str(user["user_id"]) if user else None


def require_user_id(user_id: str | None) -> str:
    if not user_id:
        raise gateway.GatewayError("Please sign in.", 401)
    return user_id


async def session_from(request: Request) -> tuple[str, str]:
    """(user id, bearer token) for the caller, or 401 when not signed in."""
    from . import auth

    token = auth.bearer(dict(request.headers)) or ""
    user = await auth.user_from_token(token or None)
    if not user:
        raise gateway.GatewayError("Please sign in.", 401)
    return str(user["user_id"]), token


def sse_response(chunks: Awaitable[Any] | Any) -> StreamingResponse:
    return StreamingResponse(chunks, media_type="text/event-stream", headers=UI_HEADERS)


# ----------------------------------------------------------------- health ----


@app.get("/")
async def index() -> dict[str, str]:
    return {"service": "careeros-ai", "runtime": "python-fastapi", "model": config.CHAT_MODEL}


@app.get("/health")
async def health() -> JSONResponse:
    database = "rest" if config.SUPABASE_URL and config.SUPABASE_KEY else "not configured"
    return JSONResponse(
        {
            "status": "ok" if database in ("ok", "rest", "not configured") else "degraded",
            "runtime": "python-fastapi",
            "model": config.CHAT_MODEL,
            "embedding_model": config.EMBED_MODEL,
            "gateway": "configured" if config.GATEWAY_KEY else "missing",
            "database": database,
        }
    )


# ------------------------------------------------------------------ chat ----


@app.post("/chat")
async def chat(request: Request) -> StreamingResponse:
    body = await request.json()
    mode = text(body.get("mode"), 30) or "assistant"
    context = body.get("context") if isinstance(body.get("context"), Mapping) else {}
    system = prompts.system_for(mode, context)
    messages = model_messages(body.get("messages"))
    if not messages:
        raise gateway.GatewayError("Nothing to answer yet.", 400)
    return sse_response(streams.ui_message_parts(gateway.stream_text(system, messages)))


# ---------------------------------------------------------------- mentor ----


@app.post("/mentor")
async def mentor(request: Request) -> StreamingResponse:
    user_id, token = await session_from(request)
    body = await request.json()
    thread_id = text(body.get("id"), 60)
    messages = model_messages(body.get("messages"))
    if not thread_id or not messages:
        raise gateway.GatewayError("Open a conversation first.", 400)

    thread = await db.select_one(token, "mentor_threads", {"id": thread_id, "user_id": user_id}, columns="id,title")
    if not thread:
        raise gateway.GatewayError("Conversation not found.", 404)

    raw = body.get("messages")
    last = raw[-1] if isinstance(raw, list) and raw else None
    now = datetime.now(timezone.utc).isoformat()
    if isinstance(last, Mapping) and last.get("role") == "user":
        await db.insert(token, "mentor_messages", [{"thread_id": thread_id, "user_id": user_id, "message": last}])
        asked = messages[-1]["content"].strip()
        if thread.get("title") == "New conversation" and asked:
            await db.update(token, "mentor_threads", {"id": thread_id}, {"title": asked[:60], "updated_at": now})
        else:
            await db.update(token, "mentor_threads", {"id": thread_id}, {"updated_at": now})

    profile = await db.select_one(token, "profiles", {"id": user_id})
    system = prompts.mentor_system(profile)

    async def persisted() -> Any:
        collected: list[str] = []

        async def tapped() -> Any:
            async for delta in gateway.stream_text(system, messages):
                if delta:
                    collected.append(delta)
                yield delta

        async for part in streams.ui_message_parts(tapped()):
            yield part
        reply = "".join(collected).strip()
        if reply:
            await db.insert(
                token,
                "mentor_messages",
                [{"thread_id": thread_id, "user_id": user_id, "message": {"role": "assistant", "parts": [{"type": "text", "text": reply}]}}],
            )

    return sse_response(persisted())


# ------------------------------------------------------------- generators ----


@app.post("/generate")
async def generate(request: Request) -> StreamingResponse:
    body = await request.json()
    task = text(body.get("task"), 30)
    brief = prompts.brief_for(task, body.get("input"))
    if brief is None:
        raise gateway.GatewayError("Unknown task", 400)
    return StreamingResponse(
        streams.plain_text_stream(gateway.stream_text(prompts.GENERATE_SYSTEM, [{"role": "user", "content": brief}])),
        media_type="text/plain",
    )


# ----------------------------------------------------------------- quiz ----


@app.post("/quiz")
async def quiz(request: Request) -> JSONResponse:
    require_user_id(await user_id_from(request))
    body = await request.json()
    topic = text(body.get("topic"), 100).strip()
    if not topic:
        raise gateway.GatewayError("Topic is required.", 400)
    level = text(body.get("level"), 30).strip() or "Beginner"
    out = await complete_checked(
        schemas.QUIZ_SCHEMA,
        scoring.validate_quiz,
        system=prompts.QUIZ_SYSTEM,
        prompt=f"Topic: {topic}\nLevel: {level}",
        name="quiz",
    )
    return JSONResponse(out)


# ---------------------------------------------------------------- resume ----


@app.post("/resume")
async def resume(request: Request) -> JSONResponse:
    user_id, token = await session_from(request)
    body = await request.json()
    text_resume = text(body.get("resume"), config.MAX_RESUME_CHARS)
    role = text(body.get("role"), 200).strip()
    jd = text(body.get("jd"), 10000)

    if len(text_resume.strip()) < 100:
        raise gateway.GatewayError("Please upload your resume first.", 400)

    evidence = await rag.index_resume(token, user_id, text_resume, role, jd)
    brief = (
        f"Target role: {role or 'not specified (infer best fit)'}\n"
        f"Job description: {jd or 'not provided'}\n\n"
        f"RETRIEVED RESUME EXCERPTS (most relevant to the role):\n{evidence}"
    )
    result = await complete_checked(
        schemas.RESUME_SCHEMA,
        lambda value: scoring.finalize_resume_analysis(value, text_resume),
        system=prompts.RESUME_SYSTEM,
        prompt=brief,
        name="resume_analysis",
    )
    rows = await db.insert(
        token,
        "resume_analyses",
        [{"user_id": user_id, "target_role": role or None, "result": result}],
        returning=True,
    )
    row = rows[0] if rows else None
    return JSONResponse({"id": str(row["id"]) if row else None, "result": result})


# ------------------------------------------------------------ interviews ----


@app.post("/interview")
async def interview(request: Request) -> JSONResponse:
    user_id, token = await session_from(request)
    body = await request.json()
    action = text(body.get("action"), 20)
    mode = "coding" if body.get("mode") == "coding" else "real"
    resume_text = text(body.get("resume"), 12000)
    profile = (
        f"Target role: {text(body.get('role'), 120)}\n"
        f"Approx package: {text(body.get('package'), 60)}\n"
        f"Experience: {text(body.get('experience'), 60)}\n"
        f"Resume:\n{resume_text or 'not provided'}"
    )

    if action == "generate":
        if mode == "coding":
            system, schema = prompts.CODING_GENERATOR, schemas.CODING_QUESTIONS_SCHEMA
        else:
            system, schema = prompts.REAL_INTERVIEW_GENERATOR, schemas.REAL_QUESTIONS_SCHEMA
        out = await complete_checked(
            schema,
            lambda value: scoring.validate_questions(value, mode),
            system=system,
            prompt=profile,
            name="questions",
        )
        return JSONResponse(out)

    if action == "evaluate":
        answers = [a for a in (body.get("answers") or [])[:20] if isinstance(a, Mapping)]
        transcript = "\n\n".join(
            f"Q{index + 1}: {text(a.get('question'), 2000)}\n"
            f"A{index + 1}{f' ({int(float(a.get("seconds") or 0))}s)' if a.get("seconds") else ''}: "
            f"{'[SKIPPED]' if a.get('skipped') else text(a.get('answer'), 6000) or '[NO ANSWER]'}"
            for index, a in enumerate(answers)
        )
        stats = body.get("stats") if isinstance(body.get("stats"), Mapping) else None
        result = await complete_checked(
            schemas.EVALUATION_SCHEMA,
            lambda value: scoring.finalize_interview_eval(value, answers, stats),
            system=prompts.evaluator_system(mode),
            prompt=f"{profile}\n\nTRANSCRIPT:\n{transcript}",
            name="interview_eval",
        )
        rows = await db.insert(
            token,
            "interview_sessions",
            [
                {
                    "user_id": user_id,
                    "mode": mode,
                    "target_role": text(body.get("role"), 120) or None,
                    "package": text(body.get("package"), 60) or None,
                    "experience": text(body.get("experience"), 60) or None,
                    "questions": body.get("questions") or [],
                    "answers": body.get("answers") or [],
                    "result": result,
                    "proctor": body.get("proctor") if body.get("proctor") else None,
                }
            ],
            returning=True,
        )
        row = rows[0] if rows else None
        return JSONResponse({"id": str(row["id"]) if row else None, "result": result})

    if action == "proctor":
        image = text(body.get("image"), 400000)
        if not image.startswith("data:image/"):
            raise gateway.GatewayError("Bad image", 400)
        value = await gateway.complete_json(
            schemas.PROCTOR_SCHEMA,
            system=prompts.PROCTOR_SYSTEM,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Check this frame."},
                        {"type": "image_url", "image_url": {"url": image}},
                    ],
                }
            ],
            name="proctor",
        )
        return JSONResponse(scoring.finalize_proctor(value))

    raise gateway.GatewayError("Unknown action", 400)
