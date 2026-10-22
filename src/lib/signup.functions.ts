import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  CODE_TTL_MINUTES,
  canResend,
  checkCode,
  hashCode,
  newCode,
  normaliseEmail,
} from "@/lib/signup-code";

const emailSchema = z.string().trim().email().max(254);
const codeSchema = z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code");

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function sendWithResend(to: string, code: string) {
  const key = process.env["RESEND_API_KEY"];
  if (!key) throw new Error("Email sending is not configured.");
  const from = process.env["RESEND_FROM"] ?? "AppendUs <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `${code} is your AppendUs code`,
      html: `<div style="font-family:Arial,sans-serif;background:#ffffff;padding:24px"><h2 style="color:#4f46e5">AppendUs</h2><p>Your verification code is:</p><p style="font-size:32px;font-weight:bold;letter-spacing:6px">${code}</p><p>It expires in ${CODE_TTL_MINUTES} minutes. If you didn't ask for this, ignore this email.</p></div>`,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Resend failed [${res.status}]: ${body}`);
    if (res.status === 403) {
      throw new Error("We couldn't email this address yet — the sender domain still needs to be verified in Resend.");
    }
    throw new Error("We couldn't send the code. Please try again.");
  }
}

async function issueCode(rawEmail: string) {
  const db = await admin();
  const email = normaliseEmail(rawEmail);
  const { data: existing } = await db.from("signup_codes").select("sent_at").eq("email", email).maybeSingle();
  if (existing && !canResend(existing.sent_at)) {
    throw new Error("Please wait a minute before asking for a new code.");
  }
  const code = newCode();
  const { error } = await db.from("signup_codes").upsert({
    email,
    code_hash: await hashCode(email, code),
    expires_at: new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString(),
    sent_at: new Date().toISOString(),
    attempts: 0,
  });
  if (error) throw new Error("Could not create a code. Please try again.");
  await sendWithResend(email, code);
}

async function consumeCode(rawEmail: string, code: string) {
  const db = await admin();
  const email = normaliseEmail(rawEmail);
  const { data: row } = await db
    .from("signup_codes")
    .select("code_hash, expires_at, attempts")
    .eq("email", email)
    .maybeSingle();
  const result = await checkCode(row, email, code);
  if (result === "ok") {
    await db.from("signup_codes").delete().eq("email", email);
    return;
  }
  if (result === "wrong" && row) {
    await db.from("signup_codes").update({ attempts: row.attempts + 1 }).eq("email", email);
  }
  const messages = {
    missing: "Ask for a code first.",
    expired: "This code has expired. Ask for a new one.",
    locked: "Too many wrong tries. Ask for a new code.",
    wrong: "That code is not correct.",
  } as const;
  throw new Error(messages[result]);
}

async function markVerified(userId: string) {
  const db = await admin();
  await db.from("email_verified").upsert({ user_id: userId });
}

// ---- Email sign-up (not signed in yet) ----

export const sendSignupCode = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ email: emailSchema }).parse(d))
  .handler(async ({ data }) => {
    await issueCode(data.email);
    return { ok: true };
  });

export const verifyCodeAndCreateAccount = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        email: emailSchema,
        code: codeSchema,
        password: z.string().min(8, "Password must be at least 8 characters").max(72),
        name: z.string().trim().min(1).max(100),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await consumeCode(data.email, data.code);
    const db = await admin();
    const { data: created, error } = await db.auth.admin.createUser({
      email: normaliseEmail(data.email),
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
    if (created.user) await markVerified(created.user.id);
    return { ok: true };
  });

// ---- Signed-in users (e.g. Google) who still need to verify their email ----

export const getMyVerification = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("email_verified")
      .select("user_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    return { verified: !!data, email: String(context.claims.email ?? "") };
  });

export const sendMyCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = String(context.claims.email ?? "");
    if (!email) throw new Error("Your account has no email address.");
    await issueCode(email);
    return { ok: true };
  });

export const verifyMyCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ code: codeSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const email = String(context.claims.email ?? "");
    if (!email) throw new Error("Your account has no email address.");
    await consumeCode(email, data.code);
    await markVerified(context.userId);
    return { ok: true };
  });
