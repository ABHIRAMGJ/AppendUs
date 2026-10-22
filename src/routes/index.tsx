import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, Compass, FileText, Mic, BookOpen, Code2, Briefcase, GraduationCap, ShieldCheck,
  Target, Search, Hammer, Send, Users, Award, Headphones, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/lib/theme";
import hero from "@/assets/hero-student.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI CareerOS — Your Complete Career Operating System" },
      { name: "description", content: "AI-powered career guidance, learning plans, resume analysis, mock interviews, coding practice and job tracking in one place." },
      { property: "og:title", content: "AI CareerOS — Your Complete Career Operating System" },
      { property: "og:description", content: "Go from 'I want this role' to an evidence-backed plan: learn, practice, prove, interview and apply." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Compass, title: "Career Path Finder", text: "Compare roles, skills, timelines and realistic salary estimates." },
  { icon: FileText, title: "AI Resume Analyzer", text: "Evidence-based scores, strengths, gaps and missing keywords." },
  { icon: BookOpen, title: "Learning Planner", text: "Week-by-week roadmaps built around your goals and time." },
  { icon: Mic, title: "Mock Interviews", text: "Practice technical, HR and behavioral rounds with instant feedback." },
  { icon: Code2, title: "Coding Practice", text: "Solve problems and get AI code reviews with complexity analysis." },
  { icon: Briefcase, title: "Job Tracker", text: "Track every application from applied to offer." },
];

const modules = [
  {
    icon: FileText, title: "AI Resume Analyzer + RAG",
    intro: "Job-specific resume analysis grounded in evidence from your resume and the job description.",
    points: [
      "Upload PDF/DOCX resume and paste a job description",
      "Select a target domain or job role",
      "Analyze skills, experience, education, projects and keywords",
      "Job-specific match scores with evidence",
      "Find missing skills and weak resume bullets",
      "Generate improved, ATS-friendly resume content",
      "Compare multiple resumes or job descriptions",
      "Every recommendation explained with evidence",
    ],
  },
  {
    icon: Compass, title: "Career Path Finder",
    intro: "Multiple realistic paths from wherever you start — never one 'best' career for everyone.",
    points: [
      "After 10th: intermediate, diploma, vocational options",
      "After intermediate: degree, engineering, professional courses",
      "After B.Tech: software, AI, data, cybersecurity, core, higher studies",
      "After MBA/M.Tech: specializations and opportunities",
      "Career switchers and working professionals",
      "Prerequisites, alternatives, skills, timelines and next step",
    ],
  },
  {
    icon: BookOpen, title: "Personalized AI Learning Planner",
    intro: "Plans shaped around your skills, daily time and target role — adjusted as you progress.",
    points: [
      "30-, 60-, 90- or 180-day plans",
      "Customized to current skills, daily time and target role",
      "Languages, frameworks, tools and concepts to learn",
      "Weekly milestones, daily tasks and revision sessions",
      "Coding exercises, quizzes and project assignments",
      "Track completion, scores, accuracy and weak areas",
      "Next week's plan adapts to your performance",
    ],
  },
  {
    icon: Mic, title: "AI Mock Interview Studio",
    intro: "Realistic interview rounds with follow-ups and feedback on what you actually said.",
    points: [
      "Technical interviews by role, company and difficulty",
      "HR, behavioral, project explanation and communication rounds",
      "Coding problems with test cases and evaluation",
      "Resume-based questions about your real projects",
      "Voice-based practice, where supported",
      "Follow-up questions based on your answers",
      "Feedback on correctness, clarity, structure and confidence",
      "Interview history, score trends and revision plans",
    ],
  },
];

