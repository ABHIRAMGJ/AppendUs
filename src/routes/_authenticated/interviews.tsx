import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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

function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.98;
  window.speechSynthesis.speak(u);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = any;
function useDictation(onText: (t: string) => void) {
  const [listening, setListening] = useState(false);
  const rec = useRef<Rec>(null);
  const supported = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  function start() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const W = window as any;
    const SR = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!SR) { toast.error("Voice input isn't supported in this browser. Use Chrome or Edge, or type your answer."); return; }
    window.speechSynthesis?.cancel();
    const r = new SR();
    r.lang = "en-IN"; r.continuous = true; r.interimResults = false;
    r.onresult = (e: Rec) => {
      let t = "";
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) t += e.results[i][0].transcript + " ";
      if (t) onText(t);
    };
    r.onerror = (e: Rec) => { if (e.error === "not-allowed") toast.error("Microphone permission was denied."); };
    r.onend = () => setListening(false);
    r.start(); rec.current = r; setListening(true);
  }
  function stop() { rec.current?.stop(); setListening(false); }
  useEffect(() => () => rec.current?.stop(), []);
  return { listening, start, stop, supported };
}

function useClock(running: boolean) {
  const [sec, setSec] = useState(0);
  useEffect(() => { if (!running) return; const t = setInterval(() => setSec((s) => s + 1), 1000); return () => clearInterval(t); }, [running]);
  return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
}

function Interviews() {
  const [tab, setTab] = useState("new");
  const [viewing, setViewing] = useState<Result | null>(null);
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader icon={Mic} title="AI Mock Interview" description="A real interview experience — the bot asks, you speak, and you get a scored report" />
      <Tabs value={tab} onValueChange={(v) => { setTab(v); setViewing(null); }}>
        <TabsList className="mb-6"><TabsTrigger value="new">New interview</TabsTrigger><TabsTrigger value="history"><History className="mr-1 h-4 w-4" />My interviews</TabsTrigger></TabsList>
        <TabsContent value="new"><Flow /></TabsContent>
        <TabsContent value="history">{viewing ? <Report r={viewing} onBack={() => setViewing(null)} /> : <HistoryList onOpen={setViewing} />}</TabsContent>
      </Tabs>
    </div>
  );
}

type Setup = { mode: Mode; resume: string; fileName: string; role: string; pkg: string; exp: string };

