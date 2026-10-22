// Server-only: in-request RAG over a resume. Resume is chunked, JD/role is split
// into requirements, both are embedded, and each requirement retrieves its
// top-matching resume chunks as evidence for the model.
const EMBED_MODEL = "google/gemini-embedding-2";
const GATEWAY = "https://ai.gateway.lovable.dev";

export type Chunk = { id: string; text: string };
export type Retrieved = { requirement: string; evidence: { id: string; score: number }[] };

export function chunkResume(text: string, max = 450): Chunk[] {
  const lines = text.replace(/\r/g, "").split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const chunks: string[] = [];
  let cur = "";
  for (const line of lines) {
    for (let i = 0; i < line.length; i += max) {
      const piece = line.slice(i, i + max);
      if ((cur + " " + piece).length > max && cur) { chunks.push(cur); cur = piece; }
      else cur = cur ? cur + " " + piece : piece;
    }
  }
  if (cur) chunks.push(cur);
  return chunks.slice(0, 80).map((t, i) => ({ id: `R${i + 1}`, text: t }));
}

export function splitRequirements(jd: string, role: string): string[] {
  const parts = jd
    .replace(/\r/g, "")
    .split(/\n|•|·|;|(?<=\.)\s+/)
    .map((s) => s.replace(/^[-*\d.)\s]+/, "").trim())
    .filter((s) => s.length >= 12 && s.length <= 400);
  const uniq = Array.from(new Set(parts)).slice(0, 30);
  if (uniq.length) return uniq;
  return role ? [`Core skills and experience required for a ${role}`, `Projects relevant to ${role}`, `Tools and technologies used by a ${role}`] : [];
}

async function embed(inputs: string[]): Promise<number[][]> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured");
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${GATEWAY}/v1/embeddings`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: EMBED_MODEL, input: inputs }),
    });
    if (res.ok) {
      const j = (await res.json()) as { data: { index: number; embedding: number[] }[] };
      const out: number[][] = Array.from({ length: inputs.length });
      for (const d of j.data) out[d.index] = d.embedding;
      if (out.some((v) => !v)) throw new Error("Embedding response incomplete");
      return out;
    }
    const retry = res.status === 429 || res.status >= 500;
    if (!retry || attempt >= 3) throw new Response(JSON.stringify({ error: `Embedding failed (${res.status})` }), { status: res.status });
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt + Math.random() * 500));
  }
}

function cosine(a: number[], b: number[]) {
  let d = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { const x = a[i] ?? 0, y = b[i] ?? 0; d += x * y; na += x * x; nb += y * y; }
  return d / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

export async function retrieve(chunks: Chunk[], reqs: string[], k = 3): Promise<Retrieved[]> {
  if (!chunks.length || !reqs.length) return [];
  const vecs = await embed([...chunks.map((c) => c.text), ...reqs]);
  const cv = vecs.slice(0, chunks.length);
  const rv = vecs.slice(chunks.length);
  return reqs.map((requirement, i) => ({
    requirement,
    evidence: cv
      .map((v, j) => ({ id: chunks[j]?.id ?? "", score: Math.round(cosine(rv[i] ?? [], v) * 100) / 100 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k),
  }));
}
