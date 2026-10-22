import { useQuery } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import { supabase } from "@/integrations/supabase/client";
import { currentUserId } from "@/lib/data";

export function useThreads() {
  return useQuery({
    queryKey: ["mentor-threads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mentor_threads").select("id,title,updated_at").order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export async function createThread() {
  const { data, error } = await supabase.from("mentor_threads").insert({ user_id: await currentUserId() }).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function loadMessages(threadId: string): Promise<UIMessage[]> {
  const { data, error } = await supabase.from("mentor_messages").select("message").eq("thread_id", threadId).order("created_at");
  if (error) throw error;
  return (data ?? []).map((r) => r.message as unknown as UIMessage);
}
