import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { aiServiceUrl, checkAiService, toAiService } from "@/server/ai-service";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.stubGlobal("fetch", globalThis.fetch);
  delete process.env.AI_SERVICE_URL;
});

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? sourceFiles(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}

describe("AI requests go to the Python service", () => {
  it("uses the local service when no address is configured", () => {
    expect(aiServiceUrl()).toBe("http://127.0.0.1:8100");
  });

  it("forwards the signed-in session and the caller's body to the service", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    vi.stubGlobal(
      "fetch",
      async (url: string | URL, init: RequestInit) => {
        calls.push({ url: String(url), init });
        return new Response("analysed", {
          status: 200,
          headers: { "content-type": "application/json", "x-vercel-ai-ui-message-stream": "v1" },
        });
      },
    );

    const request = new Request("http://localhost/api/resume", {
      method: "POST",
      headers: { authorization: "Bearer session-token", "content-type": "application/json" },
      body: JSON.stringify({ resume: "x".repeat(200), role: "Frontend Engineer" }),
    });

    const response = await toAiService(request, "/resume");

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("http://127.0.0.1:8100/resume");
    expect((calls[0].init.headers as Record<string, string>)["authorization"]).toBe("Bearer session-token");
    const sent = JSON.parse(new TextDecoder().decode(calls[0].init.body as ArrayBuffer));
    expect(sent.role).toBe("Frontend Engineer");
    expect(await response.text()).toBe("analysed");
    expect(response.headers.get("x-vercel-ai-ui-message-stream")).toBe("v1");
  });

  it("tells the user the AI service is offline instead of failing silently", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("connection refused");
    });

    const response = await toAiService(
      new Request("http://localhost/api/quiz", { method: "POST", body: "{}" }),
      "/quiz",
    );

    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain("AI service is offline");
  });

  it("reports a degraded service when its database is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response(JSON.stringify({ runtime: "python-fastapi", database: "unreachable" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    const status = await checkAiService();
    expect(status.ok).toBe(false);
    expect(status.detail).toContain("unreachable");
  });

  it("keeps the AI key out of the app — only the Python service reads it", () => {
    const offenders = sourceFiles("src")
      .filter((file) => /\.(ts|tsx)$/.test(file) && !file.startsWith(join("src", "test")))
      .filter((file) => {
        const text = readFileSync(file, "utf8");
        return text.includes("LOVABLE_API_KEY") || text.includes("ai.gateway.lovable.dev");
      });
    expect(offenders).toEqual([]);
  });
});
