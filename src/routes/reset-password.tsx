import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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
      { title: "Set a new password — AI CareerOS" },
      { name: "description", content: "Choose a new password for your AI CareerOS account." },
      { property: "og:title", content: "Set a new password — AI CareerOS" },
      { property: "og:description", content: "Choose a new password for your AI CareerOS account." },
    ],
  }),
  component: Reset,
});

function Reset() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw !== pw2) { toast.error("Passwords don't match"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen bg-gradient-hero px-6 py-6">
      <div className="flex items-center justify-between"><Logo /><ThemeToggle /></div>
      <form onSubmit={submit} className="surface mx-auto mt-20 max-w-sm space-y-4 p-8">
        <h1 className="text-2xl font-bold">Set new password</h1>
        <div className="space-y-1.5"><Label htmlFor="p1">New password</Label><Input id="p1" type="password" minLength={6} required value={pw} onChange={(e) => setPw(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="p2">Confirm password</Label><Input id="p2" type="password" minLength={6} required value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
        <Button type="submit" variant="hero" className="h-11 w-full" disabled={loading}>Reset Password</Button>
      </form>
    </div>
  );
}
