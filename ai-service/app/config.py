"""Environment configuration for the AppendUs AI service (Python + FastAPI)."""

import os


def _get(name: str, default: str = "") -> str:
    value = os.environ.get(name)
    return value if value else default


# AI provider, resolved once at import:
# 1. Lovable AI Gateway (LOVABLE_API_KEY) — used in the Lovable preview/sandbox.
# 2. Google Gemini direct (GEMINI_API_KEY) — used on external hosts such as Render,
#    where the managed Lovable key cannot be copied out of the project.
_gateway_key = _get("LOVABLE_API_KEY")
_gemini_key = _get("GEMINI_API_KEY")

if _gateway_key:
    AI_PROVIDER = "lovable"
    GATEWAY_BASE = _get("AI_GATEWAY_BASE", "https://ai.gateway.lovable.dev/v1")
    GATEWAY_KEY = _gateway_key
    CHAT_MODEL = _get("AI_CHAT_MODEL", "openai/gpt-6-astra")
    EMBED_MODEL = _get("AI_EMBED_MODEL", "google/gemini-embedding-2")
    REASONING_EFFORT = _get("AI_REASONING_EFFORT", "low")
elif _gemini_key:
    # Gemini's OpenAI-compatible endpoint: same request shapes, Bearer auth.
    AI_PROVIDER = "gemini"
    GATEWAY_BASE = _get("AI_GATEWAY_BASE", "https://generativelanguage.googleapis.com/v1beta/openai")
    GATEWAY_KEY = _gemini_key
    CHAT_MODEL = _get("AI_CHAT_MODEL", "gemini-2.5-flash")
    EMBED_MODEL = _get("AI_EMBED_MODEL", "gemini-embedding-001")
    REASONING_EFFORT = ""  # not part of Gemini's OpenAI-compatible chat payload
else:
    AI_PROVIDER = "none"
    GATEWAY_BASE = _get("AI_GATEWAY_BASE", "https://ai.gateway.lovable.dev/v1")
    GATEWAY_KEY = ""
    CHAT_MODEL = _get("AI_CHAT_MODEL", "openai/gpt-6-astra")
    EMBED_MODEL = _get("AI_EMBED_MODEL", "google/gemini-embedding-2")
    REASONING_EFFORT = ""

# Backend used for session verification and RLS-scoped data access.
SUPABASE_URL = _get("SUPABASE_URL")
SUPABASE_KEY = _get("SUPABASE_PUBLISHABLE_KEY")

EMBED_BATCH = 16
MAX_RESUME_CHARS = 30000
MAX_CHUNKS = 60
