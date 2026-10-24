<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- All AI work (chat, mentor, generation, quizzes, resume RAG, interview scoring) runs in the Python + FastAPI service in ai-service/; the app only proxies to it from src/routes/api/* — keeps the model key server-side and out of the app bundle.
- Signed-in pages live under src/routes/_authenticated/ and render inside AppShell — one gate and one sidebar for the app.
- Module list for sidebar and Global Assistant comes from src/lib/platform.ts — single source for what is available vs coming soon.
- Admin access uses the user_roles table + has_role() in RLS; never store roles on profiles — prevents privilege escalation.
- Colors only via semantic tokens in src/styles.css with light and .dark values — every page must work in both themes.
- Email ownership is proven once, server-side (src/lib/signup.functions.ts): our 6-digit code when the managed sender can deliver, otherwise Cloud Auth's confirmation link; Google and link-confirmed accounts count via email_confirmed_at (auto-confirm stays off). EmailGate in AppShell blocks the app until a row exists in email_verified, which only server code writes — keeps sign-up working while the sender domain is unverified.
- The Python AI service deploys to Render via render.yaml (Docker, listens on $PORT); the app reaches it through the AI_SERVICE_URL secret.
- Render explicitly selects Gemini via AI_PROVIDER; UI chat streams encode provider failures as safe error events because HTTP exception handlers cannot run after streaming starts.
- Render chat model selection uses AI_MODEL, matching the Python default and Blueprint configuration; legacy AI_CHAT_MODEL cannot override Gemini, preventing stale hosting settings from selecting a retired model.
- The Python service never connects to Postgres directly (Lovable Cloud gives no DB password); all data access goes through Supabase REST with the caller's own bearer token, so RLS decides visibility. Vector search uses the public.match_resume_chunks RPC (auth.uid()-scoped, SECURITY INVOKER).

