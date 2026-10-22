import { createFileRoute } from "@tanstack/react-router";
import React, { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Mic, MicOff, Code2, Users, Upload, FileText, Volume2, SkipForward, ArrowRight, Camera, ShieldAlert, Timer, CheckCircle2, History,
} from "lucide-react";
import { PageHeader } from "@/components/app/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { authHeaders } from "@/lib/data";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/interviews")({
  head: () => ({ meta: [
    { title: "AI Mock Interview — AI CareerOS" },
    { name: "description", content: "Voice mock interviews and proctored coding rounds built from your resume and target role." },
    { property: "og:title", content: "AI Mock Interview — AI CareerOS" },
    { property: "og:description", content: "Voice mock interviews and proctored coding rounds with scored feedback." },
  ] }),
  component: Interviews,
});

type Mode = "real" | "coding";
type RealQ = { section: string; question: string };
type CodeQ = { difficulty: string; title: string; statement: string; examples: string };
type Answer = { question: string; answer: string; skipped: boolean };
type Result = {
  overall_percentage: number; communication_level: string; communication_feedback: string; summary: string;
  strengths: string[]; improvements: string[];
  items: { question: string; your_answer: string; score: number; feedback: string; ideal_answer: string }[];
};

async function call<T>(payload: Record<string, unknown>): Promise<T> {
  const res = await fetch("/api/interview", {
    method: "POST", headers: { "content-type": "application/json", ...(await authHeaders()) }, body: JSON.stringify(payload),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error ?? "Something went wrong");
  return j as T;
}

async function readResume(f: File) {
  const n = f.name.toLowerCase();
  if (n.endsWith(".pdf")) {
    const pdfjs = await import("pdfjs-dist");
    const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const doc = await pdfjs.getDocument({ data: await f.arrayBuffer() }).promise;
    let out = "";
    for (let i = 1; i <= doc.numPages; i++) {
      const c = await (await doc.getPage(i)).getTextContent();
      out += c.items.map((it) => ("str" in it ? it.str : "")).join(" ") + "\n";
    }
    return out;
  }
  if (n.endsWith(".docx")) return (await (await import("mammoth")).extractRawText({ arrayBuffer: await f.arrayBuffer() })).value;
  return f.text();
}

function speak(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return resolve();
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.98; u.lang = "en-IN";
    u.onend = () => resolve(); u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = any;
function useDictation(onFinal: (t: string) => void) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const rec = useRef<Rec>(null);
  const want = useRef(false);
  const cb = useRef(onFinal); cb.current = onFinal;
  const supported = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  function boot() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const W = window as any;
    const SR = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = "en-IN"; r.continuous = true; r.interimResults = true;
    r.onresult = (e: Rec) => {
      let fin = "", mid = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) fin += e.results[i][0].transcript + " "; else mid += e.results[i][0].transcript;
      }
      if (fin) cb.current(fin);
      setInterim(mid);
    };
    r.onerror = (e: Rec) => { if (e.error === "not-allowed") { want.current = false; toast.error("Microphone permission was denied."); } };
    r.onend = () => { setInterim(""); if (want.current) { try { r.start(); } catch { /* ignore */ } } else setListening(false); };
    try { r.start(); } catch { /* ignore */ }
    rec.current = r; setListening(true);
  }
  function start() {
    if (!supported) { toast.error("Voice answers need Chrome or Edge."); return; }
    want.current = true; if (!rec.current) boot(); else setListening(true);
  }
  function stop() { want.current = false; rec.current?.stop(); rec.current = null; setListening(false); setInterim(""); }
  useEffect(() => () => { want.current = false; rec.current?.stop(); }, []);
  return { listening, interim, start, stop, supported };
}

