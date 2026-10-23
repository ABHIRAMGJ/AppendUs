"""The AI provider's own error reason must reach the user, without leaking keys."""

import json

from app import config, gateway


def test_provider_reason_is_shown_with_friendly_wording() -> None:
    body = json.dumps({"error": {"message": "Model 'gemini-2.0-flash' not found.", "status": "NOT_FOUND"}})
    message = gateway.provider_detail(404, body)
    assert "model or endpoint is unavailable" in message
    assert "Provider says:" in message
    assert "gemini-2.0-flash' not found" in message


def test_key_never_leaks_into_the_message() -> None:
    secret = config.GATEWAY_KEY or "test-gateway-key"
    body = json.dumps({"error": {"message": f"bad key {secret}"}})
    message = gateway.provider_detail(401, body)
    assert secret not in message
    assert "[redacted]" in message


def test_plain_body_without_json_still_works() -> None:
    assert gateway.provider_detail(500, "") == gateway.friendly_message(500)
    assert "Provider says: boom" in gateway.provider_detail(500, "boom")
