import { describe, expect, it } from "vitest";
import { canResend, checkCode, hashCode, newCode, MAX_ATTEMPTS } from "@/lib/signup-code";

const email = "user@example.com";

describe("sign-up email code", () => {
  it("is always 6 digits", () => {
    for (let i = 0; i < 50; i++) expect(newCode()).toMatch(/^\d{6}$/);
  });

  it("accepts the right code and rejects a wrong one", async () => {
    const row = { code_hash: await hashCode(email, "123456"), expires_at: new Date(Date.now() + 60_000).toISOString(), attempts: 0 };
    expect(await checkCode(row, email, "123456")).toBe("ok");
    expect(await checkCode(row, email, "654321")).toBe("wrong");
  });

  it("expires after its time is up", async () => {
    const row = { code_hash: await hashCode(email, "123456"), expires_at: new Date(Date.now() - 1000).toISOString(), attempts: 0 };
    expect(await checkCode(row, email, "123456")).toBe("expired");
  });

  it("locks after 5 wrong tries", async () => {
    const row = { code_hash: await hashCode(email, "123456"), expires_at: new Date(Date.now() + 60_000).toISOString(), attempts: MAX_ATTEMPTS };
    expect(await checkCode(row, email, "123456")).toBe("locked");
  });

  it("allows a new code only after 60 seconds", () => {
    const now = new Date();
    expect(canResend(new Date(now.getTime() - 30_000).toISOString(), now)).toBe(false);
    expect(canResend(new Date(now.getTime() - 61_000).toISOString(), now)).toBe(true);
  });
});
