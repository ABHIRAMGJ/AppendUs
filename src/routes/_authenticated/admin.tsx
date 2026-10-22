import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/AppShell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.rpc("has_role", { _user_id: context.user.id, _role: "admin" });
    if (!data) throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "Admin — AI CareerOS" }, { name: "description", content: "Platform administration." }] }),
  component: Admin,
});

function useAll() {
  return useQuery({
    queryKey: ["admin-all"],
    queryFn: async () => {
      const [profiles, jobs, projects, analyses, threads] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("job_applications").select("*"),
        supabase.from("projects").select("*"),
        supabase.from("resume_analyses").select("id,user_id,target_role,result,created_at"),
        supabase.from("mentor_threads").select("id,user_id,title,updated_at"),
      ]);
      const err = profiles.error || jobs.error || projects.error || analyses.error || threads.error;
      if (err) throw err;
      return { profiles: profiles.data, jobs: jobs.data, projects: projects.data, analyses: analyses.data, threads: threads.data };
    },
  });
}

function Admin() {
  const { data, isLoading, error } = useAll();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);

  const users = useMemo(() => (data?.profiles ?? []).filter((p) =>
    `${p.full_name ?? ""} ${p.email ?? ""} ${p.target_role ?? ""}`.toLowerCase().includes(q.toLowerCase())), [data, q]);
  const count = (arr: { user_id: string }[] | undefined, id: string) => arr?.filter((x) => x.user_id === id).length ?? 0;
  const user = data?.profiles.find((p) => p.id === sel);

  const stats = [
    ["Users", data?.profiles.length], ["Job applications", data?.jobs.length], ["Projects", data?.projects.length],
    ["Resume analyses", data?.analyses.length], ["Mentor conversations", data?.threads.length],
  ] as const;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader icon={ShieldCheck} title="Admin Console" description="View all users and platform data (read-only)" />
      {error && <p className="text-destructive">{(error as Error).message}</p>}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
        {stats.map(([l, v]) => (
          <div key={l} className="surface p-4"><p className="font-display text-2xl font-bold text-primary">{v ?? "–"}</p><p className="text-xs text-muted-foreground">{l}</p></div>
        ))}
      </div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users by name, email or role..." className="pl-9" />
      </div>
      <div className="surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">User</th><th className="p-3">Education</th><th className="p-3">Target role</th><th className="p-3">Jobs</th><th className="p-3">Projects</th><th className="p-3">Resumes</th><th className="p-3">Chats</th><th className="p-3">Joined</th></tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && <tr><td className="p-4 text-muted-foreground" colSpan={8}>Loading...</td></tr>}
            {users.map((p) => (
              <tr key={p.id} className="cursor-pointer hover:bg-muted/60" onClick={() => setSel(p.id)}>
                <td className="p-3"><p className="font-medium">{p.full_name || "—"}</p><p className="text-xs text-muted-foreground">{p.email}</p></td>
                <td className="p-3">{p.education_level || "—"}</td>
                <td className="p-3">{p.target_role || "—"}</td>
                <td className="p-3">{count(data?.jobs, p.id)}</td>
                <td className="p-3">{count(data?.projects, p.id)}</td>
                <td className="p-3">{count(data?.analyses, p.id)}</td>
                <td className="p-3">{count(data?.threads, p.id)}</td>
                <td className="p-3 text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Sheet open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader><SheetTitle>{user?.full_name || user?.email}</SheetTitle></SheetHeader>
          {user && data && (
            <div className="space-y-4 p-4 text-sm">
              <p className="text-muted-foreground">{user.email} · {user.education_level || "No education set"} · Skills: {user.skills || "—"}</p>
              <Tabs defaultValue="jobs">
                <TabsList><TabsTrigger value="jobs">Jobs</TabsTrigger><TabsTrigger value="projects">Projects</TabsTrigger><TabsTrigger value="resumes">Resumes</TabsTrigger><TabsTrigger value="chats">Chats</TabsTrigger></TabsList>
                <TabsContent value="jobs" className="space-y-2">{data.jobs.filter((j) => j.user_id === sel).map((j) => <div key={j.id} className="flex justify-between rounded-lg border p-2"><span>{j.company} — {j.role}</span><Badge variant="secondary">{j.status}</Badge></div>)}</TabsContent>
                <TabsContent value="projects" className="space-y-2">{data.projects.filter((j) => j.user_id === sel).map((j) => <div key={j.id} className="rounded-lg border p-2"><p className="font-medium">{j.title}</p><p className="text-muted-foreground">{j.tech}</p></div>)}</TabsContent>
                <TabsContent value="resumes" className="space-y-2">{data.analyses.filter((j) => j.user_id === sel).map((j) => <div key={j.id} className="flex justify-between rounded-lg border p-2"><span>{j.target_role || "General"}</span><span className="font-semibold">{(j.result as { overall_score?: number })?.overall_score ?? "–"}/100</span></div>)}</TabsContent>
                <TabsContent value="chats" className="space-y-2">{data.threads.filter((j) => j.user_id === sel).map((j) => <div key={j.id} className="rounded-lg border p-2">{j.title}</div>)}</TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
