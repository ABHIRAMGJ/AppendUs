import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  CODE_TTL_MINUTES,
  canResend,
  checkCode,
  hashCode,
  newCode,
  normaliseEmail,
} from "@/lib/signup-code";

const emailSchema = z.string().trim().email().max(254);

async function sendWithResend(to: string, code: string) {
  const key = process.env["RESEND_API_KEY"];
  if (!key) throw new Error("Email sending is not configured.");
  const from = process.env["RESEND_FROM"] ?? "AI CareerOS <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `${code} is your AI CareerOS code`,
      html: `<div style="font-family:Arial,sans-serif;background:#ffffff;padding:24px"><h2 style="color:#4f46e5">AI CareerOS</h2><p>Your sign-up code is:</p><p style="font-size:32px;font-weight:bold;letter-spacing:6px">${code}</p><p>It expires in ${CODE_TTL_MINUTES} minutes. If you didn't ask for this, ignore this email.</p></div>`,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Resend failed [${res.status}]: ${body}`);
    if (res.status === 403) {
      throw new Error("We couldn't email this address yet. The sender domain still needs to be verified.");
    }
    throw new Error("We couldn't send the code. Please try again.");
  }
}

export const sendSignupCode = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ email: emailSchema }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = normaliseEmail(data.email);
    const { data: existing } = await supabaseAdmin
      .from("signup_codes")
      .select("sent_at")
      .eq("email", email)
      .maybeSingle();
    if (existing && !canResend(existing.sent_at)) {
      throw new Error("Please wait a minute before asking for a new code.");
    }
    const code = newCode();
    const { error } = await supabaseAdmin.from("signup_codes").upsert({
      email,
      code_hash: await hashCode(email, code),
      expires_at: new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString(),
      sent_at: new Date().toISOString(),
      attempts: 0,
    });
    if (error) throw new Error("Could not create a code. Please try again.");
    await sendWithResend(email, code);
    return { ok: true };
  });

export const verifyCodeAndCreateAccount = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        email: emailSchema,
        code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
        password: z.string().min(8, "Password must be at least 8 characters").max(72),
        name: z.string().trim().min(1).max(100),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = normaliseEmail(data.email);
    const { data: row } = await supabaseAdmin
      .from("signup_codes")
      .select("code_hash, expires_at, attempts")
      .eq("email", email)
      .maybeSingle();
    const result = await checkCode(row, email, data.code);
    if (result !== "ok") {
      if (result === "wrong" && row) {
        await supabaseAdmin.from("signup_codes").update({ attempts: row.attempts + 1 }).eq("email", email);
      }
      const messages = {
        missing: "Ask for a code first.",
        expired: "This code has expired. Ask for a new one.",
        locked: "Too many wrong tries. Ask for a new code.",
        wrong: "That code is not correct.",
      } as const;
      throw new Error(messages[result]);
    }
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.name },
    });
    if (error) {
      if (/already|registered|exists/i.test(error.message)) {
        throw new Error("An account with this email already exists. Please log in.");
      }
      throw new Error(error.message);
    }
    await supabaseAdmin.from("signup_codes").delete().eq("email", email);
    return { ok: true };
  });
