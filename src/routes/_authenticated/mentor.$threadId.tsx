import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GraduationCap } from "lucide-react";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { loadMessages } from "@/lib/mentor";
import { Shimmer } from "@/components/ai-elements/shimmer";

export const Route = createFileRoute("/_authenticated/mentor/$threadId")({
  component: Thread,
});

function Thread() {
  const { threadId } = Route.useParams();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["mentor-messages", threadId],
    queryFn: () => loadMessages(threadId),
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
  const onChange = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["mentor-threads"] });
  }, [qc]);

  if (isLoading) return <div className="p-6"><Shimmer>Loading conversation...</Shimmer></div>;
  if (error) return <p className="p-6 text-sm text-destructive">Couldn't load this conversation.</p>;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-primary text-primary-foreground"><GraduationCap className="h-5 w-5" /></div>
        <div><p className="font-display text-sm font-semibold">CareerOS AI Mentor</p><p className="text-xs text-muted-foreground">Your personal career coach</p></div>
      </div>
      <ChatPanel
        key={threadId}
        id={threadId}
        api="/api/mentor"
        initialMessages={data}
        onMessagesChange={onChange}
        className="min-h-0 flex-1"
        emptyIcon={<div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow"><GraduationCap className="h-7 w-7" /></div>}
        emptyTitle="Hi! I'm your AI Mentor"
        emptyDescription="I can help with career guidance, learning plans, resume tips, interview prep, coding and more. What would you like to work on today?"
        suggestions={["Career options after B.Tech CSE", "Create a 3-month DSA plan", "Start a mock interview for Java developer", "Explain RAG simply"]}
      />
    </div>
  );
}
