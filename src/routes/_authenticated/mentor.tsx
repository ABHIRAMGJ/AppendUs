import { createFileRoute, Link, Outlet, useNavigate, useParams } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createThread, useThreads } from "@/lib/mentor";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/mentor")({
  head: () => ({ meta: [{ title: "AI Mentor — AppendUs" }, { name: "description", content: "Your personal AI career coach." }] }),
  component: MentorLayout,
});

function MentorLayout() {
  const { data: threads = [] } = useThreads();
  const params = useParams({ strict: false }) as { threadId?: string };
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function newThread() {
    try {
      const id = await createThread();
      await qc.invalidateQueries({ queryKey: ["mentor-threads"] });
      navigate({ to: "/mentor/$threadId", params: { threadId: id } });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  async function remove(id: string) {
    const { error } = await supabase.from("mentor_threads").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await qc.invalidateQueries({ queryKey: ["mentor-threads"] });
    if (params.threadId === id) navigate({ to: "/mentor" });
  }

  return (
    <div className="-m-4 grid h-[calc(100vh-4rem)] sm:-m-6 lg:-m-8 md:grid-cols-[280px_1fr]">
      <aside className="hidden min-h-0 flex-col border-r bg-card md:flex">
        <div className="p-3"><Button variant="hero" className="w-full" onClick={newThread}><Plus /> New conversation</Button></div>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3">
          {threads.length === 0 && <p className="px-2 text-sm text-muted-foreground">No conversations yet.</p>}
          {threads.map((t) => (
            <div key={t.id} className={cn("group flex items-center gap-1 rounded-lg", params.threadId === t.id ? "bg-accent" : "hover:bg-muted")}>
              <Link to="/mentor/$threadId" params={{ threadId: t.id }} className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-sm">
                <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{t.title}</span>
              </Link>
              <button onClick={() => remove(t.id)} className="mr-1 rounded p-1.5 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100" aria-label="Delete conversation">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </aside>
      <section className="flex min-h-0 flex-col">
        <div className="flex items-center justify-between border-b p-2 md:hidden">
          <select className="min-w-0 flex-1 rounded-md border bg-background p-2 text-sm" value={params.threadId ?? ""}
            onChange={(e) => e.target.value && navigate({ to: "/mentor/$threadId", params: { threadId: e.target.value } })}>
            <option value="">Select conversation</option>
            {threads.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          <Button size="icon" variant="hero" className="ml-2" onClick={newThread} aria-label="New conversation"><Plus /></Button>
        </div>
        <Outlet />
      </section>
    </div>
  );
}
