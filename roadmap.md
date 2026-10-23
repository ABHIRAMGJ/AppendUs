# Roadmap

## Done
- Rename product to AppendUs everywhere (logo, titles, emails, AI personas).
- AI service data layer rewritten to Supabase REST + caller token (no DB password needed); render.yaml only needs LOVABLE_API_KEY, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY.
- RPC match_resume_chunks verified; 44 AI-service tests pass; live resume RAG + mentor verified with the owner's session.
- Admin console health tab no longer reports the AI service as broken: "rest" counts as a healthy data layer (was only accepting the old "ok" value).
- AI service now supports two providers: the Lovable gateway (preview) and Google Gemini direct (GEMINI_API_KEY) for Render, since LOVABLE_API_KEY is managed and cannot be copied out of the project. render.yaml asks for GEMINI_API_KEY instead. 47 tests pass.
- Code sync with GitHub confirmed live — repository holds every commit plus a sync-added README.

## Pending live deployment
- Replace the retired Gemini model with gemini-3.8-flash in Python defaults and the Render blueprint; verify the updated deployment's provider-test returns a real answer.
- Verify a real AI answer on https://appendus-ai-service.onrender.com, then configure AI_SERVICE_URL and publish the app connection.
