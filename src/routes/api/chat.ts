import { createFileRoute } from "@tanstack/react-router";
import { toAiService } from "@/server/ai-service";

// Global Assistant / interview / quiz chat — answered by the Python AI service.
export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: ({ request }) => toAiService(request, "/chat"),
    },
  },
});
