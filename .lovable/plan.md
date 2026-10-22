# AI CareerOS — Full platform UI (light + dark) with working AI chatbots

Matches your showcase image: blue-to-violet brand, rounded cards, clean dashboards, every page in both light and dark mode with a toggle in the header (remembers your choice, follows system by default).

## Design
- Light: soft white/lavender surfaces, royal blue primary, violet accent. Dark: deep navy surfaces, glowing blue/violet accents.
- Fonts: Sora (headings) + Manrope (body). Rounded 14px cards, soft shadows, progress rings, small charts.
- AI-generated hero illustration (student with laptop + floating "Apply/Learn" chips) like your image.
- Fully responsive with collapsible sidebar.

## Pages
Public:
1. Landing — hero, stats, features, career journey, modules, FAQ, footer.
2. Sign up / Sign in (email + Google), Email verification screen, Forgot/Reset password.

Signed-in (sidebar app):
3. Dashboard — welcome, today's progress, module shortcuts, growth chart, Mentor card.
4. Career Path Finder — search + category filters (Technology, Business, Healthcare, Creative, Government), role cards with demand, salary range, timeline; detail page per role.
5. Learning Plan — roadmap phases (accordion), daily plan, progress, resources.
6. Resume Analyzer — upload PDF/DOCX + target role; AI results: overall score, sub-scores, strengths, areas to improve, keywords.
7. Mock Interviews — choose role, type, difficulty; AI asks questions and gives feedback.
8. Skill Assessments / Coding Practice — problem list, code editor, AI review of solutions.
9. Projects / Portfolio Builder — add and manage projects.
10. Job Tracker — your applications with status (Applied, Interview, Offer, Rejected), counts.
11. Company Preparation — company list with interview process tips (AI-generated, marked as such).
12. AI Mentor — full-page coach with saved conversation threads.
13. Community — marked "Coming soon" (needs moderation/safety work first).
14. Settings — profile, theme, account, delete data.

Global Assistant: floating chat button on every page with quick actions and links to pages.

## Honesty rules (from your brief)
No fake job listings, salaries labelled as estimates, no fake scores — scores come only from real AI analysis of your resume. Empty states instead of made-up data.

## Technical details
- Lovable Cloud: auth, profiles, career goals, learning plans, resumes (private file storage), analyses, interviews, projects, job applications, mentor threads/messages — all per-user access rules.
- Lovable AI (default model, streamed) for Mentor, Assistant, resume analysis, interviews, code review, plan generation.
- Theme via `.dark` class + semantic tokens; no hardcoded colors.
- Built in steps: design system + landing + auth → app shell + dashboard → chatbots → each module.
