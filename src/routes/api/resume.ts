import { createFileRoute } from "@tanstack/react-router";
import { toAiService } from "@/server/ai-service";

// Resume analysis with pgvector RAG — chunking, embeddings, retrieval and scoring
// all happen in the Python AI service.
export const Route = createFileRoute("/api/resume")({
  server: {
    handlers: {
      POST: ({ request }) => toAiService(request, "/resume"),
    },
  },
});
