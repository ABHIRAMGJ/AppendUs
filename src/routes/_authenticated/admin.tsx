import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Activity, Flag, Pencil, ScrollText, Search, ShieldCheck, ShieldPlus, ShieldX, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
      const [profiles, jobs, projects, analyses, threads, attempts, submissions, sessions, roles, flags, actions] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("job_applications").select("*"),
        supabase.from("projects").select("*"),
        supabase.from("resume_analyses").select("id,user_id,target_role,result,created_at"),
        supabase.from("mentor_threads").select("id,user_id,title,updated_at"),
        supabase.from("assessment_attempts").select("id,user_id,topic,level,score,total,created_at"),
        supabase.from("code_submissions").select("id,user_id,problem,language,created_at"),
        supabase.from("interview_sessions").select("id,user_id,mode,target_role,experience,result,created_at"),
        supabase.from("user_roles").select("id,user_id,role"),
        supabase.from("feature_flags").select("*").order("key"),
        supabase.from("admin_actions").select("*").order("created_at", { ascending: false }).limit(50),
      ]);
      const err = profiles.error || jobs.error || projects.error || analyses.error || threads.error
        || attempts.error || submissions.error || sessions.error || roles.error || flags.error || actions.error;
      if (err) throw err;
      return {
        profiles: profiles.data, jobs: jobs.data, projects: projects.data, analyses: analyses.data,
        threads: threads.data, attempts: attempts.data, submissions: submissions.data, sessions: sessions.data,
        roles: roles.data, flags: flags.data, actions: actions.data,
      };
    },
  });
}

