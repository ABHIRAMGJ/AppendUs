import { createFileRoute } from "@tanstack/react-router";
import { toAiService } from "@/server/ai-service";

// Skill assessment quiz generation (validated in Python before it is returned).
export const Route = createFileRoute("/api/quiz")({
  server: {
    handlers: {
      POST: ({ request }) => toAiService(request, "/quiz"),
    },
  },
});
