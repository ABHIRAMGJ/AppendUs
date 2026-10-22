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
  requirements: z.array(z.object({
    requirement: z.string(),
    status: z.enum(["met", "partial", "missing"]),
    evidence_ids: z.array(z.string()),
    explanation: z.string(),
  })),
});

export const Route = createFileRoute("/api/resume")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { streamText, Output } = await import("ai");
        const gw = await import("@/server/ai-gateway");
        const rag = await import("@/server/resume-rag");
        const user = await gw.getUserFromRequest(request);
        if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });
        try {
          const body = await request.json();
          const resume = String(body.resume ?? "").slice(0, 30000);
          const role = String(body.role ?? "").slice(0, 200);
          const jd = String(body.jd ?? "").slice(0, 10000);
          if (resume.trim().length < 100) return Response.json({ error: "Couldn't read enough text from your resume. Please upload a text-based PDF or DOCX." }, { status: 400 });
          if (!role.trim()) return Response.json({ error: "Please enter a target job role." }, { status: 400 });

          const chunks = rag.chunkResume(resume);
          const reqs = rag.splitRequirements(jd, role);
          const retrieved = await rag.retrieve(chunks, reqs);
          const chunkText = chunks.map((c) => `[${c.id}] ${c.text}`).join("\n");
          const evidence = retrieved
            .map((r, i) => `Q${i + 1}. ${r.requirement}\n  retrieved: ${r.evidence.map((e) => `${e.id} (sim ${e.score})`).join(", ")}`)
            .join("\n");

          const { model, runId } = gw.getProvider(request);
          const result = streamText({
            model,
            system: `You analyse resumes strictly from evidence. The resume is split into chunks labelled [R1], [R2]... For each job requirement you are given the resume chunks retrieved as most similar. Judge each requirement ONLY from chunk text: "met" if a chunk clearly shows it, "partial" if related but weaker, "missing" if no chunk supports it. evidence_ids must list only chunk ids that truly support the judgement (empty for missing). Never invent experience. Strengths and improvements should cite chunk ids like (R3). For improved_bullets, rewrite 3-6 weak resume lines into ATS-friendly versions without adding facts (use placeholders like [X%]). Scores are 0-100 honest assessments, not ATS guarantees. Keep requirements in the given order and include every one. In all user-facing text, say "your resume" — never mention chunks, ids or retrieval.`,
            prompt: `Target role: ${role}\nJob description: ${jd || "not provided — requirements derived from the role"}\n\nREQUIREMENTS WITH RETRIEVED EVIDENCE:\n${evidence}\n\nRESUME CHUNKS:\n${chunkText}`,
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
          return gw.withRunId(Response.json({ id: data?.id, result: out, chunks }), runId);
        } catch (e) {
          if (e instanceof Response) return e;
          console.error(e);
          return gw.aiErrorResponse(e);
        }
      },
    },
  },
});
