import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema = z.object({
  overall_score: z.number(),
  summary: z.string(),
  ats_compatibility: z.number(),
  skills_match: z.number(),
  content_quality: z.number(),
  format_structure: z.number(),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  matched_keywords: z.array(z.string()),
  missing_keywords: z.array(z.string()),
  suggestions: z.array(z.string()),
  improved_bullets: z.array(z.object({ original: z.string(), improved: z.string() })),
});

export const Route = createFileRoute("/api/resume")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { streamText, Output } = await import("ai");
        const gw = await import("@/server/ai-gateway");
        const user = await gw.getUserFromRequest(request);
        if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });
        try {
          const body = await request.json();
          const resume = String(body.resume ?? "").slice(0, 30000);
          const role = String(body.role ?? "").slice(0, 200);
          const jd = String(body.jd ?? "").slice(0, 10000);
          if (resume.trim().length < 100) return Response.json({ error: "Resume text is too short to analyse." }, { status: 400 });
          const { model, runId } = gw.getProvider(request);
          const result = streamText({
            model,
            system: `You analyse resumes strictly from evidence in the provided text. Never invent experience. For improved_bullets, rewrite 3-6 weak bullets from the resume into ATS-friendly, quantified versions without adding facts that are not there (use placeholders like [X%] where a number is needed). Scores are 0-100 and reflect your honest assessment, not a guarantee of ATS results. Each strength/improvement should cite evidence from the resume when possible.`,
            prompt: `Target role: ${role || "not specified (infer best fit)"}\nJob description: ${jd || "not provided"}\n\nRESUME TEXT:\n${resume}`,
            output: Output.object({ schema }),
            abortSignal: request.signal,
            providerOptions: gw.reasoningOptions,
          });
          const out = await result.output;
          const { data, error } = await user.supabase
            .from("resume_analyses")
            .insert({ user_id: user.userId, target_role: role || null, result: out as never })
            .select("id")
            .single();
          if (error) console.error("save analysis", error);
          return gw.withRunId(Response.json({ id: data?.id, result: out }), runId);
        } catch (e) {
          if (e instanceof Response) return e;
          console.error(e);
          return gw.aiErrorResponse(e);
        }
      },
    },
  },
});
