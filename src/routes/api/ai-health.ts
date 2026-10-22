import { createFileRoute } from "@tanstack/react-router";
import { checkAiService } from "@/server/ai-service";

// Reports on the Python AI service for the Admin console health tab.
// Only status is exposed — never keys, URLs or credentials.
export const Route = createFileRoute("/api/ai-health")({
  server: {
    handlers: {
      GET: async () => Response.json(await checkAiService()),
    },
  },
});
