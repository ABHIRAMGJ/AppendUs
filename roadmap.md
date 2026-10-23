# Roadmap

## Done
- Rename product to AppendUs everywhere (logo, titles, emails, AI personas).
- AI service data layer rewritten to Supabase REST + caller token (no DB password needed); render.yaml only needs LOVABLE_API_KEY, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY.
- RPC match_resume_chunks verified; 44 AI-service tests pass; live resume RAG + mentor verified with the owner's session.
- Admin console health tab no longer reports the AI service as broken: "rest" counts as a healthy data layer (was only accepting the old "ok" value).
- AI service now supports two providers: the Lovable gateway (preview) and Google Gemini direct (GEMINI_API_KEY) for Render, since LOVABLE_API_KEY is managed and cannot be copied out of the project. render.yaml asks for GEMINI_API_KEY instead. 47 tests pass.
- Code sync with GitHub confirmed live — repository holds every commit plus a sync-added README.

- Email login: clear message for Google-only accounts, Settings password section, safer reset page; tested end-to-end with a temporary account.
- App connected to the live AI service (AI_SERVICE_URL set).

## Pending live deployment
- Live verification: Render now reports gemini-2.5-flash. Signed-in sample resume reached model generation in 5.6 seconds; direct vector search returned the sample evidence successfully (HTTP 200, similarity 1). Diagnostic rows removed afterward. Full resume scoring and reply speed blocked: Google returns 404 because this model is no longer available to new users. Await an authorized supported model selection and Render settings update before retesting.
- Stuck AI model fix is deployed with the updated model; successful live reply speed remains unverified because Google rejects that model before generation.
- Full test pass (all pages, login, hydration fix on home page).
- Backup models handle busy responses, but intentionally do not retry a terminal 404 model rejection; the primary model setting must be corrected before live testing resumes.
- Recorded graphlib page error investigated: likely Mermaid integration, but not reproduced during this signed-in resume check; no speculative dependency change made.
- Publish the app (user).
- Blocked: email codes only reach gjabhiram001@gmail.com until the user verifies a domain in Resend and gives the sender address.
