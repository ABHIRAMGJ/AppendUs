"""Provider resolution: Lovable gateway in the preview, Gemini direct on Render."""

import importlib

from app import config


def test_render_explicit_gemini_overrides_gateway(monkeypatch):
    with monkeypatch.context() as env:
        env.setenv("AI_PROVIDER", "gemini")
        env.setenv("LOVABLE_API_KEY", "test-gateway")
        env.setenv("GEMINI_API_KEY", "test-gemini")
        env.delenv("AI_CHAT_MODEL", raising=False)
        env.delenv("AI_GATEWAY_BASE", raising=False)
        current = importlib.reload(config)
        assert current.AI_PROVIDER == "gemini"
        assert current.CHAT_MODEL == "gemini-2.0-flash"
        assert current.GATEWAY_KEY == "test-gemini"
        assert current.GATEWAY_BASE == "https://generativelanguage.googleapis.com/v1beta/openai"
    importlib.reload(config)


def test_explicit_gemini_does_not_fall_back_to_wrong_key(monkeypatch):
    with monkeypatch.context() as env:
        env.setenv("AI_PROVIDER", "gemini")
        env.setenv("LOVABLE_API_KEY", "test-gateway")
        env.delenv("GEMINI_API_KEY", raising=False)
        current = importlib.reload(config)
        assert current.AI_PROVIDER == "gemini"
        assert current.GATEWAY_KEY == ""
    importlib.reload(config)


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
        monkeypatch.undo()
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
        monkeypatch.undo()
        importlib.reload(config)


def test_none_provider_when_no_keys(monkeypatch):
    monkeypatch.delenv("LOVABLE_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    try:
        reloaded = importlib.reload(config)
        assert reloaded.AI_PROVIDER == "none"
        assert reloaded.GATEWAY_KEY == ""
    finally:
        monkeypatch.undo()
        importlib.reload(config)
