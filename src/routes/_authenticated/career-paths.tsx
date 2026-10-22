import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, Briefcase, Clock, Compass, IndianRupee, Search } from "lucide-react";
import { PageHeader } from "@/components/app/AppShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AiOutput, useGenerate } from "@/components/app/AiResult";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/career-paths")({
  head: () => ({ meta: [{ title: "Career Path Finder — AI CareerOS" }, { name: "description", content: "Discover careers by interest, skills and timeline." }] }),
  component: CareerPaths,
});

type Role = { title: string; cat: string; demand: "High" | "Very High" | "Medium"; salary: string; years: string };
const ROLES: Role[] = [
  { title: "Software Engineer", cat: "Technology", demand: "High", salary: "6–12 LPA", years: "4–5 years" },
  { title: "Data Scientist", cat: "Technology", demand: "High", salary: "8–20 LPA", years: "4–6 years" },
  { title: "AI / ML Engineer", cat: "Technology", demand: "Very High", salary: "10–40 LPA", years: "4–6 years" },
  { title: "Cloud & DevOps Engineer", cat: "Technology", demand: "High", salary: "6–18 LPA", years: "3–5 years" },
  { title: "Cybersecurity Analyst", cat: "Technology", demand: "High", salary: "5–15 LPA", years: "3–5 years" },
  { title: "Full Stack Developer", cat: "Technology", demand: "High", salary: "5–15 LPA", years: "3–4 years" },
  { title: "Product Manager", cat: "Business", demand: "High", salary: "12–35 LPA", years: "5–7 years" },
  { title: "Business Analyst", cat: "Business", demand: "Medium", salary: "5–12 LPA", years: "3–4 years" },
  { title: "Chartered Accountant", cat: "Business", demand: "Medium", salary: "7–15 LPA", years: "4–5 years" },
  { title: "Digital Marketing Specialist", cat: "Business", demand: "Medium", salary: "3–8 LPA", years: "1–3 years" },
  { title: "Doctor (MBBS)", cat: "Healthcare", demand: "High", salary: "8–20 LPA", years: "5.5+ years" },
  { title: "Pharmacist", cat: "Healthcare", demand: "Medium", salary: "3–7 LPA", years: "4 years" },
  { title: "Nursing", cat: "Healthcare", demand: "High", salary: "3–6 LPA", years: "4 years" },
  { title: "UI/UX Designer", cat: "Creative", demand: "High", salary: "4–15 LPA", years: "2–4 years" },
  { title: "Content Creator / Writer", cat: "Creative", demand: "Medium", salary: "3–10 LPA", years: "1–3 years" },
  { title: "Civil Services (IAS/IPS)", cat: "Government", demand: "Medium", salary: "7–15 LPA", years: "3–5 years prep" },
  { title: "Banking (PO/Clerk)", cat: "Government", demand: "Medium", salary: "4–9 LPA", years: "1–2 years prep" },
  { title: "Defence Services", cat: "Government", demand: "Medium", salary: "6–12 LPA", years: "1–4 years" },
];
const CATS = ["All", "Technology", "Business", "Healthcare", "Creative", "Government"];

function CareerPaths() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [sel, setSel] = useState<Role | null>(null);
  const gen = useGenerate("career");

  const list = useMemo(
    () => ROLES.filter((r) => (cat === "All" || r.cat === cat) && r.title.toLowerCase().includes(q.toLowerCase())),
    [q, cat],
  );

  function open(r: Role) {
    setSel(r);
    gen.run({ role: r.title });
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader icon={Compass} title="Career Path Finder" description="Discover the best career paths based on your interests, skills and goals" />
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search careers..." className="h-11 pl-9" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {CATS.map((c) => (
          <button key={c} onClick={() => setCat(c)}
            className={cn("rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              cat === c ? "border-transparent bg-gradient-primary text-primary-foreground shadow-glow" : "bg-card hover:bg-muted")}>
            {c}
          </button>
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {list.map((r) => (
          <div key={r.title} className="surface flex items-center gap-4 p-5">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground"><Briefcase className="h-6 w-6" /></div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{r.title}</p>
              <Badge className={cn("mt-1", r.demand === "Very High" ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success")} variant="secondary">
                {r.demand} Demand
              </Badge>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" />{r.salary} (est.)</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{r.years}</span>
              </div>
            </div>
            <Button size="sm" variant="hero" onClick={() => open(r)}>Explore <ArrowRight /></Button>
          </div>
        ))}
        {list.length === 0 && <p className="text-muted-foreground">No careers match your search. Try asking the AI Mentor.</p>}
      </div>
      <p className="mt-6 text-xs text-muted-foreground">Salary ranges are rough estimates for India and vary by city, company and experience.</p>

      <Sheet open={!!sel} onOpenChange={(o) => { if (!o) { gen.stop(); setSel(null); } }}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader><SheetTitle>{sel?.title}</SheetTitle></SheetHeader>
          <AiOutput text={gen.text} loading={gen.loading} empty="" />
        </SheetContent>
      </Sheet>
    </div>
  );
}
