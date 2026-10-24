# Roadmap

## Done
- Rename product to AppendUs everywhere (logo, titles, emails, AI personas).
- AI service on Render with Gemini + backup models; resume RAG, career plan, quiz, chat verified live.
- Email login: clear message for Google-only accounts, Settings password section, safer reset page.
- Google sign-in no longer stuck at the code screen (Google-confirmed email counts as verified).
- Email sign-up falls back to a confirmation link while code emails can't be sent.

## Open
- Switch sender domain from notify.appensus.com (domain doesn't exist) to appendus.work.gd — blocked: user must run the email setup in More → Emails and add the NS records at DNSExit.
- Auth email templates (user request) — blocked on the same working sender domain; scaffold right after setup.
- Speed: Render AI_MODEL to gemini-3.1-flash-lite (user, optional).
