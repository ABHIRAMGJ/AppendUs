import { createFileRoute } from "@tanstack/react-router";
import type { UIMessage } from "ai";

const MENTOR_SYSTEM = `You are CareerOS AI Mentor — a personalised, honest career coach for students, graduates, job seekers and career switchers (with strong knowledge of the Indian education system and global tech careers).
You cover: career paths after 10th, Intermediate/12th, Diploma, B.Tech/Bachelor's, MBA, M.Tech, postgraduate study, work experience and career changes; programming languages (Python, Java, JavaScript, TypeScript, C, C++, C#, Go, Rust, PHP, SQL, HTML/CSS); data structures & algorithms; web and mobile development; databases; cloud, DevOps, CI/CD; data science, ML, GenAI, RAG; cybersecurity; system design; soft skills; resumes, interviews and job search.
Teach step-by-step at the user's level, give exercises, build daily/weekly learning plans, run quick quizzes and mock interview questions when asked.
Rules: never invent job listings, salaries (give clearly labelled rough ranges only), certifications or facts. Say when you're unsure. Keep answers well-structured with markdown headings, lists and code blocks.
Platform links you can suggest: [Learning Plan](/learning-plan), [Resume Analyzer](/resume), [Mock Interviews](/interviews), [Coding Practice](/coding), [Job Tracker](/jobs).`;

export const Route = createFileRoute("/api/mentor")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { streamText, convertToModelMessages } = await import("ai");
        const gw = await import("@/server/ai-gateway");
        const user = await gw.getUserFromRequest(request);
        if (!user) return new Response(JSON.stringify({ error: "Please sign in." }), { status: 401 });
        try {
          const body = await request.json();
          const threadId: string = body.id;
          const messages: UIMessage[] = Array.isArray(body.messages) ? body.messages : [];
          const { data: thread } = await user.supabase
            .from("mentor_threads").select("id,title").eq("id", threadId).maybeSingle();
          if (!thread) return new Response(JSON.stringify({ error: "Conversation not found." }), { status: 404 });

          const last = messages[messages.length - 1];
          if (last?.role === "user") {
            const { error } = await user.supabase.from("mentor_messages").insert({
              thread_id: threadId, user_id: user.userId, message: last as never,
            });
            if (error) console.error("save user message", error);
            const text = last.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ").trim();
            const upd: { updated_at: string; title?: string } = { updated_at: new Date().toISOString() };
            if (thread.title === "New conversation" && text) upd.title = text.slice(0, 60);
            await user.supabase.from("mentor_threads").update(upd).eq("id", threadId);
          }

          const { data: profile } = await user.supabase
            .from("profiles").select("*").eq("id", user.userId).maybeSingle();
          const profileText = profile
            ? `\nUser profile: name=${profile.full_name ?? "unknown"}, education=${profile.education_level ?? "unknown"}, target role=${profile.target_role ?? "unknown"}, current skills=${profile.skills ?? "unknown"}, weekly study hours=${profile.weekly_hours ?? "unknown"}.`
            : "";

          const { model, runId } = gw.getProvider(request);
          const result = streamText({
            model,
            system: MENTOR_SYSTEM + profileText,
            messages: await convertToModelMessages(messages.slice(-40)),
            abortSignal: request.signal,
            providerOptions: gw.reasoningOptions,
          });
          return gw.withRunId(
            result.toUIMessageStreamResponse({
              originalMessages: messages,
              onFinish: async ({ responseMessage }) => {
                const { error } = await user.supabase.from("mentor_messages").insert({
                  thread_id: threadId, user_id: user.userId, message: responseMessage as never,
                });
                if (error) console.error("save assistant message", error);
              },
            }),
            runId,
          );
        } catch (e) {
          if (e instanceof Response) return e;
          return gw.aiErrorResponse(e);
        }
      },
    },
  },
});
