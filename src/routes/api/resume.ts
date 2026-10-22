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

const EMBEDDING_MODEL = "google/gemini-embedding-2";
const EMBEDDING_DIMS = 3072;

/** Rough token estimate: ~4 chars per token. */
const countTokens = (text: string) => Math.max(1, Math.ceil(text.length / 4));

/** Split resume text into chunks on paragraph/line boundaries, ~1200 tokens max with light overlap. */
function chunkResume(text: string, maxTokens = 1200): string[] {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const line of lines) {
    const candidate = current ? `${current}\n${line}` : line;
    if (countTokens(candidate) > maxTokens && current) {
      chunks.push(current);
      current = line;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  // Split any still-oversized chunk hard by characters.
  const out: string[] = [];
  for (const c of chunks) {
    if (countTokens(c) <= maxTokens) { out.push(c); continue; }
    const maxChars = maxTokens * 4;
    for (let i = 0; i < c.length; i += maxChars) out.push(c.slice(i, i + maxChars));
  }
  return out.filter((c) => c.trim().length > 0).slice(0, 60);
}

async function embedTexts(texts: string[]): Promise<number[][]> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Response("AI is not configured", { status: 401 });
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: texts }),
  });
  if (!res.ok) {
    const err = new Error(`Embeddings failed: ${res.status}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  const json = (await res.json()) as { data: { index: number; embedding: number[] }[] };
  const ordered: (number[] | undefined)[] = Array.from({ length: texts.length });
  for (const item of json.data) ordered[item.index] = item.embedding;
  return ordered.map((v) => {
    if (!v || v.length !== EMBEDDING_DIMS) throw new Error("Invalid embedding response");
    return v;
  });
}

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
          if (resume.trim().length < 100) return Response.json({ error: "Please upload your resume first." }, { status: 400 });

          // --- RAG: chunk, embed, store, retrieve ---
          const chunks = chunkResume(resume);
          const query = `Target role: ${role || "general"}\nJob description: ${jd || "not provided"}`;
          const [chunkVectors, [queryVector]] = await Promise.all([
            embedTexts(chunks),
            embedTexts([query]),
          ]);

          // Replace this user's stored chunks with the latest upload.
          await user.supabase.from("resume_chunks").delete().eq("user_id", user.userId);
          const { error: insertError } = await user.supabase.from("resume_chunks").insert(
            chunks.map((content, i) => ({
              user_id: user.userId,
              content,
              embedding: JSON.stringify(chunkVectors[i]),
              metadata: { index: i, role: role || null },
            })) as never,
          );
          if (insertError) console.error("store chunks", insertError);

          const { data: matches, error: matchError } = await user.supabase.rpc("match_resume_chunks", {
            query_embedding: JSON.stringify(queryVector) as never,
            match_count: Math.min(10, chunks.length),
          });
          if (matchError) console.error("match chunks", matchError);
          const retrieved = (matches ?? []) as { content: string; similarity: number }[];
          const evidence = retrieved.length
            ? retrieved.map((m, i) => `[Excerpt ${i + 1} | relevance ${m.similarity.toFixed(2)}]\n${m.content}`).join("\n\n---\n\n")
            : resume.slice(0, 12000);

          const { model, runId } = gw.getProvider(request);
          const result = streamText({
            model,
            system: `You analyse resumes strictly from evidence in the provided excerpts, which were retrieved by semantic search against the target role and job description. Never invent experience. For improved_bullets, rewrite 3-6 weak bullets from the excerpts into ATS-friendly, quantified versions without adding facts that are not there (use placeholders like [X%] where a number is needed). Scores are 0-100 and reflect your honest assessment, not a guarantee of ATS results. Each strength/improvement should cite evidence from the excerpts when possible.`,
            prompt: `Target role: ${role || "not specified (infer best fit)"}\nJob description: ${jd || "not provided"}\n\nRETRIEVED RESUME EXCERPTS (most relevant to the role):\n${evidence}`,
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
