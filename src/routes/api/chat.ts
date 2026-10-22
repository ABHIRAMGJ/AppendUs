import { createFileRoute } from "@tanstack/react-router";

const MODULE_LIST = `Available modules (link with markdown, e.g. [Resume Analyzer](/resume)):
- Dashboard (/dashboard) – progress overview
- Career Path Finder (/career-paths) – explore roles; salary figures are estimates
- Learning Plan (/learning-plan) – AI weekly roadmap
- Resume Analyzer (/resume) – upload PDF/TXT resume + target role, get scores, strengths, gaps, keywords
- Mock Interviews (/interviews) – choose role, type, difficulty; AI interviewer
- Skill Assessments (/assessments) – AI quizzes
- Coding Practice (/coding) – write code, get AI review
- Projects (/projects) – portfolio project tracker
- Job Tracker (/jobs) – application tracker
- Company Prep (/companies) – company interview guides (AI-generated, verify independently)
- AI Mentor (/mentor) – personal career coach with saved threads
- Settings (/settings) – profile, light/dark theme, account
Not available yet: Community (/community) is coming soon. Sign in at /auth.`;

function systemFor(mode: string, extra: Record<string, string | undefined>) {
  if (mode === "interview") {
    return `You are a professional interviewer for AI CareerOS running a mock interview.
Role: ${extra["role"] ?? "Software Engineer"}. Interview type: ${extra["type"] ?? "Technical"}. Difficulty: ${extra["difficulty"] ?? "Medium"}.
Ask ONE question at a time. After the candidate answers, give brief feedback (strengths, what to improve, a model answer outline, a score out of 10), then ask the next question. After 5 questions, give an overall summary with scores for technical knowledge, problem solving, communication. Be encouraging but honest.`;
  }
  if (mode === "quiz") {
    return `You are a skill assessor for AI CareerOS. Topic: ${extra["topic"] ?? "General programming"}. Level: ${extra["level"] ?? "Beginner"}.
Ask ONE multiple-choice question at a time (options A–D). When the user answers, say if it's correct, explain briefly, then ask the next. After 5 questions, report the score and recommend what to study next.`;
  }
  return `You are the AI CareerOS Global Assistant. Help users understand, navigate and use the platform. Be friendly, concise and professional. Use short steps and clickable markdown links to modules.
The user is currently on page: ${extra["page"] ?? "/"}.
${MODULE_LIST}
Clearly distinguish available vs coming-soon features. Never invent features. For deep career coaching, suggest the [AI Mentor](/mentor). If you can't help with an error, suggest refreshing, signing in again, or describing the exact steps.`;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { streamText, convertToModelMessages } = await import("ai");
        const gw = await import("@/server/ai-gateway");
        try {
          const body = await request.json();
          const messages = Array.isArray(body.messages) ? body.messages.slice(-40) : [];
          const mode = typeof body.mode === "string" ? body.mode : "assistant";
          const { model, runId } = gw.getProvider(request);
          const result = streamText({
            model,
            system: systemFor(mode, body.context ?? {}),
            messages: await convertToModelMessages(messages),
            abortSignal: request.signal,
            providerOptions: gw.reasoningOptions,
          });
          return gw.withRunId(result.toUIMessageStreamResponse({ originalMessages: messages }), runId);
        } catch (e) {
          if (e instanceof Response) return e;
          return gw.aiErrorResponse(e);
        }
      },
    },
  },
});
