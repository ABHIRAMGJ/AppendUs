import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mic, Play, Square } from "lucide-react";
import { PageHeader } from "@/components/app/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChatPanel } from "@/components/chat/ChatPanel";

export const Route = createFileRoute("/_authenticated/interviews")({
  head: () => ({ meta: [{ title: "AI Mock Interview — AI CareerOS" }, { name: "description", content: "Practice interviews with an AI interviewer." }] }),
  component: Interviews,
});

function Pick({ label, value, onChange, items }: { label: string; value: string; onChange: (v: string) => void; items: string[] }) {
  return (
    <div className="space-y-1.5"><Label>{label}</Label>
      <Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>{items.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select>
    </div>
  );
}

function Interviews() {
  const [cfg, setCfg] = useState({ role: "Software Engineer", type: "Technical", difficulty: "Medium" });
  const [session, setSession] = useState<number | null>(null);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader icon={Mic} title="AI Mock Interview" description="Practice with AI-powered interviews and get instant feedback" />
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="surface h-fit space-y-4 p-6">
          <div className="space-y-1.5"><Label>Role</Label><Input value={cfg.role} disabled={session !== null} onChange={(e) => setCfg({ ...cfg, role: e.target.value })} /></div>
          <Pick label="Interview type" value={cfg.type} onChange={(v) => setCfg({ ...cfg, type: v })} items={["Technical", "HR", "Behavioral", "System Design", "Managerial"]} />
          <Pick label="Difficulty" value={cfg.difficulty} onChange={(v) => setCfg({ ...cfg, difficulty: v })} items={["Easy", "Medium", "Hard"]} />
          {session === null ? (
            <Button variant="hero" className="w-full" onClick={() => setSession(Date.now())}><Play /> Start Interview</Button>
          ) : (
            <Button variant="destructive" className="w-full" onClick={() => setSession(null)}><Square /> End Interview</Button>
          )}
          <p className="text-xs text-muted-foreground">5 questions with feedback and a final score summary.</p>
        </div>
        <div className="surface h-[640px] overflow-hidden">
          {session === null ? (
            <div className="grid h-full place-items-center p-8 text-center">
              <div><Mic className="mx-auto h-12 w-12 text-primary" /><p className="mt-3 font-semibold">Set up your interview and press Start</p><p className="text-sm text-muted-foreground">Answer in your own words — you'll get feedback after each answer.</p></div>
            </div>
          ) : (
            <ChatPanel key={session} id={`interview-${session}`} api="/api/chat" body={{ mode: "interview", context: cfg }}
              autoStart={`I'm ready to start my ${cfg.type} interview for ${cfg.role}.`}
              emptyIcon={<Mic className="h-10 w-10" />} emptyTitle="Starting interview..." emptyDescription="" placeholder="Type your answer..." />
          )}
        </div>
      </div>
    </div>
  );
}
