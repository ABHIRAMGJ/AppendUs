// Rules for the email sign-up code (pure, so they can be tested).
export const CODE_TTL_MINUTES = 10;
export const RESEND_WAIT_SECONDS = 60;
export const MAX_ATTEMPTS = 5;

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function newCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
  return String(n % 1_000_000).padStart(6, "0");
}

export async function hashCode(email: string, code: string): Promise<string> {
  const data = new TextEncoder().encode(`${normaliseEmail(email)}:${code.trim()}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export type CodeRow = { code_hash: string; expires_at: string; attempts: number };

export type CheckResult = "ok" | "missing" | "expired" | "locked" | "wrong";

export async function checkCode(row: CodeRow | null, email: string, code: string, now = new Date()): Promise<CheckResult> {
  if (!row) return "missing";
  if (row.attempts >= MAX_ATTEMPTS) return "locked";
  if (new Date(row.expires_at).getTime() < now.getTime()) return "expired";
  return (await hashCode(email, code)) === row.code_hash ? "ok" : "wrong";
}

export function canResend(sentAt: string | null, now = new Date()): boolean {
  if (!sentAt) return true;
  return now.getTime() - new Date(sentAt).getTime() >= RESEND_WAIT_SECONDS * 1000;
}
