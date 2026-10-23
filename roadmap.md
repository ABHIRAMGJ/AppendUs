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
- Backup models added: when the main Gemini model is busy, the service automatically tries gemini-3.7-flash, gemini-3.5-flash, gemini-2.5-flash, gemini-2.5-flash-lite (chat, JSON and the live self-check). Baked into render.yaml; 61 tests pass. Waiting for Render's auto-deploy, then re-test the live service.
- Publish the app (user).
- Blocked: email codes only reach gjabhiram001@gmail.com until the user verifies a domain in Resend and gives the sender address.
