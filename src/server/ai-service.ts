// Forwards AI requests from the app to the Python + FastAPI AI service (ai-service/).
// The AI key lives only in that service, so no key is ever read in the app.

const DEFAULT_URL = "http://127.0.0.1:8100";

export function aiServiceUrl(): string {
  return (process.env["AI_SERVICE_URL"] ?? DEFAULT_URL).replace(/\/+$/, "");
}

const OFFLINE =
  "The AI service is offline. Start it with: docker compose up --build ai-service";

/** POST the caller's body and session to the Python service and stream the reply back. */
export async function toAiService(request: Request, path: string): Promise<Response> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const auth = request.headers.get("authorization");
  if (auth) headers["authorization"] = auth;

  let body: ArrayBuffer;
  try {
    body = await request.arrayBuffer();
  } catch {
    // The browser closed the connection before the upload finished.
    return Response.json({ error: "The request was cancelled. Please try again." }, { status: 499 });
  }

  let upstream: Response;
  try {
    // Not tied to request.signal: a dropped browser connection must not crash the route.
    upstream = await fetch(aiServiceUrl() + path, { method: "POST", headers, body });
  } catch (error) {
    console.error("AI service request failed:", error);
    return Response.json({ error: OFFLINE }, { status: 503 });
  }

  const out = new Headers();
  for (const name of ["content-type", "x-vercel-ai-ui-message-stream", "cache-control"]) {
    const value = upstream.headers.get(name);
    if (value) out.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers: out });
}

/** Used by the Admin console health tab to report on the Python service. */
export async function checkAiService(): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetch(`${aiServiceUrl()}/health`, { method: "GET" });
    const data = (await res.json().catch(() => null)) as {
      runtime?: string;
      database?: string;
      gateway?: string;
    } | null;
    if (!res.ok) return { ok: false, detail: "AI service returned an error" };
    // "rest" is the healthy state: the service reads data through the REST API as the caller.
    if (data?.database && data.database !== "ok" && data.database !== "rest") {
      return { ok: false, detail: `AI service database: ${data.database}` };
    }
    return { ok: true, detail: data?.runtime ?? "AI service reachable" };
  } catch {
    return { ok: false, detail: OFFLINE };
  }
}
