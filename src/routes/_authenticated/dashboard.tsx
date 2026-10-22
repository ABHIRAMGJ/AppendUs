import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Briefcase, FileText, FolderKanban, GraduationCap, Mic, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/data";
import { Button } from "@/components/ui/button";
import hero from "@/assets/hero-student.jpg";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — AI CareerOS" }, { name: "description", content: "Your career progress at a glance." }] }),
  component: Dashboard,
});

function Ring({ value, label }: { value: number; label: string }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={r} stroke="var(--muted)" strokeWidth="8" fill="none" />
        <circle cx="40" cy="40" r={r} stroke="var(--primary)" strokeWidth="8" fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * Math.min(100, value)) / 100} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <span className="font-display text-xl font-bold">{label}</span>
      </div>
    </div>
  );
}

function Dashboard() {
  const { data: profile } = useProfile();
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [jobs, projects, analyses, threads] = await Promise.all([
        supabase.from("job_applications").select("status"),
        supabase.from("projects").select("status"),
        supabase.from("resume_analyses").select("result, created_at").order("created_at", { ascending: false }).limit(1),
        supabase.from("mentor_threads").select("id", { count: "exact", head: true }),
      ]);
      const latest = analyses.data?.[0]?.result as { overall_score?: number } | undefined;
      return {
        jobs: jobs.data?.length ?? 0,
        interviews: jobs.data?.filter((j) => j.status === "interview").length ?? 0,
        projects: projects.data?.length ?? 0,
        projectsActive: projects.data?.filter((p) => p.status === "in_progress").length ?? 0,
        resumeScore: latest?.overall_score ?? null,
        threads: threads.count ?? 0,
      };
    },
  });

  const profileFields = [profile?.full_name, profile?.education_level, profile?.target_role, profile?.skills, profile?.weekly_hours];
  const completion = Math.round((profileFields.filter(Boolean).length / profileFields.length) * 100);

  const cards = [
    { icon: FileText, title: "Resume", value: stats?.resumeScore != null ? `${stats.resumeScore}/100` : "Not analysed", to: "/resume" },
    { icon: Briefcase, title: "Job Applications", value: `${stats?.jobs ?? 0} tracked`, to: "/jobs" },
    { icon: Mic, title: "Interviews", value: `${stats?.interviews ?? 0} in interview stage`, to: "/interviews" },
    { icon: FolderKanban, title: "Projects", value: `${stats?.projectsActive ?? 0} in progress`, to: "/projects" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Welcome back, {profile?.full_name?.split(" ")[0] || "there"}!</h1>
        <p className="text-muted-foreground">Let's continue your career journey.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="surface flex items-center gap-5 p-6 lg:col-span-1">
          <Ring value={completion} label={`${completion}%`} />
          <div className="min-w-0">
            <p className="font-display font-semibold">Profile completion</p>
            <p className="mt-1 text-sm text-muted-foreground">A complete profile makes your Mentor and plans more personal.</p>
            <Button asChild size="sm" variant="link" className="px-0">
              <Link to="/settings">Complete profile <ArrowRight /></Link>
            </Button>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-primary p-6 text-primary-foreground shadow-glow lg:col-span-2">
          <img src={hero} alt="" loading="lazy" width={1024} height={1024} className="absolute -right-10 top-0 hidden h-full w-auto object-cover opacity-60 [mask-image:linear-gradient(to_left,black,transparent)] sm:block" />
          <div className="relative max-w-md">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Target role</p>
            <h2 className="mt-1 text-2xl font-bold">{profile?.target_role || "Set your target role"}</h2>
            <p className="mt-2 text-sm opacity-90">Generate a week-by-week plan tailored to your time and skills.</p>
            <Button asChild variant="secondary" className="mt-4 rounded-full">
              <Link to="/learning-plan"><BookOpen /> Build my learning plan</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.title} to={c.to} className="surface group p-5 transition-transform hover:-translate-y-1">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground"><c.icon className="h-5 w-5" /></div>
            <p className="mt-3 font-semibold">{c.title}</p>
            <p className="text-sm text-muted-foreground">{c.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="surface p-6">
          <h3 className="font-semibold">Quick start</h3>
          <ul className="mt-4 space-y-3 text-sm">
            {[
              { t: "Explore career paths", to: "/career-paths" },
              { t: "Analyze your resume", to: "/resume" },
              { t: "Practice a mock interview", to: "/interviews" },
              { t: "Take a skill assessment", to: "/assessments" },
            ].map((x, i) => (
              <li key={x.to}>
                <Link to={x.to} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground">{i + 1}</span>
                  <span className="flex-1">{x.t}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="surface flex items-center gap-5 p-6">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
            <GraduationCap className="h-8 w-8" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold">AI Mentor</h3>
            <p className="text-sm text-muted-foreground">{stats?.threads ? `${stats.threads} saved conversation${stats.threads > 1 ? "s" : ""}` : "Ask anything about your career, skills or interviews."}</p>
            <Button asChild variant="hero" size="sm" className="mt-3">
              <Link to="/mentor">Continue <ArrowRight /></Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
