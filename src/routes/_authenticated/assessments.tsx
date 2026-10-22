import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, ClipboardCheck, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { authHeaders, currentUserId } from "@/lib/data";
import { PageHeader } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/assessments")({
  head: () => ({ meta: [{ title: "Skill Assessments — AppendUs" }, { name: "description", content: "Test your skills with scored AI quizzes and track your progress." }] }),
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

type Question = { question: string; options: string[]; correct_index: number; explanation: string };
type Quiz = { topic: string; level: string; questions: Question[] };

function Assessments() {
  const qc = useQueryClient();
  const [cat, setCat] = useState("All");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const { data: history = [] } = useQuery({
    queryKey: ["assessment-attempts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("assessment_attempts").select("id,topic,level,score,total,created_at").order("created_at", { ascending: false }).limit(30);
      if (error) throw error;
      return data;
    },
  });

  async function start(topic: string, level: string) {
    setLoading(true);
    setQuiz(null);
    setSubmitted(false);
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "content-type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ topic, level }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create the quiz");
      setQuiz({ topic, level, questions: data.questions });
      setAnswers(Array(data.questions.length).fill(-1));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    if (!quiz) return;
    const s = quiz.questions.reduce((acc, q, i) => acc + (answers[i] === q.correct_index ? 1 : 0), 0);
    setScore(s);
    setSubmitted(true);
    try {
      const { error } = await supabase.from("assessment_attempts").insert({
        user_id: await currentUserId(),
        topic: quiz.topic,
        level: quiz.level,
        score: s,
        total: quiz.questions.length,
        questions: quiz.questions as never,
        answers: answers as never,
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["assessment-attempts"] });
    } catch (e) {
      toast.error(`Score shown but couldn't be saved: ${(e as Error).message}`);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <Button variant="ghost" onClick={() => setLoading(false)} className="mb-4"><ArrowLeft /> Cancel</Button>
        <div className="surface p-8"><Shimmer>Writing your assessment questions...</Shimmer></div>
      </div>
    );
  }

  if (quiz) {
    const answered = answers.filter((a) => a >= 0).length;
    return (
      <div className="mx-auto max-w-4xl">
        <Button variant="ghost" onClick={() => setQuiz(null)} className="mb-4"><ArrowLeft /> All assessments</Button>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{quiz.topic}</h2>
            <p className="text-sm text-muted-foreground">{quiz.level} · {quiz.questions.length} questions</p>
          </div>
          {submitted && <Badge className="bg-success/15 text-success" variant="secondary">Score: {score}/{quiz.questions.length}</Badge>}
        </div>
        <div className="space-y-4">
          {quiz.questions.map((q, qi) => (
            <div key={qi} className="surface p-5">
              <p className="font-medium">{qi + 1}. {q.question}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {q.options.map((opt, oi) => {
                  const chosen = answers[qi] === oi;
                  const correct = submitted && q.correct_index === oi;
                  const wrong = submitted && chosen && q.correct_index !== oi;
                  return (
                    <button key={oi} type="button" disabled={submitted}
                      onClick={() => setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)))}
                      className={cn("rounded-lg border p-3 text-left text-sm transition-colors",
                        correct ? "border-success bg-success/10" : wrong ? "border-destructive bg-destructive/10"
                          : chosen ? "border-primary bg-accent" : "hover:bg-muted")}>
                      <span className="mr-2 font-semibold">{String.fromCharCode(65 + oi)}.</span>{opt}
                      {correct && <CheckCircle2 className="ml-2 inline h-4 w-4 text-success" />}
                      {wrong && <XCircle className="ml-2 inline h-4 w-4 text-destructive" />}
                    </button>
                  );
                })}
              </div>
              {submitted && <p className="mt-3 rounded-lg bg-muted p-3 text-xs text-muted-foreground">{q.explanation}</p>}
            </div>
          ))}
        </div>
        {!submitted ? (
          <Button variant="hero" className="mt-6 w-full" disabled={answered < quiz.questions.length} onClick={submit}>
            Submit answers ({answered}/{quiz.questions.length} answered)
          </Button>
        ) : (
          <div className="mt-6 flex gap-3">
            <Button variant="hero" className="flex-1" onClick={() => start(quiz.topic, quiz.level)}>Try again</Button>
            <Button variant="outline" className="flex-1" onClick={() => setQuiz(null)}>Pick another topic</Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader icon={ClipboardCheck} title="Skill Assessments" description="Scored quizzes with explanations — every attempt is saved to your history" />
      <Tabs defaultValue="take">
        <TabsList><TabsTrigger value="take">Take a test</TabsTrigger><TabsTrigger value="history">My history</TabsTrigger></TabsList>
        <TabsContent value="take" className="pt-4">
          <div className="mb-6 flex flex-wrap gap-2">
            {CATS.map((c) => (
              <button key={c} onClick={() => setCat(c)} className={cn("rounded-full border px-4 py-1.5 text-sm font-medium", cat === c ? "border-transparent bg-gradient-primary text-primary-foreground" : "bg-card hover:bg-muted")}>{c}</button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TOPICS.filter((t) => cat === "All" || t.c === cat).map((t) => {
              const best = history.filter((h) => h.topic === t.t).reduce((m, h) => Math.max(m, Math.round((h.score / h.total) * 100)), 0);
              return (
                <div key={t.t} className="surface flex flex-col p-5">
                  <p className="text-xs font-medium text-muted-foreground">{t.c}</p>
                  <p className="mt-1 font-semibold">{t.t}</p>
                  <p className="text-xs text-muted-foreground">5 questions{best > 0 ? ` · best ${best}%` : ""}</p>
                  <div className="mt-4 flex gap-2">
                    {["Beginner", "Advanced"].map((lv) => (
                      <Button key={lv} size="sm" variant={lv === "Beginner" ? "hero" : "outline"} className="flex-1" onClick={() => start(t.t, lv)}>{lv}</Button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
        <TabsContent value="history" className="pt-4">
          {history.length === 0 ? (
            <p className="surface p-6 text-sm text-muted-foreground">No attempts yet. Take your first assessment to start tracking progress.</p>
          ) : (
            <div className="surface divide-y">
              {history.map((h) => {
                const pct = Math.round((h.score / h.total) * 100);
                return (
                  <div key={h.id} className="flex items-center justify-between gap-4 p-4">
                    <div><p className="font-medium">{h.topic}</p><p className="text-xs text-muted-foreground">{h.level} · {new Date(h.created_at).toLocaleDateString()}</p></div>
                    <Badge variant="secondary" className={pct >= 80 ? "bg-success/15 text-success" : pct >= 50 ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}>{h.score}/{h.total} · {pct}%</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
