import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { getMyVerification, sendMyCode, verifyMyCode } from "@/lib/signup.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/lib/theme";

/** Every signed-in account (including Google) must confirm its email with a 6-digit code once. */
export function EmailGate({ children }: { children: ReactNode }) {
  const getStatus = useServerFn(getMyVerification);
  const { data, isLoading, isError } = useQuery({ queryKey: ["email-verified"], queryFn: () => getStatus() });
  if (isLoading) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;
  if (isError || !data) return <>{children}</>;
  if (data.verified) return <>{children}</>;
  return <VerifyScreen email={data.email} />;
}

function VerifyScreen({ email }: { email: string }) {
  const send = useServerFn(sendMyCode);
  const verify = useServerFn(verifyMyCode);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const started = useRef(false);

  async function sendCode() {
    try {
      await send();
      setSent(true);
      toast.success(`Code sent to ${email}`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void sendCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await verify({ data: { code } });
      toast.success("Email verified — welcome!");
      await qc.invalidateQueries({ queryKey: ["email-verified"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col px-6 py-6">
      <div className="flex items-center justify-between"><Logo /><ThemeToggle /></div>
      <div className="mx-auto flex w-full max-w-sm flex-1 items-center justify-center py-10">
        <div className="surface w-full p-8">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-accent text-accent-foreground">
          <Mail className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-center text-2xl font-bold">Verify your email</h1>
        <p className="mt-2 text-center text-muted-foreground">
          {sent ? "We sent a 6-digit code to " : "We'll send a 6-digit code to "}
          <span className="font-semibold text-foreground">{email}</span>. Check spam too.
        </p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="verify-code">6-digit code</Label>
            <Input id="verify-code" inputMode="numeric" autoComplete="one-time-code" required maxLength={6} pattern="\d{6}" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
          </div>
          <Button type="submit" variant="hero" className="h-11 w-full" disabled={busy}>{busy ? "Checking..." : "Verify"}</Button>
        </form>
        <div className="mt-4 flex justify-between text-sm">
          <button type="button" onClick={sendCode} className="font-medium text-primary hover:underline">Resend code</button>
          <button type="button" onClick={signOut} className="font-medium text-foreground/70 hover:text-foreground hover:underline">Sign out</button>
        </div>
        </div>
      </div>
    </div>
  );
}
