import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, Search } from "lucide-react";
import { PageHeader } from "@/components/app/AppShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AiOutput, useGenerate } from "@/components/app/AiResult";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/companies")({
  head: () => ({ meta: [{ title: "Company Preparation — AppendUs" }, { name: "description", content: "Interview preparation guides for top companies." }] }),
  component: Companies,
});

const COMPANIES = [
  { n: "Google", c: "FAANG" }, { n: "Amazon", c: "FAANG" }, { n: "Microsoft", c: "FAANG" }, { n: "Meta", c: "FAANG" }, { n: "Apple", c: "FAANG" },
  { n: "TCS", c: "IT Services" }, { n: "Infosys", c: "IT Services" }, { n: "Wipro", c: "IT Services" }, { n: "Accenture", c: "IT Services" }, { n: "HCLTech", c: "IT Services" },
  { n: "Flipkart", c: "Product" }, { n: "Adobe", c: "Product" }, { n: "Atlassian", c: "Product" }, { n: "Salesforce", c: "Product" },
  { n: "Zomato", c: "Startups" }, { n: "Razorpay", c: "Startups" }, { n: "CRED", c: "Startups" }, { n: "Swiggy", c: "Startups" },
];
const CATS = ["All", "FAANG", "Product", "IT Services", "Startups"];

function Companies() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [sel, setSel] = useState<string | null>(null);
  const gen = useGenerate("company");
  const list = COMPANIES.filter((c) => (cat === "All" || c.c === cat) && c.n.toLowerCase().includes(q.toLowerCase()));

  function open(name: string) { setSel(name); gen.run({ company: name }); }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader icon={Building2} title="Company Preparation" description="Get ready for your dream companies" />
      <form className="relative" onSubmit={(e) => { e.preventDefault(); if (q.trim()) open(q.trim()); }}>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search companies... (press Enter for any company)" className="h-11 pl-9" />
      </form>
      <div className="my-4 flex flex-wrap gap-2">
        {CATS.map((c) => <button key={c} onClick={() => setCat(c)} className={cn("rounded-full border px-4 py-1.5 text-sm font-medium", cat === c ? "border-transparent bg-gradient-primary text-primary-foreground" : "bg-card hover:bg-muted")}>{c}</button>)}
      </div>
      <div className="surface divide-y">
        {list.map((c) => (
          <div key={c.n} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 p-4">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-accent font-display text-lg font-bold text-accent-foreground">{c.n[0]}</div>
            <div className="min-w-0"><p className="font-semibold">{c.n}</p><p className="text-sm text-muted-foreground">Interview process, questions, tips</p></div>
            <Button size="sm" variant="hero" onClick={() => open(c.n)}>View Guide</Button>
          </div>
        ))}
      </div>
      <Sheet open={!!sel} onOpenChange={(o) => { if (!o) { gen.stop(); setSel(null); } }}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader><SheetTitle>{sel} — Interview Guide</SheetTitle></SheetHeader>
          <AiOutput text={gen.text} loading={gen.loading} empty="" />
        </SheetContent>
      </Sheet>
    </div>
  );
}
