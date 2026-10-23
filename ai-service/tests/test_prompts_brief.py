"""Generation briefs must survive whatever input shape the caller sends."""

from app import prompts


def test_career_brief_accepts_object_input():
    brief = prompts.brief_for("career", {"role": "Frontend Developer"})
    assert brief is not None
    assert "Frontend Developer" in brief


def test_career_brief_accepts_bare_string_input():
    brief = prompts.brief_for("career", "Frontend Developer")
    assert brief is not None
    assert "Frontend Developer" in brief


def test_brief_for_ignores_unusable_input():
    for value in (None, 7, ["x"], {"role": None}):
        brief = prompts.brief_for("career", value)
        assert isinstance(brief, str)
        assert brief


def test_unknown_task_returns_none():
    assert prompts.brief_for("nope", "anything") is None


def test_long_input_is_truncated():
    brief = prompts.brief_for("career", {"role": "x" * 50000}, limit=200)
    assert "x" * 200 in brief
    assert "x" * 201 not in brief
