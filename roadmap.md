# Roadmap

## Done
- Rename product to AppendUs everywhere (logo, titles, emails, AI personas).
- AI service data layer rewritten to Supabase REST + caller token (no DB password needed); render.yaml only needs LOVABLE_API_KEY, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY.
- RPC match_resume_chunks verified; 44 AI-service tests pass; live resume RAG + mentor verified with the owner's session.
- Admin console health tab no longer reports the AI service as broken: "rest" counts as a healthy data layer (was only accepting the old "ok" value).
- AI service now supports two providers: the Lovable gateway (preview) and Google Gemini direct (GEMINI_API_KEY) for Render, since LOVABLE_API_KEY is managed and cannot be copied out of the project. render.yaml asks for GEMINI_API_KEY instead. 47 tests pass.
- Code sync with GitHub confirmed live — repository holds every commit plus a sync-added README.

## Blocked on the user
- Get a free Gemini API key at aistudio.google.com → Get API key, then create the Render blueprint: Render → New → Blueprint → this repo → paste the Gemini key, the backend URL and the publishable key when asked.
- Send the Render URL of the AI service so AI_SERVICE_URL can point the app at it (the preview in this sandbox still runs a local copy of the service).
