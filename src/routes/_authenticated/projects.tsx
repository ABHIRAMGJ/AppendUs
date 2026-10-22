import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, FolderKanban, Globe, Link2, Lock, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { currentUserId } from "@/lib/data";
import { PageHeader } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({ meta: [{ title: "Projects & Portfolio — AI CareerOS" }, { name: "description", content: "Build and track real-world portfolio projects." }] }),
  component: Projects,
});

const IDEAS = [
  { t: "Portfolio Website", d: "Build a professional portfolio site", lvl: "Beginner", tech: "HTML, CSS, React" },
  { t: "AI Chatbot", d: "Create a chatbot using an LLM API", lvl: "Intermediate", tech: "Python/TS, LLM API" },
  { t: "Expense Tracker", d: "Full stack CRUD app with auth", lvl: "Intermediate", tech: "React, Node, SQL" },
  { t: "Resume RAG Search", d: "Semantic search over documents", lvl: "Advanced", tech: "Embeddings, Vector DB" },
];

function Projects() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: "", description: "", tech: "", link: "" });
  const { data = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["projects"] });
  const add = useMutation({
    mutationFn: async (p: typeof f) => {
      const { error } = await supabase.from("projects").insert({ ...p, user_id: await currentUserId() });
      if (error) throw error;
    },
    onSuccess: () => { refresh(); setOpen(false); setF({ title: "", description: "", tech: "", link: "" }); toast.success("Project added"); },
    onError: (e) => toast.error((e as Error).message),
  });
  async function toggle(id: string, status: string) {
    const { error } = await supabase.from("projects").update({ status: status === "done" ? "in_progress" : "done" }).eq("id", id);
    if (error) toast.error(error.message); else refresh();
  }
  async function setVisibility(id: string, visibility: string) {
    const { error } = await supabase.from("projects").update({ visibility }).eq("id", id);
    if (error) toast.error(error.message);
    else { refresh(); toast.success(visibility === "public" ? "Project is now on your public portfolio" : "Project is private again"); }
  }
  async function remove(id: string) {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) toast.error(error.message); else refresh();
  }
  async function copyPortfolioLink() {
    const id = await currentUserId();
    await navigator.clipboard.writeText(`${window.location.origin}/portfolio/${id}`);
    toast.success("Public portfolio link copied");
  }

  const publicCount = data.filter((p) => p.visibility === "public").length;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader icon={FolderKanban} title="Project Builder" description="Build real-world projects that prove your skills"
        actions={
          <div className="flex gap-2">
            {publicCount > 0 && (
              <Button variant="outline" onClick={copyPortfolioLink}><Link2 /> <span className="hidden sm:inline">Copy portfolio link</span></Button>
            )}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button variant="hero"><Plus /> <span className="hidden sm:inline">New project</span></Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New project</DialogTitle></DialogHeader>
                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); add.mutate(f); }}>
                  <div className="space-y-1.5"><Label>Title</Label><Input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>Description</Label><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>Tech stack</Label><Input value={f.tech} onChange={(e) => setF({ ...f, tech: e.target.value })} placeholder="React, Node.js" /></div>
                  <div className="space-y-1.5"><Label>Link (GitHub / live)</Label><Input type="url" value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} placeholder="https://" /></div>
                  <Button type="submit" variant="hero" className="w-full" disabled={add.isPending}>Save</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        } />

      <h2 className="mb-3 font-semibold">My projects</h2>
      {data.length === 0 ? (
        <div className="surface mb-8 p-6 text-sm text-muted-foreground">No projects yet. Start one from the ideas below or add your own.</div>
      ) : (
        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.map((p) => (
            <div key={p.id} className="surface flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{p.title}</p>
                <div className="flex shrink-0 gap-1">
                  <Badge variant="secondary" className={p.status === "done" ? "bg-success/15 text-success" : "bg-primary/15 text-primary"}>{p.status === "done" ? "Completed" : "In progress"}</Badge>
                  <Badge variant="secondary" className={p.visibility === "public" ? "bg-violet/15 text-violet" : ""}>
                    {p.visibility === "public" ? <><Globe className="mr-1 h-3 w-3" />Public</> : <><Lock className="mr-1 h-3 w-3" />Private</>}
                  </Badge>
                </div>
              </div>
              <p className="mt-1 flex-1 text-sm text-muted-foreground">{p.description}</p>
              {p.tech && <p className="mt-2 text-xs text-muted-foreground">{p.tech}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => toggle(p.id, p.status)}>{p.status === "done" ? "Reopen" : "Mark done"}</Button>
                <Button size="sm" variant="outline" onClick={() => setVisibility(p.id, p.visibility === "public" ? "private" : "public")}>
                  {p.visibility === "public" ? "Make private" : "Publish"}
                </Button>
                {p.link && <Button size="icon-sm" variant="ghost" asChild><a href={p.link} target="_blank" rel="noreferrer" aria-label="Open link"><ExternalLink /></a></Button>}
                <Button size="icon-sm" variant="ghost" className="ml-auto" onClick={() => remove(p.id)} aria-label="Delete"><Trash2 /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="mb-3 font-semibold">Project ideas</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {IDEAS.map((i) => (
          <div key={i.t} className="surface flex flex-col p-5">
            <Badge variant="secondary" className="w-fit">{i.lvl}</Badge>
            <p className="mt-2 font-semibold">{i.t}</p>
            <p className="flex-1 text-sm text-muted-foreground">{i.d}</p>
            <Button size="sm" variant="hero" className="mt-4" onClick={() => add.mutate({ title: i.t, description: i.d, tech: i.tech, link: "" })}>Start Project</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
