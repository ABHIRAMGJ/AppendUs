import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Briefcase, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { currentUserId } from "@/lib/data";
import { PageHeader } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/jobs")({
  head: () => ({ meta: [{ title: "Job Tracker — AI CareerOS" }, { name: "description", content: "Track and manage your job applications." }] }),
  component: Jobs,
});

const STATUSES = [
  { v: "applied", l: "Applied", cls: "bg-primary/15 text-primary" },
  { v: "interview", l: "Interview", cls: "bg-violet/15 text-violet" },
  { v: "offer", l: "Offer", cls: "bg-success/15 text-success" },
  { v: "rejected", l: "Rejected", cls: "bg-destructive/15 text-destructive" },
];

function Jobs() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ company: "", role: "", status: "applied" });
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("job_applications").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["jobs"] });
  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("job_applications").insert({ ...f, user_id: await currentUserId() });
      if (error) throw error;
    },
    onSuccess: () => { refresh(); setOpen(false); setF({ company: "", role: "", status: "applied" }); toast.success("Application added"); },
    onError: (e) => toast.error((e as Error).message),
  });
  async function update(id: string, status: string) {
    const { error } = await supabase.from("job_applications").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else refresh();
  }
  async function remove(id: string) {
    const { error } = await supabase.from("job_applications").delete().eq("id", id);
    if (error) toast.error(error.message); else refresh();
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader icon={Briefcase} title="Job Tracker" description="Track and manage your job applications"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button variant="hero"><Plus /> <span className="hidden sm:inline">Add</span></Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add application</DialogTitle></DialogHeader>
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); add.mutate(); }}>
                <div className="space-y-1.5"><Label>Company</Label><Input required value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Role</Label><Input required value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Status</Label>
                  <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent></Select>
                </div>
                <Button type="submit" variant="hero" className="w-full" disabled={add.isPending}>Save</Button>
              </form>
            </DialogContent>
          </Dialog>
        } />
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STATUSES.map((s) => (
          <div key={s.v} className="surface p-4 text-center">
            <p className={cn("font-display text-3xl font-bold", s.cls.split(" ")[1])}>{jobs.filter((j) => j.status === s.v).length}</p>
            <p className="text-sm text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>
      <div className="surface divide-y">
        {isLoading && <p className="p-6 text-sm text-muted-foreground">Loading...</p>}
        {!isLoading && jobs.length === 0 && <p className="p-6 text-sm text-muted-foreground">No applications yet. Click Add to track your first one.</p>}
        {jobs.map((j) => {
          const st = STATUSES.find((s) => s.v === j.status) ?? STATUSES[0]!;
          return (
            <div key={j.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 p-4">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-accent font-display font-bold text-accent-foreground">{j.company[0]?.toUpperCase()}</div>
              <div className="min-w-0"><p className="truncate font-semibold">{j.company}</p><p className="truncate text-sm text-muted-foreground">{j.role} · {j.applied_on}</p></div>
              <div className="flex items-center gap-2">
                <Select value={j.status} onValueChange={(v) => update(j.id, v)}>
                  <SelectTrigger className={cn("h-8 w-32 border-0", st.cls)}><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
                </Select>
                <Button size="icon-sm" variant="ghost" onClick={() => remove(j.id)} aria-label="Delete"><Trash2 /></Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
