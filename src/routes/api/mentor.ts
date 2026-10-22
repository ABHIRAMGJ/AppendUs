import { createFileRoute } from "@tanstack/react-router";
import { toAiService } from "@/server/ai-service";

// AI Mentor conversation (threads and messages are stored by the Python service).
export const Route = createFileRoute("/api/mentor")({
  server: {
    handlers: {
      POST: ({ request }) => toAiService(request, "/mentor"),
    },
  },
});
