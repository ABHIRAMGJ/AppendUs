import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { sendSignupCode, verifyCodeAndCreateAccount } from "@/lib/signup.functions";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/lib/theme";
import hero from "@/assets/hero-student.jpg";

const search = z.object({ mode: z.enum(["signin", "signup", "forgot"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Sign in — AppendUs" },
      { name: "description", content: "Sign in or create your free AppendUs account." },
      { property: "og:title", content: "Sign in — AppendUs" },
      { property: "og:description", content: "Sign in or create your free AppendUs account." },
    ],
  }),
  component: AuthPage,
});

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
    </svg>
  );
}

function AuthPage() {
  const { mode = "signin" } = Route.useSearch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [linkMode, setLinkMode] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", code: "", confirm: "" });
  const [googleBusy, setGoogleBusy] = useState(false);
  const sendCode = useServerFn(sendSignupCode);
  const createAccount = useServerFn(verifyCodeAndCreateAccount);

  // Coming back from Google (or already signed in): go straight into the app.
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) navigate({ to: "/dashboard", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate({ to: "/dashboard", replace: true });
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function resendCode() {
    if (!codeSentTo) return;
    try {
      await sendCode({ data: { email: codeSentTo } });
      toast.success("A new code is on its way.");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup" && !codeSentTo) {
        const res = await sendCode({ data: { email: form.email } });
        setCodeSentTo(form.email);
        if (res.mode === "link") {
          setLinkMode(true);
          toast.success("Choose a password — we'll email you a confirmation link.");
        } else {
          setLinkMode(false);
          toast.success("We emailed you a 6-digit code.");
        }
      } else if (mode === "signup" && codeSentTo && linkMode) {
        if (form.password !== form.confirm) throw new Error("Passwords don't match.");
        const { data, error } = await supabase.auth.signUp({
          email: codeSentTo.trim(),
          password: form.password,
          options: { emailRedirectTo: window.location.origin + "/auth", data: { full_name: form.name } },
        });
        if (error) throw error;
        if (data.user && (data.user.identities?.length ?? 0) === 0) {
          throw new Error("An account with this email already exists. Please log in.");
        }
        setSent(codeSentTo);
      } else if (mode === "signup" && codeSentTo) {
        if (form.password !== form.confirm) throw new Error("Passwords don't match.");
        await createAccount({ data: { email: codeSentTo, code: form.code, password: form.password, name: form.name } });
        const { error } = await supabase.auth.signInWithPassword({ email: codeSentTo, password: form.password });
        if (error) throw error;
        toast.success("Email verified — welcome!");
        navigate({ to: "/dashboard" });
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
          redirectTo: window.location.origin + "/reset-password",
        });
        if (error) throw error;
        toast.success("Reset link sent — check your email.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
        if (error) {
          if (/confirm/i.test(error.message)) {
            setSent(form.email);
            throw new Error("Please verify your email first. Check your inbox and spam folder, or resend the link.");
          }
          if (/invalid login credentials/i.test(error.message)) {
            throw new Error(
              "Wrong email or password. If you joined with Google, use \"Continue with Google\" — or tap \"Forgot password?\" to create a password.",
            );
          }
          throw error;
        }
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (!sent) return;
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: sent,
      options: { emailRedirectTo: window.location.origin + "/dashboard" },
    });
    if (error) toast.error(error.message);
    else toast.success("Verification email sent again. Check your inbox and spam folder.");
  }

  async function google() {
    setGoogleBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
      if (result.error) {
        toast.error("Google sign-in failed. Please try again.");
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/dashboard", replace: true });
    } catch {
      toast.error("Google sign-in failed. Please try again.");
    } finally {
      setGoogleBusy(false);
    }
  }

  const title = mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Welcome back";
  const subtitle =
    mode === "signup" ? "Start your career journey with AI" : mode === "forgot" ? "Enter your email to receive a reset link" : "Login to your account";

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-6 sm:px-12">
        <div className="flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-accent text-accent-foreground">
                <Mail className="h-8 w-8" />
              </div>
              <h1 className="mt-6 text-2xl font-bold">Verify your email</h1>
              <p className="mt-2 text-muted-foreground">
                We've sent a confirmation link to <span className="font-semibold text-foreground">{sent}</span>. Click it to activate your account. It can take a few minutes — please check your spam folder too.
              </p>
              <div className="mt-6 flex flex-col gap-2">
                <Button variant="hero" onClick={resend}>Resend verification email</Button>
                <Button variant="outline" onClick={() => setSent(null)}>Use a different email</Button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold">{title}</h1>
              <p className="mt-2 text-muted-foreground">{subtitle}</p>
              <form onSubmit={submit} className="mt-8 space-y-4">
                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Full name</Label>
                    <Input id="name" required value={form.name} onChange={set("name")} placeholder="Alex Kumar" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <Input id="email" type="email" required disabled={!!codeSentTo} value={form.email} onChange={set("email")} placeholder="you@example.com" />
                </div>
                {mode === "signup" && codeSentTo && (
                  <>
                    {linkMode ? (
                      <p className="text-xs text-muted-foreground">After you create the account we'll email a confirmation link to {codeSentTo}. <button type="button" className="text-primary hover:underline" onClick={() => { setCodeSentTo(null); setLinkMode(false); }}>Change email</button></p>
                    ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="code">6-digit code</Label>
                        <button type="button" onClick={resendCode} className="text-xs font-medium text-primary hover:underline">Resend code</button>
                      </div>
                      <Input id="code" inputMode="numeric" autoComplete="one-time-code" required maxLength={6} pattern="\d{6}" value={form.code} onChange={set("code")} placeholder="123456" />
                      <p className="text-xs text-muted-foreground">Sent to {codeSentTo}. Check spam too. <button type="button" className="text-primary hover:underline" onClick={() => setCodeSentTo(null)}>Change email</button></p>
                    </div>
                    )}
                    <div className="space-y-1.5">
                      <Label htmlFor="password">Set a password</Label>
                      <Input id="password" type="password" required minLength={8} value={form.password} onChange={set("password")} placeholder="At least 8 characters" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="confirm">Confirm password</Label>
                      <Input id="confirm" type="password" required minLength={8} value={form.confirm} onChange={set("confirm")} placeholder="••••••••" />
                    </div>
                  </>
                )}
                {mode === "signin" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <Link to="/auth" search={{ mode: "forgot" }} className="text-xs font-medium text-primary hover:underline">
                        Forgot password?
                      </Link>
                    </div>
                    <Input id="password" type="password" required minLength={6} value={form.password} onChange={set("password")} placeholder="••••••••" />
                  </div>
                )}
                <Button type="submit" variant="hero" className="h-11 w-full" disabled={loading}>
                  {loading
                    ? "Please wait..."
                    : mode === "signup"
                      ? codeSentTo ? "Verify & Create Account" : "Send Code"
                      : mode === "forgot" ? "Send Reset Link" : "Login"}
                </Button>
              </form>
              {mode !== "forgot" && (
                <>
                  <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="h-px flex-1 bg-border" /> Or continue with <span className="h-px flex-1 bg-border" />
                  </div>
                  <Button variant="outline" className="h-11 w-full" onClick={google} disabled={googleBusy}>
                    <GoogleIcon /> {googleBusy ? "Opening Google..." : "Continue with Google"}
                  </Button>
                </>
              )}
              <p className="mt-6 text-center text-sm text-muted-foreground">
                {mode === "signup" ? (
                  <>Already have an account? <Link to="/auth" className="font-semibold text-primary">Login</Link></>
                ) : mode === "forgot" ? (
                  <Link to="/auth" className="font-semibold text-primary">Back to login</Link>
                ) : (
                  <>Don't have an account? <Link to="/auth" search={{ mode: "signup" }} className="font-semibold text-primary">Sign up</Link></>
                )}
              </p>
            </>
          )}
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-gradient-primary lg:block">
        <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80 mix-blend-luminosity" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/30 to-transparent" />
        <div className="absolute bottom-0 p-12 text-primary-foreground">
          <h2 className="text-3xl font-bold">Plan. Learn. Prove. Get hired.</h2>
          <p className="mt-2 max-w-md opacity-90">Join learners using AppendUs to turn career goals into real progress.</p>
        </div>
      </div>
    </div>
  );
}