const journey = [
  { icon: Target, label: "Goal" },
  { icon: Search, label: "Gaps" },
  { icon: BookOpen, label: "Learn" },
  { icon: Hammer, label: "Prove" },
  { icon: Mic, label: "Interview" },
  { icon: Send, label: "Apply" },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
            <a href="#modules" className="hover:text-foreground">Modules</a>
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#journey" className="hover:text-foreground">How it works</a>
            <a href="#trust" className="hover:text-foreground">Why CareerOS</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="outline" className="hidden rounded-full sm:inline-flex">
              <Link to="/auth">Login</Link>
            </Button>
            <Button asChild variant="hero">
              <Link to="/auth" search={{ mode: "signup" }}>Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-semibold text-accent-foreground shadow-card">
              <span className="h-2 w-2 rounded-full bg-success" /> AI-powered career platform
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-[1.08] sm:text-5xl lg:text-6xl">
              Your Complete <br />
              <span className="text-gradient">Career Operating System</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              AI-powered guidance, learning, resume, interviews, jobs, projects and more. Everything you need for a successful career — in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="hero" size="lg">
                <Link to="/auth" search={{ mode: "signup" }}>Explore Careers <ArrowRight /></Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full">
                <a href="#features">See features</a>
              </Button>
            </div>
            <div className="mt-10 grid max-w-lg grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { icon: Users, v: "12+", l: "Modules" },
                { icon: Compass, v: "100+", l: "Career paths" },
                { icon: Award, v: "Free", l: "To start" },
                { icon: Headphones, v: "24/7", l: "AI support" },
              ].map((s) => (
                <div key={s.l} className="surface p-3 text-center">
                  <s.icon className="mx-auto h-5 w-5 text-primary" />
                  <p className="mt-1 font-display text-lg font-bold">{s.v}</p>
                  <p className="text-xs text-muted-foreground">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-primary opacity-25 blur-3xl" />
            <img
              src={hero}
              alt="Student holding a laptop surrounded by career and learning interface panels"
              width={1024}
              height={1024}
              className="relative aspect-square w-full rounded-[2rem] border object-cover shadow-2xl"
            />
            <div className="surface animate-float absolute -left-4 top-10 hidden items-center gap-2 px-3 py-2 text-sm font-semibold sm:flex">
              <FileText className="h-4 w-4 text-primary" /> Resume score 78/100
            </div>
            <div className="surface animate-float absolute -right-4 bottom-12 hidden items-center gap-2 px-3 py-2 text-sm font-semibold [animation-delay:1.5s] sm:flex">
              <GraduationCap className="h-4 w-4 text-violet" /> Plan: Week 3 of 24
            </div>
          </div>
        </div>
      </section>

      <section id="journey" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">From “I want this role” to hired</h2>
          <p className="mt-3 text-muted-foreground">One connected journey, personalised to you at every step.</p>
        </div>
        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {journey.map((j, i) => (
            <div key={j.label} className="surface relative p-5 text-center">
              <span className="absolute right-3 top-3 text-xs font-bold text-muted-foreground">0{i + 1}</span>
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
                <j.icon className="h-5 w-5" />
              </div>
              <p className="mt-3 font-display font-semibold">{j.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="modules" className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Core modules</span>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">The 4 engines behind your career</h2>
          <p className="mt-3 text-muted-foreground">Every module is built around your real resume, goals and progress.</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {modules.map((m, i) => (
            <div key={m.title} className="surface flex flex-col p-7 transition-transform hover:-translate-y-1">
              <div className="flex items-center gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
                  <m.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground">MODULE 0{i + 1}</p>
                  <h3 className="text-xl font-semibold">{m.title}</h3>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{m.intro}</p>
              <ul className="mt-4 flex-1 space-y-2">
                {m.points.map((p) => (
                  <li key={p} className="flex gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <Button asChild variant="hero" className="mt-6 self-start">
                <Link to="/auth" search={{ mode: "signup" }}>Try it <ArrowRight /></Link>
              </Button>
            </div>
          ))}
        </div>
      </section>


      <section id="features" className="border-y bg-muted/40 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold sm:text-4xl">Everything for your career, in one OS</h2>
            <p className="mt-3 text-muted-foreground">Powerful AI tools, plus two assistants that are always one click away.</p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="surface group p-6 transition-transform hover:-translate-y-1">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl bg-gradient-primary p-7 text-primary-foreground shadow-glow">
              <GraduationCap className="h-8 w-8" />
              <h3 className="mt-4 text-xl font-semibold">CareerOS AI Mentor</h3>
              <p className="mt-2 opacity-90">A personal coach for career paths after 10th, 12th, Diploma, B.Tech, MBA and beyond — plus programming, DSA, cloud, AI and interviews.</p>
            </div>
            <div className="surface p-7">
              <ShieldCheck className="h-8 w-8 text-success" />
              <h3 className="mt-4 text-xl font-semibold">Global Assistant</h3>
              <p className="mt-2 text-muted-foreground">Lives on every page. Ask it to find a feature, explain a page, or troubleshoot a problem.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="trust" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-3">
          {[
            { t: "Evidence over claims", d: "Resume feedback is grounded in what your resume actually says. No fake scores, listings or certificates." },
            { t: "Private by default", d: "Your resumes, plans and conversations belong to you and are never public." },
            { t: "You stay in control", d: "Edit your profile, clear conversations, and delete your data anytime." },
          ].map((x) => (
            <div key={x.t}>
              <h3 className="text-xl font-semibold">{x.t}</h3>
              <p className="mt-2 text-muted-foreground">{x.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-16 overflow-hidden rounded-3xl bg-gradient-primary p-10 text-center text-primary-foreground shadow-glow">
          <h2 className="text-3xl font-bold">Start building your career today</h2>
          <p className="mt-2 opacity-90">Free to start. No credit card needed.</p>
          <Button asChild size="lg" variant="secondary" className="mt-6 rounded-full">
            <Link to="/auth" search={{ mode: "signup" }}>Create your free account <ArrowRight /></Link>
          </Button>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <Logo />
          <p>© {new Date().getFullYear()} AI CareerOS. Built to help you grow.</p>
        </div>
      </footer>
    </div>
  );
}
