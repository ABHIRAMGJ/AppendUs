import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { createThread } from "@/lib/mentor";

export const Route = createFileRoute("/_authenticated/mentor/")({
  beforeLoad: async () => {
    const { data } = await supabase.from("mentor_threads").select("id").order("updated_at", { ascending: false }).limit(1);
    const id = data?.[0]?.id ?? (await createThread());
    throw redirect({ to: "/mentor/$threadId", params: { threadId: id }, replace: true });
  },
});
