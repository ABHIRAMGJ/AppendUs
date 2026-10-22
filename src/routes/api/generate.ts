import { createFileRoute } from "@tanstack/react-router";

type In = Partial<Record<"role" | "level" | "hours" | "weeks" | "skills" | "company" | "language" | "problem" | "code", string>>;
const TASKS: Record<string, (i: In) => string> = {
  plan: (i) => `Create a personalised learning plan.
Goal role: ${i.role}. Current level: ${i.level}. Hours per week: ${i.hours}. Duration: ${i.weeks} weeks. Existing skills: ${i.skills || "none listed"}.
Format in markdown: a short overview, then phases (### Phase N — title (Weeks x–y)) each with topics, a hands-on project, and free resource types (no fake URLs). Then a "This week" day-by-day plan (Mon–Sun) fitting the hours. End with milestones to prove skills.`,
  company: (i) => `Write an interview preparation guide for ${i.company}${i.role ? ` for the role ${i.role}` : ""}.
Markdown sections: Overview, Typical interview process (say it may vary and should be verified), Topics to prepare, 8 sample questions with short answer hints, Culture & values tips, 2-week prep checklist. Do not invent precise statistics.`,
  code: (i) => `Review this ${i.language} solution to the problem "${i.problem}".
\`\`\`${i.language}
${i.code}
\`\`\`
Markdown: Verdict (likely correct / has bugs), Bugs or edge cases, Time & space complexity, Improved solution in a code block, Tips. Be concise. You cannot run code — say this is a static review.`,
  career: (i) => `Explain the career path for "${i.role}" for someone in India and globally.
Markdown: What they do, Required skills (technical + soft), Education routes (after 12th, diploma, B.Tech, career switch), Step-by-step 6-12 month roadmap, Portfolio project ideas, Typical entry salary range in India (clearly marked as a rough estimate that varies), Growth path. Keep it practical.`,
};

export const Route = createFileRoute("/api/generate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { streamText } = await import("ai");
        const gw = await import("@/server/ai-gateway");
        try {
          const body = await request.json();
          const make = TASKS[body.task as string];
          if (!make) return new Response(JSON.stringify({ error: "Unknown task" }), { status: 400 });
          const input: Record<string, string> = {};
          for (const [k, v] of Object.entries(body.input ?? {})) input[k] = String(v).slice(0, 12000);
          const { model, runId } = gw.getProvider(request);
          const result = streamText({
            model,
            system: "You are CareerOS, an honest, practical career and learning expert. Never fabricate sources, links, job listings or statistics.",
            prompt: make(input as In),
            abortSignal: request.signal,
            providerOptions: gw.reasoningOptions,
          });
          return gw.withRunId(result.toTextStreamResponse(), runId);
        } catch (e) {
          if (e instanceof Response) return e;
          return gw.aiErrorResponse(e);
        }
      },
    },
  },
});
