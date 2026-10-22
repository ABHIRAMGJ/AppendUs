import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const realQs = z.object({
  questions: z.array(z.object({ section: z.string(), question: z.string() })),
});
const codingQs = z.object({
  questions: z.array(z.object({
    difficulty: z.string(), title: z.string(), statement: z.string(), examples: z.string(),
  })),
});
const evaluation = z.object({
  overall_percentage: z.number(),
  communication_level: z.string(),
  communication_feedback: z.string(),
  summary: z.string(),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  items: z.array(z.object({
    question: z.string(), your_answer: z.string(), score: z.number(), feedback: z.string(), ideal_answer: z.string(),
  })),
});
const proctor = z.object({ phone_visible: z.boolean(), face_visible: z.boolean(), multiple_people: z.boolean() });

const s = (v: unknown, n: number) => String(v ?? "").slice(0, n);

export const Route = createFileRoute("/api/interview")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { streamText, Output } = await import("ai");
        const gw = await import("@/server/ai-gateway");
        const user = await gw.getUserFromRequest(request);
        if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });
        try {
          const body = await request.json();
          const action = s(body.action, 20);
          const { model, runId } = gw.getProvider(request);
          const opts = { abortSignal: request.signal, providerOptions: gw.reasoningOptions, model };
          const profile = `Target role: ${s(body.role, 120)}\nApprox package: ${s(body.package, 60)}\nExperience: ${s(body.experience, 60)}\nResume:\n${s(body.resume, 12000) || "not provided"}`;

          if (action === "generate") {
            const coding = body.mode === "coding";
            const r = streamText({
              ...opts,
              system: coding
                ? `You are a technical interviewer. Write exactly 3 coding problems for the candidate's role and experience: one "Easy", one "Medium", one "Hard" (in that order). Difficulty must match the package and experience. Each has a clear statement and 1-2 input/output examples. Problems must be solvable in any common language.`
                : `You are a real interviewer for the given role. Write 10-12 questions in this order and with these section names: "Introduction" (1 question: tell me about yourself), "Project Explanation" (2-3 questions about specific projects named in the resume; if none, ask about one project they built), "Role Questions" (3-4 questions core to the target role), "OOPs" (2 questions), "SQL" (2 questions), and "React" (1-2 questions) ONLY if React appears in the resume or the role. Never ask questions from unrelated domains. Calibrate depth to the experience level and package: freshers get fundamentals, experienced candidates get practical/design depth. One question per item, concise, spoken-style.`,
              prompt: profile,
              output: Output.object({ schema: (coding ? codingQs : realQs) as typeof realQs }),
            });
            return gw.withRunId(Response.json(await r.output), runId);
          }

          if (action === "evaluate") {
            const qa = (Array.isArray(body.answers) ? body.answers : []).slice(0, 20)
              .map((a: { question?: string; answer?: string; skipped?: boolean }, i: number) =>
                `Q${i + 1}: ${s(a.question, 2000)}\nA${i + 1}: ${a.skipped ? "[SKIPPED]" : s(a.answer, 6000) || "[NO ANSWER]"}`).join("\n\n");
            const coding = body.mode === "coding";
            const r = streamText({
              ...opts,
              system: `You evaluate a mock ${coding ? "coding" : ""} interview honestly. Score each answer 0-100 (skipped or empty = 0). overall_percentage is the weighted average 0-100. ${coding ? "Judge code for correctness, edge cases and complexity by reading it; do not claim you executed it. ideal_answer should be a short correct approach with code." : "ideal_answer is a strong model answer in 2-5 sentences."} communication_level must be one of "Beginner", "Intermediate", "Good", "Fluent", based on grammar, clarity and structure of the answers (spoken answers are speech-to-text, ignore transcription punctuation). Keep your_answer as the candidate's answer verbatim (or "Skipped").`,
              prompt: `${profile}\n\nTRANSCRIPT:\n${qa}`,
              output: Output.object({ schema: evaluation }),
            });
            const out = await r.output;
            const { data } = await user.supabase.from("interview_sessions").insert({
              user_id: user.userId, mode: coding ? "coding" : "real",
              target_role: s(body.role, 120), package: s(body.package, 60), experience: s(body.experience, 60),
              questions: body.questions ?? [], answers: body.answers ?? [], result: out as never, proctor: body.proctor ?? null,
            }).select("id").single();
            return gw.withRunId(Response.json({ id: data?.id, result: out }), runId);
          }

          if (action === "proctor") {
            const image = s(body.image, 400000);
            if (!image.startsWith("data:image/")) return Response.json({ error: "Bad image" }, { status: 400 });
            const r = streamText({
              ...opts,
              providerOptions: { openai: { ...gw.reasoningOptions.openai, reasoningEffort: "low" } },
              system: `You are an exam proctor looking at a webcam frame. phone_visible is true only if a mobile phone is clearly visible. face_visible true if a person's face is visible. multiple_people true if more than one person is visible.`,
              messages: [{ role: "user", content: [{ type: "text", text: "Check this frame." }, { type: "image", image }] }],
              output: Output.object({ schema: proctor }),
            });
            return gw.withRunId(Response.json(await r.output), runId);
          }
          return Response.json({ error: "Unknown action" }, { status: 400 });
        } catch (e) {
          if (e instanceof Response) return e;
          console.error(e);
          return gw.aiErrorResponse(e);
        }
      },
    },
  },
});
