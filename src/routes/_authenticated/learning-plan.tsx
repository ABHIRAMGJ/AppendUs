import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, Wand2 } from "lucide-react";
import { PageHeader } from "@/components/app/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AiOutput, useGenerate } from "@/components/app/AiResult";
import { useProfile } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/learning-plan")({
  head: () => ({ meta: [{ title: "Learning Plan — AppendUs" }, { name: "description", content: "Your personalised AI learning roadmap." }] }),
  component: LearningPlan,
});

const KEY = "careeros-last-plan";

function LearningPlan() {
  const { data: profile } = useProfile();
  const gen = useGenerate("plan");
  const [f, setF] = useState({ role: "", level: "Beginner", hours: "10", days: "90", skills: "" });
  const [saved, setSaved] = useState("");

  useEffect(() => {
    if (profile) setF((x) => ({ ...x, role: x.role || profile.target_role || "", skills: x.skills || profile.skills || "", hours: profile.weekly_hours ? String(profile.weekly_hours) : x.hours }));
  }, [profile]);
  useEffect(() => { setSaved(localStorage.getItem(KEY) ?? ""); }, []);
  useEffect(() => { if (!gen.loading && gen.text) localStorage.setItem(KEY, gen.text); }, [gen.loading, gen.text]);

  const text = gen.text || saved;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader icon={BookOpen} title="Personalized Learning Plan" description="Your custom roadmap to success" />
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <form className="surface h-fit space-y-4 p-6" onSubmit={(e) => { e.preventDefault(); gen.run(f); }}>
          <div className="space-y-1.5"><Label>Target role</Label><Input required value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} placeholder="Full Stack Developer" /></div>
          <div className="space-y-1.5"><Label>Current level</Label>
            <Select value={f.level} onValueChange={(v) => setF({ ...f, level: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["Beginner", "Intermediate", "Advanced"].map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Hours / week</Label><Input type="number" min={1} max={80} value={f.hours} onChange={(e) => setF({ ...f, hours: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Plan length</Label><Select value={f.days} onValueChange={(v) => setF({ ...f, days: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["30", "60", "90", "180"].map((d) => <SelectItem key={d} value={d}>{d} days</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="space-y-1.5"><Label>Skills you already have</Label><Input value={f.skills} onChange={(e) => setF({ ...f, skills: e.target.value })} placeholder="HTML, CSS, basic Python" /></div>
          <Button type="submit" variant="hero" className="w-full" disabled={gen.loading}><Wand2 /> {gen.loading ? "Generating..." : "Generate my plan"}</Button>
        </form>
        <div className="surface min-h-[400px]">
          <AiOutput text={text} loading={gen.loading} empty="Fill in your goal and generate a week-by-week roadmap. Your latest plan is saved on this device." />
        </div>
      </div>
    </div>
  );
}
