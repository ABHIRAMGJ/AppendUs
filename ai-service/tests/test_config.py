"""Provider resolution: Lovable gateway in the preview, Gemini direct on Render."""

import importlib

from app import config


def test_gemini_provider_when_no_gateway_key(monkeypatch):
    monkeypatch.delenv("LOVABLE_API_KEY", raising=False)
    monkeypatch.setenv("GEMINI_API_KEY", "g-key")
    try:
        reloaded = importlib.reload(config)
        assert reloaded.AI_PROVIDER == "gemini"
        assert reloaded.GATEWAY_KEY == "g-key"
        assert "generativelanguage" in reloaded.GATEWAY_BASE
        assert reloaded.CHAT_MODEL.startswith("gemini-")
        assert reloaded.EMBED_MODEL == "gemini-embedding-001"
        assert reloaded.REASONING_EFFORT == ""
    finally:
        monkeypatch.delenv("GEMINI_API_KEY")
        importlib.reload(config)


def test_gateway_provider_prefers_lovable_key(monkeypatch):
    monkeypatch.setenv("LOVABLE_API_KEY", "lovable-key")
    monkeypatch.setenv("GEMINI_API_KEY", "g-key")
    try:
        reloaded = importlib.reload(config)
        assert reloaded.AI_PROVIDER == "lovable"
        assert reloaded.GATEWAY_KEY == "lovable-key"
        assert reloaded.CHAT_MODEL == config._get("AI_CHAT_MODEL", "openai/gpt-6-astra")
    finally:
        monkeypatch.delenv("GEMINI_API_KEY")
        importlib.reload(config)


def test_none_provider_when_no_keys(monkeypatch):
    monkeypatch.delenv("LOVABLE_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    try:
        reloaded = importlib.reload(config)
        assert reloaded.AI_PROVIDER == "none"
        assert reloaded.GATEWAY_KEY == ""
    finally:
        importlib.reload(config)
