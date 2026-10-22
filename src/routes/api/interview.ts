import { createFileRoute } from "@tanstack/react-router";
import { toAiService } from "@/server/ai-service";

// Mock interviews: generate / evaluate / proctor — handled by the Python AI service.
export const Route = createFileRoute("/api/interview")({
  server: {
    handlers: {
      POST: ({ request }) => toAiService(request, "/interview"),
    },
  },
});
