import { createFileRoute } from "@tanstack/react-router";
import { toAiService } from "@/server/ai-service";

// Long-form generators: learning plan, company guide, code review, pathways, career.
export const Route = createFileRoute("/api/generate")({
  server: {
    handlers: {
      POST: ({ request }) => toAiService(request, "/generate"),
    },
  },
});
