# AI CareerOS — Phase 1: Premium foundation + two working AI chatbots

The uploaded brief covers dozens of modules. Building them all at once would produce a pretty but non-working prototype (which the brief forbids). Phase 1 delivers a polished, professional product shell plus the two chatbots fully working. Later phases add each module (Resume Analyzer with RAG, Learning Planner, Interview Studio, Job Tracker, etc.) one at a time.

## Visual direction
- "Editorial tech" look: deep ink navy background sections, warm ivory surfaces, a single electric-teal accent with amber highlights. No purple gradients.
- Fonts: Sora (headings) + Manrope (body).
- Subtle grid textures, soft shadows, smooth entrance animations, light and dark mode.
- Fully responsive (mobile, tablet, desktop), keyboard accessible.

## Pages
1. Landing page (/) — hero with headline and call to action, the career journey ("Goal → Gaps → Learn → Prove → Interview → Apply"), module showcase, skills & domains coverage, how the AI works (evidence over claims), FAQ, footer.
2. Sign up / Sign in (email + Google).
3. Dashboard (signed in) — sidebar navigation listing every module; modules not built yet are clearly marked "Coming soon" (no fake data, no dead buttons).
4. Mentor page — full-screen CareerOS AI Mentor with saved conversation threads.
5. Profile — name, education level, target role, current skills, weekly time available (used by the Mentor to personalise answers).

## Chatbot 1 — Global Assistant
- Floating button on every page; slide-out chat panel.
- Knows the platform's modules, what's available vs. coming soon, and the current page.
- Quick actions: "Find a feature", "Explain this page", "Help me troubleshoot".
- Answers include clickable links to pages. Streaming replies, clear chat. One conversation per browser.

## Chatbot 2 — CareerOS AI Mentor
- Personal career coach using the user's saved profile.
- Covers the full skills list from your document (languages, DSA, web, data/AI, cloud/DevOps, security, career paths after 10th/Inter/Diploma/B.Tech/MBA etc.).
- Teaches, quizzes, builds study plans, mock interview questions; says clearly when it is unsure.
- Threaded conversations saved to your account, each with its own link; rename/delete threads.

## Technical details
- Lovable Cloud: auth, profiles, mentor_threads, mentor_messages tables with per-user access rules.
- Lovable AI Gateway, default model, streamed responses via server routes; keys server-side only.
- AI Elements chat components with markdown rendering, suggested prompts, stop button, error states (credits/rate limit shown clearly).
- Per-route SEO titles/descriptions.

## Later phases (not in this build)
Resume Analyzer (upload + RAG), Learning Planner, Skill Assessments, Interview Studio, Portfolio Builder, Job Tracker, Company Prep, admin console, CI/CD and testing hardening.
