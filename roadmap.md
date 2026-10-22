# Roadmap

## Done
- Rename product to AppendUs everywhere (logo, titles, emails, AI personas).
- AI service data layer rewritten to Supabase REST + caller token (no DB password needed); render.yaml only needs LOVABLE_API_KEY, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY.
- RPC match_resume_chunks verified; 44 AI-service tests pass; live resume RAG + mentor verified with the owner's session.

## Blocked on the user
- Render deploy: needs a free Render account connected to the GitHub repo, then Blueprint deploy with LOVABLE_API_KEY; send the resulting URL back so AI_SERVICE_URL can be set.
- Publish the app after AI_SERVICE_URL is set.
