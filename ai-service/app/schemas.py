"""Strict JSON schemas for the model replies. Shape is checked here, meaning is checked in scoring.py."""

_STRICT = {"additionalProperties": False}


def _obj(properties: dict[str, dict]) -> dict:
    return {
        "type": "object",
        "properties": properties,
        "required": list(properties),
        "additionalProperties": False,
    }


STRING = {"type": "string"}
NUMBER = {"type": "number"}
INTEGER = {"type": "integer"}
BOOLEAN = {"type": "boolean"}
STRINGS = {"type": "array", "items": STRING}

RESUME_SCHEMA = _obj(
    {
        "overall_score": NUMBER,
        "summary": STRING,
        "ats_compatibility": NUMBER,
        "skills_match": NUMBER,
        "content_quality": NUMBER,
        "format_structure": NUMBER,
        "strengths": STRINGS,
        "improvements": STRINGS,
        "matched_keywords": STRINGS,
        "missing_keywords": STRINGS,
        "suggestions": STRINGS,
        "improved_bullets": {
            "type": "array",
            "items": _obj({"original": STRING, "improved": STRING}),
        },
    }
)

QUIZ_SCHEMA = _obj(
    {
        "questions": {
            "type": "array",
            "items": _obj(
                {
                    "question": STRING,
                    "options": {"type": "array", "items": STRING},
                    "correct_index": INTEGER,
                    "explanation": STRING,
                }
            ),
        }
    }
)

REAL_QUESTIONS_SCHEMA = _obj(
    {
        "questions": {
            "type": "array",
            "items": _obj({"section": STRING, "question": STRING}),
        }
    }
)

CODING_QUESTIONS_SCHEMA = _obj(
    {
        "questions": {
            "type": "array",
            "items": _obj(
                {"difficulty": STRING, "title": STRING, "statement": STRING, "examples": STRING}
            ),
        }
    }
)

EVALUATION_SCHEMA = _obj(
    {
        "overall_percentage": NUMBER,
        "communication_level": STRING,
        "communication_feedback": STRING,
        "summary": STRING,
        "strengths": STRINGS,
        "improvements": STRINGS,
        "items": {
            "type": "array",
            "items": _obj(
                {
                    "question": STRING,
                    "your_answer": STRING,
                    "score": NUMBER,
                    "feedback": STRING,
                    "ideal_answer": STRING,
                }
            ),
        },
    }
)

PROCTOR_SCHEMA = _obj(
    {"phone_visible": BOOLEAN, "face_visible": BOOLEAN, "multiple_people": BOOLEAN}
)
