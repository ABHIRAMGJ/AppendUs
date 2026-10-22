"""Deterministic accuracy layer: the model proposes, code verifies and recomputes.

Anything that can be checked without an AI call is checked here, so a reply can
never contain a score, keyword or answer that contradicts the evidence.
"""

import re
from collections.abc import Mapping, Sequence
from typing import Any

from .prompts import COMMUNICATION_LEVELS

BULLET_LIMIT = 6
SCORE_FIELDS = ("ats_compatibility", "skills_match", "content_quality", "format_structure")


def clamp_score(value: Any, default: float = 0.0) -> int:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return int(default)
    if number != number:  # NaN
        return int(default)
    return max(0, min(100, int(round(number))))


def _clean_list(value: Any, limit: int = 20) -> list[str]:
    if not isinstance(value, Sequence) or isinstance(value, str):
        return []
    out: list[str] = []
    for item in value:
        text = str(item or "").strip()
        if text and text.lower() not in {o.lower() for o in out}:
            out.append(text[:600])
        if len(out) >= limit:
            break
    return out


def contains_term(text: str, term: str) -> bool:
    """True when `term` really appears in `text` (word-ish, ignores punctuation)."""
    term = str(term or "").strip()
    if not term:
        return False
    pattern = r"\b" + r"\b".join(re.escape(word) for word in re.split(r"\s+", term) if word) + r"\b"
    return re.search(pattern, text, re.IGNORECASE) is not None


def finalize_resume_analysis(result: Mapping[str, Any], resume_text: str) -> dict[str, Any]:
    """Recompute the score from its parts and prove every keyword against the resume."""
    out = dict(result)
    parts = {field: clamp_score(out.get(field)) for field in SCORE_FIELDS}
    out.update(parts)
    out["overall_score"] = int(round(sum(parts.values()) / len(parts)))

    matched_claim = _clean_list(out.get("matched_keywords"), 40)
    matched = [k for k in matched_claim if contains_term(resume_text, k)]
    # Anything the model claimed as a match but that is not really in the resume is missing.
    not_in_resume = [k for k in matched_claim if not contains_term(resume_text, k)]

    missing: list[str] = []
    for keyword in _clean_list(out.get("missing_keywords"), 40) + not_in_resume:
        if contains_term(resume_text, keyword):
            continue
        if keyword.lower() not in {m.lower() for m in missing}:
            missing.append(keyword)

    out["matched_keywords"] = matched
    out["missing_keywords"] = missing
    out["strengths"] = _clean_list(out.get("strengths"))
    out["improvements"] = _clean_list(out.get("improvements"))
    out["suggestions"] = _clean_list(out.get("suggestions"))

    bullets: list[dict[str, str]] = []
    seen: set[str] = set()
    for item in out.get("improved_bullets") or []:
        if not isinstance(item, Mapping):
            continue
        original = str(item.get("original") or "").strip()
        improved = str(item.get("improved") or "").strip()
        if not original or not improved or original.lower() in seen:
            continue
        seen.add(original.lower())
        bullets.append({"original": original[:600], "improved": improved[:600]})
        if len(bullets) >= BULLET_LIMIT:
            break
    out["improved_bullets"] = bullets
    out["summary"] = str(out.get("summary") or "").strip()[:1200]
    return out


def _normalise_level(value: Any) -> str:
    text = str(value or "").strip().lower()
    for level in COMMUNICATION_LEVELS:
        if level.lower() == text:
            return level
    if "flu" in text:
        return "Fluent"
    if "good" in text or "advanc" in text or "proficien" in text:
        return "Good"
    if "inter" in text or "middl" in text:
        return "Intermediate"
    if "beg" in text or "basic" in text:
        return "Beginner"
    return "Intermediate"


