import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Moon, Settings as SettingsIcon, Sun } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { currentUserId, useProfile } from "@/lib/data";
import { useTheme } from "@/lib/theme";
import { PageHeader } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings & Profile — AppendUs" }, { name: "description", content: "Manage your profile, appearance and account." }] }),
  component: Settings,
});

const EDU = ["10th", "Intermediate / 12th", "Diploma", "Bachelor's / B.Tech", "MBA", "M.Tech / Master's", "PhD", "Working professional"];

function Settings() {
  const { data: profile } = useProfile();
  const { theme, setTheme } = useTheme();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [f, setF] = useState({ full_name: "", education_level: "", target_role: "", skills: "", weekly_hours: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) setF({
      full_name: profile.full_name ?? "", education_level: profile.education_level ?? "", target_role: profile.target_role ?? "",
      skills: profile.skills ?? "", weekly_hours: profile.weekly_hours ? String(profile.weekly_hours) : "",
    });
  }, [profile]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const id = await currentUserId();
    const { error } = await supabase.from("profiles").upsert({
      id, full_name: f.full_name || null, education_level: f.education_level || null, target_role: f.target_role || null,
      skills: f.skills || null, weekly_hours: f.weekly_hours ? Number(f.weekly_hours) : null, updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Profile saved");
  }

  async function deleteData() {
    const tables = ["mentor_threads", "job_applications", "projects", "resume_analyses"] as const;
    for (const t of tables) {
      const { error } = await supabase.from(t).delete().not("id", "is", null);
      if (error) { toast.error(error.message); return; }
    }
    localStorage.removeItem("careeros-last-plan");
    localStorage.removeItem("careeros-assistant-v1");
    qc.invalidateQueries();
    toast.success("Your career data was deleted");
  }

  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader icon={SettingsIcon} title="Settings" description="Manage your account and preferences" />

      <form onSubmit={save} className="surface space-y-4 p-6">
        <h2 className="font-semibold">Profile</h2>
        <p className="-mt-2 text-sm text-muted-foreground">Used by the AI Mentor and Learning Plan to personalise advice.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Full name</Label><Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Education level</Label>
            <Select value={f.education_level} onValueChange={(v) => setF({ ...f, education_level: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{EDU.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Target role</Label><Input value={f.target_role} onChange={(e) => setF({ ...f, target_role: e.target.value })} placeholder="Full Stack Developer" /></div>
          <div className="space-y-1.5"><Label>Study hours per week</Label><Input type="number" min={0} max={100} value={f.weekly_hours} onChange={(e) => setF({ ...f, weekly_hours: e.target.value })} /></div>
        </div>
        <div className="space-y-1.5"><Label>Current skills</Label><Input value={f.skills} onChange={(e) => setF({ ...f, skills: e.target.value })} placeholder="Python, SQL, Git" /></div>
        <Button type="submit" variant="hero" disabled={saving}>{saving ? "Saving..." : "Save profile"}</Button>
      </form>

      <div className="surface p-6">
        <h2 className="font-semibold">Appearance</h2>
        <div className="mt-4 grid grid-cols-2 gap-4">
          {([["light", Sun, "Light"], ["dark", Moon, "Dark"]] as const).map(([v, Icon, l]) => (
            <button key={v} onClick={() => setTheme(v)} className={cn("flex items-center gap-3 rounded-xl border-2 p-4 text-left", theme === v ? "border-primary bg-accent" : "hover:bg-muted")}>
              <Icon className="h-5 w-5" /><span className="font-medium">{l} mode</span>
            </button>
          ))}
        </div>
      </div>

      <PasswordCard />

      <div className="surface space-y-3 p-6">
        <h2 className="font-semibold">Account & privacy</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={signOut}>Sign out</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="destructive">Delete my career data</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete all your data?</AlertDialogTitle>
                <AlertDialogDescription>This permanently removes your mentor conversations, job applications, projects and resume analyses. This can't be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={deleteData}>Delete</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
