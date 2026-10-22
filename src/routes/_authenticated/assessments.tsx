import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import { PageHeader } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/assessments")({
  head: () => ({ meta: [{ title: "Skill Assessments — AI CareerOS" }, { name: "description", content: "Test your skills with AI quizzes." }] }),
  component: Assessments,
});

const TOPICS = [
  { t: "Python", c: "Programming" }, { t: "Java", c: "Programming" }, { t: "JavaScript", c: "Programming" },
  { t: "TypeScript", c: "Programming" }, { t: "C++", c: "Programming" }, { t: "Go", c: "Programming" },
  { t: "Data Structures", c: "DSA" }, { t: "Algorithms", c: "DSA" }, { t: "Dynamic Programming", c: "DSA" },
  { t: "React", c: "Web Dev" }, { t: "Node.js", c: "Web Dev" }, { t: "HTML & CSS", c: "Web Dev" },
  { t: "SQL", c: "Databases" }, { t: "MongoDB", c: "Databases" },
  { t: "Machine Learning", c: "AI/ML" }, { t: "Generative AI & RAG", c: "AI/ML" },
  { t: "AWS / Cloud", c: "Cloud & DevOps" }, { t: "Docker & Kubernetes", c: "Cloud & DevOps" },
  { t: "Cybersecurity Basics", c: "Security" }, { t: "System Design", c: "Design" },
  { t: "Aptitude", c: "Aptitude" }, { t: "Communication Skills", c: "Soft Skills" },
];
const CATS = ["All", ...Array.from(new Set(TOPICS.map((t) => t.c)))];

function Assessments() {
  const [cat, setCat] = useState("All");
  const [active, setActive] = useState<{ topic: string; level: string; key: number } | null>(null);

  if (active) {
    return (
      <div className="mx-auto max-w-4xl">
        <Button variant="ghost" onClick={() => setActive(null)} className="mb-4"><ArrowLeft /> All assessments</Button>
        <div className="surface h-[680px] overflow-hidden">
          <ChatPanel key={active.key} id={`quiz-${active.key}`} api="/api/chat" body={{ mode: "quiz", context: { topic: active.topic, level: active.level } }}
            autoStart={`Start my ${active.level} ${active.topic} assessment.`}
            emptyIcon={<ClipboardCheck className="h-10 w-10" />} emptyTitle="Preparing questions..." emptyDescription="" placeholder="Your answer (e.g. B)..." />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader icon={ClipboardCheck} title="Skill Assessments" description="Test your skills and track your progress" />
      <div className="mb-6 flex flex-wrap gap-2">
        {CATS.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={cn("rounded-full border px-4 py-1.5 text-sm font-medium", cat === c ? "border-transparent bg-gradient-primary text-primary-foreground" : "bg-card hover:bg-muted")}>{c}</button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TOPICS.filter((t) => cat === "All" || t.c === cat).map((t) => (
          <div key={t.t} className="surface flex flex-col p-5">
            <p className="text-xs font-medium text-muted-foreground">{t.c}</p>
            <p className="mt-1 font-semibold">{t.t}</p>
            <p className="text-xs text-muted-foreground">5 adaptive questions</p>
            <div className="mt-4 flex gap-2">
              {["Beginner", "Advanced"].map((lv) => (
                <Button key={lv} size="sm" variant={lv === "Beginner" ? "hero" : "outline"} className="flex-1" onClick={() => setActive({ topic: t.t, level: lv, key: Date.now() })}>{lv}</Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