function Flow() {
  const [stage, setStage] = useState<"setup" | "loading" | "real" | "coding" | "evaluating" | "done" | "blocked">("setup");
  const [setup, setSetup] = useState<Setup>({ mode: "real", resume: "", fileName: "", role: "", pkg: "", exp: "Fresher" });
  const [realQs, setRealQs] = useState<RealQ[]>([]);
  const [codeQs, setCodeQs] = useState<CodeQ[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const qc = useQueryClient();

  const base = { role: setup.role, package: setup.pkg, experience: setup.exp, resume: setup.resume, mode: setup.mode };

  async function start() {
    if (!setup.resume) return toast.error("Please upload your resume.");
    if (!setup.role.trim()) return toast.error("Please enter your target role.");
    let cam: MediaStream | null = null;
    if (setup.mode === "coding") {
      try { cam = await navigator.mediaDevices.getUserMedia({ video: true }); setStream(cam); }
      catch { return toast.error("Camera access is required for the coding round."); }
    }
    setStage("loading");
    try {
      const out = await call<{ questions: RealQ[] | CodeQ[] }>({ action: "generate", ...base });
      if (setup.mode === "coding") { setCodeQs(out.questions as CodeQ[]); setStage("coding"); }
      else { setRealQs(out.questions as RealQ[]); setStage("real"); }
    } catch (e) { cam?.getTracks().forEach((t) => t.stop()); toast.error((e as Error).message); setStage("setup"); }
  }

  function stopCam() { stream?.getTracks().forEach((t) => t.stop()); setStream(null); }

  async function submit(questions: unknown[], answers: Answer[], proctor?: unknown) {
    stopCam(); window.speechSynthesis?.cancel();
    setStage("evaluating");
    try {
      const out = await call<{ result: Result }>({ action: "evaluate", ...base, questions, answers, proctor });
      setResult(out.result); setStage("done");
      qc.invalidateQueries({ queryKey: ["interview-sessions"] });
    } catch (e) { toast.error((e as Error).message); setStage(setup.mode); }
  }

  useEffect(() => () => stream?.getTracks().forEach((t) => t.stop()), [stream]);

  if (stage === "setup") return <SetupForm setup={setup} setSetup={setSetup} onStart={start} />;
  if (stage === "loading") return <div className="surface p-10 text-center"><Shimmer>Preparing questions from your resume and role...</Shimmer></div>;
  if (stage === "evaluating") return <div className="surface p-10 text-center"><Shimmer>Analysing your answers and communication...</Shimmer></div>;
  if (stage === "real") return <RealRound qs={realQs} onSubmit={(a) => submit(realQs, a)} />;
  if (stage === "coding" && stream) return <CodingRound qs={codeQs} stream={stream}
    onBlocked={() => { stopCam(); setStage("blocked"); }}
    onSubmit={(a, p) => submit(codeQs, a, p)} />;
  if (stage === "blocked") return (
    <div className="surface mx-auto max-w-xl p-10 text-center">
      <ShieldAlert className="mx-auto h-14 w-14 text-destructive" />
      <h2 className="mt-4 font-display text-2xl font-bold">You are not eligible</h2>
      <p className="mt-2 text-sm text-muted-foreground">A mobile phone was clearly visible on camera during the coding round. Phones are not allowed. This attempt has ended.</p>
      <Button className="mt-6" variant="outline" onClick={() => setStage("setup")}>Back to setup</Button>
    </div>
  );
  if (stage === "done" && result) return <Report r={result} onBack={() => { setResult(null); setStage("setup"); }} />;
  return null;
}

function SetupForm({ setup, setSetup, onStart }: { setup: Setup; setSetup: (s: Setup) => void; onStart: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  async function onFile(f?: File) {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) return toast.error("File is larger than 5MB");
    try {
      const t = await readResume(f);
      if (t.trim().length < 50) return toast.error("Couldn't read text from this file.");
      setSetup({ ...setup, resume: t.slice(0, 15000), fileName: f.name });
    } catch { toast.error("Couldn't read this file. Upload a text-based PDF, DOCX or TXT."); }
  }
  const modes: { id: Mode; icon: typeof Users; title: string; desc: string; points: string[] }[] = [
    { id: "real", icon: Users, title: "Real Interview", desc: "Voice interview like a real panel", points: ["Intro & project explanation", "Role questions, OOPs, SQL, React (if in resume)", "Speak answers, skip any question", "Score %, feedback & English level"] },
    { id: "coding", icon: Code2, title: "Coding Interview", desc: "Proctored round with camera on", points: ["3 problems: Easy, Medium, Hard", "Camera must stay on", "Phone detected = not eligible", "Tab switches are recorded"] },
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        <p className="text-sm font-semibold">1. Choose interview type</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {modes.map((m) => (
            <button key={m.id} type="button" onClick={() => setSetup({ ...setup, mode: m.id })}
              className={cn("surface p-5 text-left transition", setup.mode === m.id ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-border")}>
              <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><m.icon className="h-5 w-5" /></div>
                <div><p className="font-display font-semibold">{m.title}</p><p className="text-xs text-muted-foreground">{m.desc}</p></div></div>
              <ul className="mt-4 space-y-1.5 text-sm">{m.points.map((p) => <li key={p} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />{p}</li>)}</ul>
            </button>
          ))}
        </div>
        <div className="surface p-5 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">How it works</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Upload your resume and enter your target role, approx package and experience.</li>
            <li>Questions are generated only for your role and resume — nothing from other domains.</li>
            <li>The interviewer reads each question aloud. Press the mic and speak, or type.</li>
            <li>Skip if you don't know. Submit at the end to see every question, your answer, the ideal answer and your score.</li>
          </ol>
        </div>
      </div>
      <div className="surface h-fit space-y-4 p-6">
        <p className="text-sm font-semibold">2. Your details</p>
        <div className="space-y-1.5"><Label>Resume</Label>
          <input ref={ref} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          <Button variant="outline" className="w-full justify-start" onClick={() => ref.current?.click()}>
            {setup.fileName ? <><FileText /> {setup.fileName}</> : <><Upload /> Upload PDF, DOCX or TXT</>}
          </Button>
        </div>
        <div className="space-y-1.5"><Label>Target role</Label><Input value={setup.role} onChange={(e) => setSetup({ ...setup, role: e.target.value })} placeholder="e.g. Frontend Developer" /></div>
        <div className="space-y-1.5"><Label>Approx package</Label><Input value={setup.pkg} onChange={(e) => setSetup({ ...setup, pkg: e.target.value })} placeholder="e.g. 6 LPA" /></div>
        <div className="space-y-1.5"><Label>Experience</Label>
          <Select value={setup.exp} onValueChange={(v) => setSetup({ ...setup, exp: v })}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["Fresher", "0-1 years", "1-3 years", "3-5 years", "5+ years"].map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select>
        </div>
        <Button variant="hero" className="w-full" onClick={onStart}>{setup.mode === "coding" ? <><Camera /> Turn on camera & start</> : <><Mic /> Start interview</>}</Button>
      </div>
    </div>
  );
}

function RealRound({ qs, onSubmit }: { qs: RealQ[]; onSubmit: (a: Answer[]) => void }) {
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>(() => qs.map((q) => ({ question: q.question, answer: "", skipped: false })));
  const clock = useClock(true);
  const dict = useDictation((t) => setAnswers((a) => a.map((x, k) => (k === i ? { ...x, answer: (x.answer + " " + t).trim(), skipped: false } : x))));
  const q = qs[i]!;
  useEffect(() => { speak(q.question); }, [q.question]);
  const last = i === qs.length - 1;
  function go(skip: boolean) {
    dict.stop();
    const next = answers.map((x, k) => (k === i && skip ? { ...x, skipped: true, answer: "" } : x));
    setAnswers(next);
    if (last) onSubmit(next); else setI(i + 1);
  }
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Question {i + 1} of {qs.length}</span><span className="flex items-center gap-1"><Timer className="h-4 w-4" />{clock}</span>
      </div>
      <Progress value={((i + 1) / qs.length) * 100} />
      <div className="surface space-y-5 p-6">
        <div className="flex items-start justify-between gap-3">
          <div><Badge variant="secondary">{q.section}</Badge><p className="mt-3 font-display text-xl font-semibold leading-snug">{q.question}</p></div>
          <Button variant="ghost" size="icon" onClick={() => speak(q.question)} aria-label="Repeat question"><Volume2 /></Button>
        </div>
        <Textarea rows={7} value={answers[i]!.answer} placeholder="Press the mic and speak your answer, or type here..."
          onChange={(e) => setAnswers(answers.map((x, k) => (k === i ? { ...x, answer: e.target.value, skipped: false } : x)))} />
        <div className="flex flex-wrap items-center gap-3">
          <Button variant={dict.listening ? "destructive" : "outline"} onClick={dict.listening ? dict.stop : dict.start}>
            {dict.listening ? <><MicOff /> Stop speaking</> : <><Mic /> Speak answer</>}
          </Button>
          {dict.listening && <span className="flex items-center gap-2 text-sm text-destructive"><span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />Listening...</span>}
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" onClick={() => go(true)}><SkipForward /> Skip</Button>
            <Button variant="hero" onClick={() => go(false)}>{last ? "Submit interview" : <>Next <ArrowRight /></>}</Button>
          </div>
        </div>
        {!dict.supported && <p className="text-xs text-muted-foreground">Voice input needs Chrome or Edge. You can still type your answers.</p>}
      </div>
    </div>
  );
}

function CodingRound({ qs, stream, onSubmit, onBlocked }: { qs: CodeQ[]; stream: MediaStream; onSubmit: (a: Answer[], p: unknown) => void; onBlocked: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(0);
  const [lang, setLang] = useState("JavaScript");
  const [code, setCode] = useState<string[]>(() => qs.map(() => ""));
  const [tabSwitches, setTabSwitches] = useState(0);
  const [warning, setWarning] = useState("");
  const checks = useRef({ frames: 0, noFace: 0, multiple: 0 });
  const clock = useClock(true);

  useEffect(() => { if (video.current) { video.current.srcObject = stream; void video.current.play().catch(() => {}); } }, [stream]);
  useEffect(() => {
    const h = () => { if (document.hidden) { setTabSwitches((n) => n + 1); toast.warning("Tab switch recorded."); } };
    document.addEventListener("visibilitychange", h);
    return () => document.removeEventListener("visibilitychange", h);
  }, []);
  useEffect(() => {
    let busy = false;
    const t = setInterval(async () => {
      const v = video.current;
      if (busy || !v || !v.videoWidth) return;
      busy = true;
      try {
        const c = document.createElement("canvas");
        c.width = 480; c.height = Math.round((480 * v.videoHeight) / v.videoWidth);
        c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
        const r = await call<{ phone_visible: boolean; face_visible: boolean; multiple_people: boolean }>({ action: "proctor", image: c.toDataURL("image/jpeg", 0.6) });
        checks.current.frames++;
        if (r.phone_visible) { onBlocked(); return; }
        if (!r.face_visible) { checks.current.noFace++; setWarning("Your face is not visible. Stay in front of the camera."); }
        else if (r.multiple_people) { checks.current.multiple++; setWarning("More than one person detected."); }
        else setWarning("");
      } catch { /* skip this frame */ } finally { busy = false; }
    }, 12000);
    return () => clearInterval(t);
  }, [onBlocked]);

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
          <Button variant="hero" onClick={() => onSubmit(qs.map((x, k) => ({ question: `${x.difficulty}: ${x.title}\n${x.statement}`, answer: code[k]!.trim() ? `[${lang}]\n${code[k]}` : "", skipped: !code[k]!.trim() })), { tab_switches: tabSwitches, ...checks.current })}>Submit all</Button>
        </div>
      </div>
      <div className="space-y-4">
        <div className="surface overflow-hidden">
          <video ref={video} muted playsInline className="aspect-video w-full -scale-x-100 bg-muted object-cover" />
          <div className="flex items-center justify-between p-3 text-xs"><span className="flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />Proctoring on</span><span className="flex items-center gap-1"><Timer className="h-3 w-3" />{clock}</span></div>
        </div>
        {warning && <div className="surface border-destructive p-3 text-sm text-destructive">{warning}</div>}
        <div className="surface space-y-1 p-4 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">Rules</p>
          <p>• Keep your face in view.</p><p>• No mobile phones — if one is clearly seen, you are not eligible.</p><p>• Tab switches recorded: <span className="font-semibold text-foreground">{tabSwitches}</span></p>
        </div>
      </div>
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
