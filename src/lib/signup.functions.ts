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

class EmailUnavailableError extends Error {}

async function sendVerificationEmail(to: string, code: string) {
  const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
  let result;
  try {
    result = await sendTemplateEmail("verification-code", to, {
      templateData: { code, minutes: CODE_TTL_MINUTES },
      idempotencyKey: `signup-code-${to}-${code}`,
    });
  } catch (err) {
    // Sender domain not verified yet (or email off): the app falls back to a confirmation link.
    console.error("verification-code send failed", err);
    throw new EmailUnavailableError("Email codes are unavailable right now.");
  }
  if (!result.sent) {
    throw new Error("We couldn't send the code to this address. Please use a different email.");
  }
}

/** Returns "code" when the 6-digit email went out, "link" when code emails can't be sent. */
async function issueCode(rawEmail: string): Promise<"code" | "link"> {
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
  try {
    await sendVerificationEmail(email, code);
    return "code";
  } catch (err) {
    if (err instanceof EmailUnavailableError) {
      await db.from("signup_codes").delete().eq("email", email);
      return "link";
    }
    throw err;
  }
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
    const mode = await issueCode(data.email);
    return { ok: true, mode };
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
    const email = String(context.claims.email ?? "");
    const { data } = await context.supabase
      .from("email_verified")
      .select("user_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (data) return { verified: true, email };
    // Email already confirmed by sign-in itself (Google, or the confirmation link): record it once.
    const db = await admin();
    const { data: found } = await db.auth.admin.getUserById(context.userId);
    if (found.user?.email_confirmed_at) {
      await markVerified(context.userId);
      return { verified: true, email };
    }
    return { verified: false, email };
  });

export const sendMyCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = String(context.claims.email ?? "");
    if (!email) throw new Error("Your account has no email address.");
    const mode = await issueCode(email);
    if (mode === "link") throw new Error("We can't email codes right now. Please try again later.");
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
