from app import prompts


def test_unknown_generation_task_has_no_brief():
    assert prompts.brief_for("nope", {}) is None


def test_every_supported_task_builds_a_brief():
    inputs = {
        "plan": {"role": "Data Analyst", "level": "Beginner", "hours": "10", "days": "90"},
        "company": {"company": "Zoho", "role": "SDE-1"},
        "code": {"language": "python", "problem": "Two sum", "code": "print(1)"},
        "pathways": {"stage": "After 12th", "interest": "coding"},
        "career": {"role": "DevOps Engineer"},
    }
    for task, values in inputs.items():
        brief = prompts.brief_for(task, values)
        assert brief and len(brief) > 40, task


def test_brief_inputs_are_truncated():
    brief = prompts.brief_for("career", {"role": "x" * 50000}, limit=500)
    assert "x" * 501 not in brief


def test_assistant_prompt_shows_the_current_page_and_module_links():
    system = prompts.assistant_system({"page": "/resume"})
    assert "/resume" in system
    assert "coming soon" in system.lower()


def test_mentor_prompt_uses_the_saved_profile():
    system = prompts.mentor_system({"full_name": "ABHI", "target_role": "Frontend Engineer", "weekly_hours": 12})
    assert "ABHI" in system
    assert "Frontend Engineer" in system
    assert "12" in system


def test_mentor_prompt_without_a_profile_is_still_coherent():
    assert "CareerOS AI Mentor" in prompts.mentor_system(None)


def test_coding_evaluator_says_it_cannot_run_the_code():
    assert "static" not in prompts.evaluator_system("real")
    assert "do not claim you executed it" in prompts.evaluator_system("coding")


def test_interview_modes_get_different_system_prompts():
    assert "interviewer" in prompts.system_for("interview", {"role": "SDE-1"}).lower()
    assert "multiple-choice" in prompts.system_for("quiz", {"topic": "SQL"}).lower()
    assert "Global Assistant" in prompts.system_for("assistant", {})
