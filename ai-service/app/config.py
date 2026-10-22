"""Environment configuration for the AppendUs AI service (Python + FastAPI)."""

import os


def _get(name: str, default: str = "") -> str:
    value = os.environ.get(name)
    return value if value else default


# Lovable AI Gateway — the only place the AI key is read.
GATEWAY_BASE = _get("AI_GATEWAY_BASE", "https://ai.gateway.lovable.dev/v1")
GATEWAY_KEY = _get("LOVABLE_API_KEY")
CHAT_MODEL = _get("AI_CHAT_MODEL", "openai/gpt-6-astra")
EMBED_MODEL = _get("AI_EMBED_MODEL", "google/gemini-embedding-2")
EMBED_DIMS = 3072
REASONING_EFFORT = _get("AI_REASONING_EFFORT", "low")

# Backend used for session verification and the application database.
SUPABASE_URL = _get("SUPABASE_URL")
SUPABASE_KEY = _get("SUPABASE_PUBLISHABLE_KEY")
DB_URL = _get("SUPABASE_DB_URL")

EMBED_BATCH = 16
MAX_RESUME_CHARS = 30000
MAX_CHUNKS = 60
