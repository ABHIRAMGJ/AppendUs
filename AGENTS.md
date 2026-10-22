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
- Email sign-up uses our own 6-digit codes (src/lib/signup.functions.ts, signup_codes table with no client policies) sent via Resend; the account is created only after the code is verified and a password is set — keeps unverified emails out.
