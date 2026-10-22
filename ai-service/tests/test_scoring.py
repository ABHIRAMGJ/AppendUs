from pytest import raises

from app import scoring


def test_scores_are_clamped_to_a_real_percentage():
    assert scoring.clamp_score(72.6) == 73
    assert scoring.clamp_score(-40) == 0
    assert scoring.clamp_score(400) == 100
    assert scoring.clamp_score("not a number") == 0
    assert scoring.clamp_score(float("nan")) == 0


def test_resume_overall_score_is_recomputed_from_its_parts():
    result = {
        "overall_score": 99,
        "ats_compatibility": 100,
        "skills_match": 80,
        "content_quality": 60,
        "format_structure": 40,
        "strengths": [],
        "improvements": [],
        "matched_keywords": [],
        "missing_keywords": [],
        "suggestions": [],
        "improved_bullets": [],
        "summary": "ok",
    }
    out = scoring.finalize_resume_analysis(result, "Built a React dashboard")
    assert out["overall_score"] == 70  # mean of the four parts, not the model's 99


def test_keywords_are_checked_against_the_actual_resume():
    resume = "Built a React dashboard with PostgreSQL and pgvector."
    result = {
        "overall_score": 50,
        "summary": "s",
        "ats_compatibility": 50,
        "skills_match": 50,
        "content_quality": 50,
        "format_structure": 50,
        "strengths": ["Reacts to feedback", "Reacts to feedback"],
        "improvements": ["Add metrics"],
        "matched_keywords": ["React", "GraphQL", "Kubernetes"],
        "missing_keywords": ["PostgreSQL", "Next.js"],
        "suggestions": [],
        "improved_bullets": [],
    }
    out = scoring.finalize_resume_analysis(result, resume)

    # A keyword that is not really in the resume cannot be reported as a match,
    # and it must show up as missing instead.
    assert out["matched_keywords"] == ["React"]
    assert set(out["missing_keywords"]) == {"GraphQL", "Kubernetes", "Next.js"}
    # "Reacts" is not the term "React" on its own, and duplicates are dropped.
    assert out["strengths"] == ["Reacts to feedback"]


def test_improved_bullets_are_deduplicated_and_capped():
    result = {
        "overall_score": 50,
        "summary": "s",
        "ats_compatibility": 50,
        "skills_match": 50,
        "content_quality": 50,
        "format_structure": 50,
        "strengths": [],
        "improvements": [],
        "matched_keywords": [],
        "missing_keywords": [],
        "suggestions": [],
        "improved_bullets": [
            {"original": "Did stuff", "improved": "Cut load time 40%"},
            {"original": "did stuff", "improved": "duplicate"},
            {"original": "", "improved": "no original"},
        ]
        + [{"original": f"task {i}", "improved": f"did {i}"} for i in range(10)],
    }
    out = scoring.finalize_resume_analysis(result, "resume text")
    assert len(out["improved_bullets"]) == scoring.BULLET_LIMIT
    assert out["improved_bullets"][0]["original"] == "Did stuff"
    assert all(b["original"] for b in out["improved_bullets"])


def test_interview_percentage_is_recomputed_and_answers_kept_verbatim():
    answers = [
        {"question": "Tell me about yourself", "answer": "I am ABHI, I built 3 React apps.", "seconds": 40},
        {"question": "Explain your project", "skipped": True},
        {"question": "What is polymorphism", "answer": "One interface, many forms.", "seconds": 25},
    ]
    model = {
        "overall_percentage": 99,
        "communication_level": "fluent-ish",
        "communication_feedback": "clear",
        "summary": "ok",
        "strengths": ["Clear"],
        "improvements": ["Depth"],
        "items": [
            {"question": "x", "your_answer": "paraphrased!", "score": 180, "feedback": "f", "ideal_answer": "i"},
            {"question": "y", "your_answer": "should not matter", "score": 12, "feedback": "f", "ideal_answer": "i"},
            {"question": "z", "your_answer": "nope", "score": 40, "feedback": "f", "ideal_answer": "i"},
        ],
    }
    out = scoring.finalize_interview_eval(model, answers, {"total": 3, "answered": 2, "skipped": 1, "wpm": 96, "fillers": 4})

    assert out["items"][0]["your_answer"] == "I am ABHI, I built 3 React apps."  # verbatim
    assert out["items"][1]["your_answer"] == "Skipped"
    assert out["items"][0]["score"] == 100  # 180 clamped
    assert out["overall_percentage"] == 47  # (100 + 0 + 40) / 3, not the model's 99
    assert out["communication_level"] == "Fluent"
    assert out["stats"] == {"total": 3, "answered": 2, "skipped": 1, "wpm": 96, "fillers": 4}


def test_communication_level_is_forced_into_the_four_allowed_values():
    assert scoring.finalize_interview_eval({"communication_level": "Beginner"}, [])["communication_level"] == "Beginner"
    assert scoring.finalize_interview_eval({"communication_level": "ADVANCED"}, [])["communication_level"] == "Good"
    assert scoring.finalize_interview_eval({"communication_level": "nonsense"}, [])["communication_level"] == "Intermediate"


def test_quiz_must_be_five_questions_four_options_one_answer():
    good = {
        "questions": [
            {
                "question": f"Q{i}",
                "options": ["a", "b", "c", "d"],
                "correct_index": 1,
                "explanation": "because",
            }
            for i in range(5)
        ]
    }
    assert scoring.validate_quiz(good)["questions"][0]["question"] == "Q0"

    with raises(scoring.QuizInvalid):
        scoring.validate_quiz({"questions": good["questions"][:4]})
    with raises(scoring.QuizInvalid):
        scoring.validate_quiz(
            {"questions": [{**good["questions"][0], "options": ["a", "a", "c", "d"]} for _ in range(5)]}
        )
    with raises(scoring.QuizInvalid):
        scoring.validate_quiz(
            {"questions": [{**good["questions"][0], "correct_index": 7} for _ in range(5)]}
        )
    with raises(scoring.QuizInvalid):
        scoring.validate_quiz(
            {"questions": [dict(good["questions"][0]) for _ in range(5)]}  # same question repeated
        )


def test_coding_questions_must_be_easy_medium_hard_in_order():
    problems = [
        {"difficulty": d, "title": f"T{d}", "statement": f"S{d}", "examples": "x"}
        for d in ("Easy", "Medium", "Hard")
    ]
    assert scoring.validate_questions({"questions": problems}, "coding")["questions"][2]["difficulty"] == "Hard"

    with raises(scoring.QuizInvalid):
        scoring.validate_questions({"questions": list(reversed(problems))}, "coding")
    with raises(scoring.QuizInvalid):
        scoring.validate_questions({"questions": problems[:2]}, "coding")


def test_real_interview_questions_need_sections():
    out = scoring.validate_questions(
        {"questions": [{"section": "Introduction", "question": "Tell me about yourself"} for _ in range(6)]},
        "real",
    )
    assert len(out["questions"]) == 6
    with raises(scoring.QuizInvalid):
        scoring.validate_questions({"questions": [{"section": "", "question": "x"} for _ in range(6)]}, "real")


def test_proctor_flags_are_strict_booleans():
    assert scoring.finalize_proctor({"phone_visible": 1, "face_visible": None, "multiple_people": "yes"}) == {
        "phone_visible": True,
        "face_visible": False,
        "multiple_people": True,
    }
