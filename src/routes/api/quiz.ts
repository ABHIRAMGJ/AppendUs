import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const quizSchema = z.object({
  questions: z.array(z.object({
    question: z.string(),
    options: z.array(z.string()).length(4),
    correct_index: z.number().int().min(0).max(3),
    explanation: z.string(),
  })).length(5),
});

export const Route = createFileRoute("/api/quiz")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { streamText, Output } = await import("ai");
        const gw = await import("@/server/ai-gateway");
        const user = await gw.getUserFromRequest(request);
        if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });
        try {
          const body = await request.json();
          const topic = String(body.topic ?? "").slice(0, 100);
          const level = String(body.level ?? "").slice(0, 30);
          if (!topic) return Response.json({ error: "Topic is required." }, { status: 400 });
          const { model, runId } = gw.getProvider(request);
          const result = streamText({
            model,
            system: `You create skill assessment quizzes. Write exactly 5 multiple-choice questions on the given topic at the given level. Each question has exactly 4 options, one correct answer (correct_index 0-3) and a short explanation of why the answer is correct. Questions must test real understanding, be unambiguous, and have exactly one defensible correct option. Never repeat questions.`,
            prompt: `Topic: ${topic}\nLevel: ${level || "Beginner"}`,
            output: Output.object({ schema: quizSchema }),
            abortSignal: request.signal,
            providerOptions: gw.reasoningOptions,
          });
          const out = await result.output;
          return gw.withRunId(Response.json(out), runId);
        } catch (e) {
          if (e instanceof Response) return e;
          console.error(e);
          return gw.aiErrorResponse(e);
        }
      },
    },
  },
});