function useProctor(stream: MediaStream, video: React.RefObject<HTMLVideoElement | null>, onBlocked: () => void) {
  const proc = useProctor(stream, video, onBlocked);
  const clock = useClock(true);

  const q = qs[active]!;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="surface space-y-4 p-6">
        <div className="flex flex-wrap gap-2">{qs.map((x, k) => (
          <Button key={k} size="sm" variant={k === active ? "default" : "outline"} onClick={() => setActive(k)}>{k + 1}. {x.difficulty}{code[k]!.trim() && " ✓"}</Button>
        ))}</div>
        <div><p className="font-display text-xl font-semibold">{q.title}</p><p className="mt-2 whitespace-pre-wrap text-sm">{q.statement}</p>
          <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs">{q.examples}</pre></div>
        <div className="flex items-center gap-3"><Label>Language</Label>
          <Select value={lang} onValueChange={setLang}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{["JavaScript", "Python", "Java", "C++", "C"].map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select></div>
        <Textarea rows={14} className="font-mono text-sm" value={code[active]} placeholder="// Write your solution here"
          onChange={(e) => setCode(code.map((c, k) => (k === active ? e.target.value : c)))} />
        <div className="flex justify-end gap-2">
          {active < qs.length - 1 && <Button variant="outline" onClick={() => setActive(active + 1)}>Next problem <ArrowRight /></Button>}
          <Button variant="hero" onClick={() => onSubmit(qs.map((x, k) => ({ question: `${x.difficulty}: ${x.title}\n${x.statement}`, answer: code[k]!.trim() ? `[${lang}]\n${code[k]}` : "", skipped: !code[k]!.trim() })), proc.report())}>Submit all</Button>
        </div>
      </div>
      <CameraCard video={video} warning={proc.warning} tabSwitches={proc.tabSwitches} clock={clock} />
    </div>
  );
}

function Report({ r, onBack }: { r: Result; onBack: () => void }) {
  const pct = Math.round(r.overall_percentage);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="surface p-6 text-center"><p className="text-sm text-muted-foreground">Overall score</p><p className="font-display text-5xl font-bold text-primary">{pct}%</p><Progress className="mt-3" value={pct} /></div>
        <div className="surface p-6 text-center"><p className="text-sm text-muted-foreground">English communication</p><p className="font-display text-3xl font-bold">{r.communication_level}</p><p className="mt-2 text-xs text-muted-foreground">{r.communication_feedback}</p></div>
        <div className="surface p-6"><p className="text-sm text-muted-foreground">Summary</p><p className="mt-2 text-sm">{r.summary}</p></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="surface p-6"><p className="font-semibold">Strengths</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{r.strengths.map((s) => <li key={s}>{s}</li>)}</ul></div>
        <div className="surface p-6"><p className="font-semibold">Improve next</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{r.improvements.map((s) => <li key={s}>{s}</li>)}</ul></div>
      </div>
      <div className="space-y-3">
        <p className="font-display text-lg font-semibold">Questions & answers</p>
        {r.items.map((it, k) => (
          <div key={k} className="surface space-y-3 p-5">
            <div className="flex items-start justify-between gap-3"><p className="whitespace-pre-wrap font-semibold">Q{k + 1}. {it.question}</p><Badge variant={it.score >= 60 ? "default" : "secondary"}>{Math.round(it.score)}/100</Badge></div>
            <div className="text-sm"><p className="text-xs font-semibold uppercase text-muted-foreground">Your answer</p><p className="whitespace-pre-wrap">{it.your_answer}</p></div>
            <div className="text-sm"><p className="text-xs font-semibold uppercase text-muted-foreground">Feedback</p><p>{it.feedback}</p></div>
            <div className="rounded-lg bg-muted p-3 text-sm"><p className="text-xs font-semibold uppercase text-muted-foreground">Ideal answer</p><p className="whitespace-pre-wrap">{it.ideal_answer}</p></div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">AI-generated assessment for practice. It is not a hiring decision.</p>
      <Button variant="outline" onClick={onBack}>Back</Button>
    </div>
  );
}

function HistoryList({ onOpen }: { onOpen: (r: Result) => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["interview-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("interview_sessions").select("id,mode,target_role,experience,result,created_at").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  if (isLoading) return <Shimmer>Loading...</Shimmer>;
  if (!data?.length) return <p className="surface p-6 text-sm text-muted-foreground">No interviews yet. Finish one to see it here.</p>;
  return (
    <div className="grid gap-3">
      {data.map((s) => {
        const r = s.result as unknown as Result | null;
        return (
          <button key={s.id} type="button" disabled={!r} onClick={() => r && onOpen(r)} className="surface flex items-center justify-between p-4 text-left hover:ring-1 hover:ring-border">
            <div><p className="font-semibold">{s.target_role} <Badge variant="secondary" className="ml-2">{s.mode === "coding" ? "Coding" : "Real"}</Badge></p>
              <p className="text-xs text-muted-foreground">{s.experience} · {new Date(s.created_at).toLocaleString()}</p></div>
            {r && <div className="text-right"><p className="font-display text-2xl font-bold text-primary">{Math.round(r.overall_percentage)}%</p><p className="text-xs text-muted-foreground">{r.communication_level}</p></div>}
          </button>
        );
      })}
    </div>
  );
}
