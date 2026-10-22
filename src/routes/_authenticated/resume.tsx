import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, FileText, Upload, XCircle } from "lucide-react";
import { PageHeader } from "@/components/app/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { authHeaders } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/resume")({
  head: () => ({ meta: [{ title: "AI Resume Analyzer — AI CareerOS" }, { name: "description", content: "Get evidence-based resume feedback for your target role." }] }),
  component: Resume,
});

type Result = {
  overall_score: number; summary: string; ats_compatibility: number; skills_match: number;
  content_quality: number; format_structure: number; strengths: string[]; improvements: string[];
  matched_keywords: string[]; missing_keywords: string[]; suggestions: string[];
};

async function extractPdf(file: File) {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  let out = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const c = await page.getTextContent();
    out += c.items.map((it) => ("str" in it ? it.str : "")).join(" ") + "\n";
  }
  return out;
}

function ScoreRing({ v }: { v: number }) {
  const r = 52, c = 2 * Math.PI * r;
  return (
    <div className="relative h-36 w-36 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} stroke="var(--muted)" strokeWidth="10" fill="none" />
        <circle cx="60" cy="60" r={r} stroke="var(--success)" strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * v) / 100} />
      </svg>
      <div className="absolute inset-0 grid place-items-center"><p className="font-display text-3xl font-bold">{v}<span className="text-sm text-muted-foreground">/100</span></p></div>
    </div>
  );
}

function Resume() {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [role, setRole] = useState("");
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(f?: File) {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error("File is larger than 5MB"); return; }
    try {
      const t = f.type === "application/pdf" || f.name.endsWith(".pdf") ? await extractPdf(f) : await f.text();
      if (t.trim().length < 50) { toast.error("Couldn't read text from this file. Try pasting your resume text instead."); return; }
      setText(t);
      setFileName(f.name);
    } catch {
      toast.error("Couldn't read this file. Please upload a text-based PDF or TXT.");
    }
  }

  async function analyze() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/resume", {
        method: "POST",
        headers: { "content-type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ resume: text, role, jd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setResult(data.result);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const subs = result ? [
    ["ATS Compatibility", result.ats_compatibility], ["Skills Match", result.skills_match],
    ["Content Quality", result.content_quality], ["Format & Structure", result.format_structure],
  ] as const : [];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader icon={FileText} title="AI Resume Analyzer" description="Get instant feedback and improve your resume" />
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="surface h-fit space-y-4 p-6">
          <button type="button" onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }}
            className="w-full rounded-xl border-2 border-dashed border-primary/40 bg-accent/40 p-6 text-center transition-colors hover:bg-accent">
            <Upload className="mx-auto h-8 w-8 text-primary" />
            <p className="mt-2 font-semibold">{fileName || "Upload your resume"}</p>
            <p className="text-xs text-muted-foreground">Drag & drop or click. PDF or TXT (max 5MB)</p>
          </button>
          <input ref={inputRef} type="file" accept=".pdf,.txt,.md" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          <div className="space-y-1.5"><Label>Or paste resume text</Label><Textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste your resume..." /></div>
          <div className="space-y-1.5"><Label>Target job role (optional)</Label><Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Software Engineer" /></div>
          <div className="space-y-1.5"><Label>Job description (optional)</Label><Textarea rows={3} value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste a job description for a precise match" /></div>
          <Button variant="hero" className="w-full" disabled={loading || text.trim().length < 100} onClick={analyze}>
            {loading ? "Analyzing..." : "Analyze Resume"}
          </Button>
        </div>

        <div className="surface min-h-[420px] p-6">
          {loading && <Shimmer>Reading your resume and comparing it to the role...</Shimmer>}
          {!loading && !result && <p className="text-sm text-muted-foreground">Upload or paste your resume to see your score, strengths, gaps and keyword match. Feedback is based only on what your resume says.</p>}
          {result && (
            <Tabs defaultValue="analysis">
              <TabsList><TabsTrigger value="analysis">Analysis</TabsTrigger><TabsTrigger value="suggestions">Suggestions</TabsTrigger><TabsTrigger value="keywords">Keywords</TabsTrigger></TabsList>
              <TabsContent value="analysis" className="space-y-6 pt-4">
                <div className="flex flex-col items-center gap-6 sm:flex-row">
                  <ScoreRing v={result.overall_score} />
                  <div><h3 className="text-lg font-semibold">Overall Score</h3><p className="text-sm text-muted-foreground">{result.summary}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {subs.map(([l, v]) => (
                    <div key={l} className="rounded-xl bg-muted p-3"><p className="text-xs text-muted-foreground">{l}</p><p className="font-display text-xl font-bold text-primary">{v}<span className="text-xs text-muted-foreground">/100</span></p></div>
                  ))}
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div><h4 className="mb-2 font-semibold">Key Strengths</h4><ul className="space-y-2 text-sm">{result.strengths.map((s) => <li key={s} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />{s}</li>)}</ul></div>
                  <div><h4 className="mb-2 font-semibold">Areas to Improve</h4><ul className="space-y-2 text-sm">{result.improvements.map((s) => <li key={s} className="flex gap-2"><XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />{s}</li>)}</ul></div>
                </div>
              </TabsContent>
              <TabsContent value="suggestions" className="pt-4">
                <ol className="list-decimal space-y-2 pl-5 text-sm">{result.suggestions.map((s) => <li key={s}>{s}</li>)}</ol>
              </TabsContent>
              <TabsContent value="keywords" className="space-y-4 pt-4">
                <div><h4 className="mb-2 font-semibold">Found in your resume</h4><div className="flex flex-wrap gap-2">{result.matched_keywords.map((k) => <Badge key={k} className="bg-success/15 text-success" variant="secondary">{k}</Badge>)}</div></div>
                <div><h4 className="mb-2 font-semibold">Missing keywords</h4><div className="flex flex-wrap gap-2">{result.missing_keywords.map((k) => <Badge key={k} className="bg-destructive/15 text-destructive" variant="secondary">{k}</Badge>)}</div></div>
              </TabsContent>
              <p className="mt-6 text-xs text-muted-foreground">Scores are an AI assessment, not a guarantee of ATS outcomes.</p>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
