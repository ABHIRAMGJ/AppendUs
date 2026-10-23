import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/lib/theme";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — AppendUs" },
      { name: "description", content: "Choose a new password for your AppendUs account." },
      { property: "og:title", content: "Set a new password — AppendUs" },
      { property: "og:description", content: "Choose a new password for your AppendUs account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reset,
});

function Reset() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState<"checking" | "ok" | "invalid">("checking");

  useEffect(() => {
    let done = false;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        done = true;
        setReady("ok");
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) { done = true; setReady("ok"); }
    });
    const t = setTimeout(() => { if (!done) setReady("invalid"); }, 4000);
    return () => { sub.subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (pw !== pw2) { toast.error("Passwords don't match"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password saved — you can now log in with your email and password.");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen bg-gradient-hero px-6 py-6">
      <div className="flex items-center justify-between"><Logo /><ThemeToggle /></div>
      {ready === "invalid" ? (
        <div className="surface mx-auto mt-20 max-w-sm space-y-4 p-8 text-center">
          <h1 className="text-2xl font-bold">Link expired</h1>
          <p className="text-sm text-muted-foreground">This reset link is no longer valid. Ask for a new one and open it from the newest email.</p>
          <Button asChild variant="hero" className="h-11 w-full"><Link to="/auth" search={{ mode: "forgot" }}>Send a new link</Link></Button>
        </div>
      ) : (
        <form onSubmit={submit} className="surface mx-auto mt-20 max-w-sm space-y-4 p-8">
          <h1 className="text-2xl font-bold">Set new password</h1>
          <p className="text-sm text-muted-foreground">After this you can log in with your email and this password.</p>
          <div className="space-y-1.5"><Label htmlFor="p1">New password</Label><Input id="p1" type="password" minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 8 characters" /></div>
          <div className="space-y-1.5"><Label htmlFor="p2">Confirm password</Label><Input id="p2" type="password" minLength={8} required value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
          <Button type="submit" variant="hero" className="h-11 w-full" disabled={loading || ready !== "ok"}>
            {ready === "checking" ? "Checking link..." : loading ? "Saving..." : "Save password"}
          </Button>
        </form>
      )}
    </div>
  );
}