function Admin() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useAll();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: "", education_level: "", target_role: "", skills: "" });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-all"] });

  const users = useMemo(() => (data?.profiles ?? []).filter((p) =>
    `${p.full_name ?? ""} ${p.email ?? ""} ${p.target_role ?? ""}`.toLowerCase().includes(q.toLowerCase())), [data, q]);
  const count = (arr: { user_id: string }[] | undefined, id: string) => arr?.filter((x) => x.user_id === id).length ?? 0;
  const user = data?.profiles.find((p) => p.id === sel);
  const isAdmin = (id: string) => !!data?.roles.some((r) => r.user_id === id && r.role === "admin");

  async function logAction(action: string, target?: string, detail: Record<string, unknown> = {}) {
    const { data: u } = await supabase.auth.getUser();
    if (u.user) await supabase.from("admin_actions").insert({ admin_id: u.user.id, action, target: target ?? null, detail: detail as never });
  }

  async function setRole(userId: string, email: string, makeAdmin: boolean) {
    if (makeAdmin) {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      if (error) { toast.error(error.message); return; }
    }
    await logAction(makeAdmin ? "grant_admin" : "revoke_admin", email);
    toast.success(makeAdmin ? `${email} is now an admin` : `Admin removed from ${email}`);
    refresh();
  }

  async function toggleFlag(key: string, enabled: boolean) {
    const { error } = await supabase.from("feature_flags").update({ enabled, updated_at: new Date().toISOString() }).eq("key", key);
    if (error) { toast.error(error.message); return; }
    await logAction("toggle_flag", key, { enabled });
    refresh();
  }

  const stats = [
    ["Users", data?.profiles.length], ["Job applications", data?.jobs.length], ["Projects", data?.projects.length],
    ["Resume analyses", data?.analyses.length], ["Mentor conversations", data?.threads.length],
    ["Assessments", data?.attempts.length], ["Code submissions", data?.submissions.length],
  ] as const;

  const health = [
    ["Users & profiles", data?.profiles], ["Job applications", data?.jobs], ["Projects", data?.projects],
    ["Resume analyses", data?.analyses], ["Mentor threads", data?.threads], ["Assessment attempts", data?.attempts],
    ["Code submissions", data?.submissions], ["Feature flags", data?.flags], ["Audit log", data?.actions],
  ] as const;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader icon={ShieldCheck} title="Admin Console" description="Manage users, roles, feature flags and platform health" />
      {error && <p className="text-destructive">{(error as Error).message}</p>}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
        {stats.map(([l, v]) => (
          <div key={l} className="surface p-4"><p className="font-display text-2xl font-bold text-primary">{v ?? "–"}</p><p className="text-xs text-muted-foreground">{l}</p></div>
        ))}
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="flags">Feature flags</TabsTrigger>
          <TabsTrigger value="audit">Audit log</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="pt-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users by name, email or role..." className="pl-9" />
          </div>
          <div className="surface overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                <tr><th className="p-3">User</th><th className="p-3">Education</th><th className="p-3">Target role</th><th className="p-3">Jobs</th><th className="p-3">Projects</th><th className="p-3">Resumes</th><th className="p-3">Tests</th><th className="p-3">Role</th><th className="p-3">Joined</th></tr>
              </thead>
              <tbody className="divide-y">
                {isLoading && <tr><td className="p-4 text-muted-foreground" colSpan={9}>Loading...</td></tr>}
                {users.map((p) => (
                  <tr key={p.id} className="cursor-pointer hover:bg-muted/60" onClick={() => setSel(p.id)}>
                    <td className="p-3"><p className="font-medium">{p.full_name || "—"}</p><p className="text-xs text-muted-foreground">{p.email}</p></td>
                    <td className="p-3">{p.education_level || "—"}</td>
                    <td className="p-3">{p.target_role || "—"}</td>
                    <td className="p-3">{count(data?.jobs, p.id)}</td>
                    <td className="p-3">{count(data?.projects, p.id)}</td>
                    <td className="p-3">{count(data?.analyses, p.id)}</td>
                    <td className="p-3">{count(data?.attempts, p.id)}</td>
                    <td className="p-3">{isAdmin(p.id) ? <Badge className="bg-violet/15 text-violet" variant="secondary">Admin</Badge> : <Badge variant="secondary">User</Badge>}</td>
                    <td className="p-3 text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="flags" className="pt-4">
          <div className="surface divide-y">
            {(data?.flags ?? []).map((f) => (
              <div key={f.key} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="flex items-center gap-2 font-medium"><Flag className="h-4 w-4 text-primary" /> {f.key}</p>
                  <p className="text-sm text-muted-foreground">{f.description}</p>
                </div>
                <Switch checked={f.enabled} onCheckedChange={(v) => toggleFlag(f.key, v)} aria-label={`Toggle ${f.key}`} />
              </div>
            ))}
            {!isLoading && (data?.flags ?? []).length === 0 && <p className="p-6 text-sm text-muted-foreground">No feature flags defined.</p>}
          </div>
        </TabsContent>

        <TabsContent value="audit" className="pt-4">
          <div className="surface divide-y">
            {(data?.actions ?? []).map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                <p className="flex items-center gap-2"><ScrollText className="h-4 w-4 text-muted-foreground" /><span className="font-medium">{a.action}</span>{a.target && <span className="text-muted-foreground">→ {a.target}</span>}</p>
                <span className="shrink-0 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
              </div>
            ))}
            {!isLoading && (data?.actions ?? []).length === 0 && <p className="p-6 text-sm text-muted-foreground">No admin actions recorded yet. Role changes and flag toggles are logged here.</p>}
          </div>
        </TabsContent>

        <TabsContent value="health" className="pt-4">
          <div className="surface divide-y">
            {health.map(([label, arr]) => (
              <div key={label} className="flex items-center justify-between gap-4 p-4 text-sm">
                <p className="flex items-center gap-2"><Activity className="h-4 w-4 text-muted-foreground" /> {label}</p>
                <Badge variant="secondary" className={arr ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}>
                  {arr ? `OK · ${arr.length} rows` : "Unreachable"}
                </Badge>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Checked {new Date().toLocaleString()}. Health checks never expose secrets.</p>
        </TabsContent>
      </Tabs>

      <Sheet open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader><SheetTitle>{user?.full_name || user?.email}</SheetTitle></SheetHeader>
          {user && data && (
            <div className="space-y-4 p-4 text-sm">
              <p className="text-muted-foreground">{user.email} · {user.education_level || "No education set"} · Skills: {user.skills || "—"}</p>
              {isAdmin(user.id) ? (
                <Button variant="outline" size="sm" onClick={() => setRole(user.id, user.email ?? user.id, false)}><ShieldX /> Remove admin</Button>
              ) : (
                <Button variant="hero" size="sm" onClick={() => setRole(user.id, user.email ?? user.id, true)}><ShieldPlus /> Make admin</Button>
              )}
              <Tabs defaultValue="jobs">
                <TabsList><TabsTrigger value="jobs">Jobs</TabsTrigger><TabsTrigger value="projects">Projects</TabsTrigger><TabsTrigger value="resumes">Resumes</TabsTrigger><TabsTrigger value="tests">Tests</TabsTrigger><TabsTrigger value="chats">Chats</TabsTrigger></TabsList>
                <TabsContent value="jobs" className="space-y-2">{data.jobs.filter((j) => j.user_id === sel).map((j) => <div key={j.id} className="flex justify-between rounded-lg border p-2"><span>{j.company} — {j.role}</span><Badge variant="secondary">{j.status}</Badge></div>)}</TabsContent>
                <TabsContent value="projects" className="space-y-2">{data.projects.filter((j) => j.user_id === sel).map((j) => <div key={j.id} className="rounded-lg border p-2"><p className="font-medium">{j.title}</p><p className="text-muted-foreground">{j.tech}</p></div>)}</TabsContent>
                <TabsContent value="resumes" className="space-y-2">{data.analyses.filter((j) => j.user_id === sel).map((j) => <div key={j.id} className="flex justify-between rounded-lg border p-2"><span>{j.target_role || "General"}</span><span className="font-semibold">{(j.result as { overall_score?: number })?.overall_score ?? "–"}/100</span></div>)}</TabsContent>
                <TabsContent value="tests" className="space-y-2">{data.attempts.filter((j) => j.user_id === sel).map((j) => <div key={j.id} className="flex justify-between rounded-lg border p-2"><span>{j.topic} ({j.level})</span><span className="font-semibold">{j.score}/{j.total}</span></div>)}</TabsContent>
                <TabsContent value="chats" className="space-y-2">{data.threads.filter((j) => j.user_id === sel).map((j) => <div key={j.id} className="rounded-lg border p-2">{j.title}</div>)}</TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