def finalize_interview_eval(
    result: Mapping[str, Any],
    answers: Sequence[Mapping[str, Any]],
    stats: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    """Keep answers verbatim, clamp every score and recompute the percentage in code."""
    out = dict(result)
    items: list[dict[str, Any]] = []
    raw_items = out.get("items") if isinstance(out.get("items"), Sequence) else []

    for index, answer in enumerate(answers):
        source = raw_items[index] if isinstance(raw_items, Sequence) and index < len(raw_items) else {}
        question = str(answer.get("question") or (source or {}).get("question") or "")[:2000]
        given = "Skipped" if answer.get("skipped") else (str(answer.get("answer") or "").strip() or "No answer")
        items.append(
            {
                "question": question,
                "your_answer": given[:6000],
                # A skipped answer scores nothing, however generous the model was.
                "score": 0 if answer.get("skipped") else clamp_score((source or {}).get("score")),
                "feedback": str((source or {}).get("feedback") or "").strip()[:1200],
                "ideal_answer": str((source or {}).get("ideal_answer") or "").strip()[:2000],
            }
        )

    out["items"] = items
    out["overall_percentage"] = (
        int(round(sum(item["score"] for item in items) / len(items))) if items else 0
    )
    out["communication_level"] = _normalise_level(out.get("communication_level"))
    out["communication_feedback"] = str(out.get("communication_feedback") or "").strip()[:1200]
    out["summary"] = str(out.get("summary") or "").strip()[:1500]
    out["strengths"] = _clean_list(out.get("strengths"))
    out["improvements"] = _clean_list(out.get("improvements"))

    if isinstance(stats, Mapping):
        out["stats"] = {
            "total": int(float(stats.get("total") or 0)),
            "answered": int(float(stats.get("answered") or 0)),
            "skipped": int(float(stats.get("skipped") or 0)),
            "wpm": int(float(stats.get("wpm") or 0)),
            "fillers": int(float(stats.get("fillers") or 0)),
        }
    return out


class QuizInvalid(ValueError):
    pass


def validate_quiz(result: Mapping[str, Any]) -> dict[str, Any]:
    """Exactly 5 unambiguous questions, 4 distinct options, one defensible answer."""
    questions = result.get("questions")
    if not isinstance(questions, list) or len(questions) != 5:
        raise QuizInvalid("exactly 5 questions are required")

    out: list[dict[str, Any]] = []
    seen_questions: set[str] = set()
    for index, item in enumerate(questions):
        if not isinstance(item, Mapping):
            raise QuizInvalid(f"question {index + 1} is not an object")
        text = str(item.get("question") or "").strip()
        if not text:
            raise QuizInvalid(f"question {index + 1} is empty")
        if text.lower() in seen_questions:
            raise QuizInvalid(f"question {index + 1} repeats an earlier question")
        seen_questions.add(text.lower())

        options = item.get("options")
        if not isinstance(options, list) or len(options) != 4:
            raise QuizInvalid(f"question {index + 1} needs exactly 4 options")
        cleaned = [str(option or "").strip() for option in options]
        if any(not option for option in cleaned):
            raise QuizInvalid(f"question {index + 1} has an empty option")
        if len({option.lower() for option in cleaned}) != 4:
            raise QuizInvalid(f"question {index + 1} has duplicate options")

        try:
            correct = int(item.get("correct_index"))  # type: ignore[arg-type]
        except (TypeError, ValueError):
            raise QuizInvalid(f"question {index + 1} has no correct index") from None
        if not 0 <= correct <= 3:
            raise QuizInvalid(f"question {index + 1} correct index is out of range")

        out.append(
            {
                "question": text[:600],
                "options": [option[:200] for option in cleaned],
                "correct_index": correct,
                "explanation": str(item.get("explanation") or "").strip()[:600],
            }
        )
    return {"questions": out}


def validate_questions(result: Mapping[str, Any], mode: str) -> dict[str, Any]:
    """Trim model-generated question sets to something the UI can actually run."""
    raw = result.get("questions")
    if not isinstance(raw, list) or not raw:
        raise QuizInvalid("the AI did not return any questions")

    if mode == "coding":
        wanted = ("Easy", "Medium", "Hard")
        out = []
        for item in raw[:3]:
            if not isinstance(item, Mapping):
                continue
            out.append(
                {
                    "difficulty": str(item.get("difficulty") or "").strip()[:20],
                    "title": str(item.get("title") or "").strip()[:160],
                    "statement": str(item.get("statement") or "").strip()[:4000],
                    "examples": str(item.get("examples") or "").strip()[:3000],
                }
            )
        if len(out) != 3:
            raise QuizInvalid("exactly 3 problems (Easy, Medium, Hard) are required")
        for index, problem in enumerate(out):
            if problem["difficulty"].capitalize() != wanted[index]:
                raise QuizInvalid(f"problem {index + 1} must be {wanted[index]}")
            if not problem["title"] or not problem["statement"]:
                raise QuizInvalid(f"problem {index + 1} is incomplete")
        return {"questions": out}

    out = []
    for item in raw[:14]:
        if not isinstance(item, Mapping):
            continue
        question = str(item.get("question") or "").strip()
        section = str(item.get("section") or "").strip()[:40]
        if not question or not section:
            continue
        out.append({"section": section, "question": question[:1500]})
    if len(out) < 5:
        raise QuizInvalid("at least 5 questions are required")
    return {"questions": out}


def finalize_proctor(result: Mapping[str, Any]) -> dict[str, bool]:
    return {
        "phone_visible": bool(result.get("phone_visible")),
        "face_visible": bool(result.get("face_visible")),
        "multiple_people": bool(result.get("multiple_people")),
    }
