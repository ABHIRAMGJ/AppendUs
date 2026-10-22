# Roadmap

## Done
- Rename product to AppendUs everywhere (logo, titles, emails, AI personas).
- AI service data layer rewritten to Supabase REST + caller token (no DB password needed); render.yaml only needs LOVABLE_API_KEY, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY.
- RPC match_resume_chunks verified; 44 AI-service tests pass; live resume RAG + mentor verified with the owner's session.
- Admin console health tab no longer reports the AI service as broken: "rest" counts as a healthy data layer (was only accepting the old "ok" value).
- Code sync with GitHub confirmed live — repository holds every commit plus a sync-added README.

## Blocked on the user
- Confirm the AI service address (AI_SERVICE_URL) points at your Render URL; the preview in this sandbox still runs a local copy of the service.
