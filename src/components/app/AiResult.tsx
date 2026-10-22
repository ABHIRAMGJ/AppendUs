import { useRef, useState } from "react";
import { toast } from "sonner";
import { MessageResponse } from "@/components/ai-elements/message";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { streamGenerate } from "@/lib/data";

export function useGenerate(task: string) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const ctrl = useRef<AbortController | null>(null);
  async function run(input: Record<string, string>) {
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setText("");
    setLoading(true);
    try {
      await streamGenerate(task, input, setText, c.signal);
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  return { text, loading, run, stop: () => ctrl.current?.abort() };
}

export function AiOutput({ text, loading, empty }: { text: string; loading: boolean; empty: string }) {
  if (!text && loading) return <div className="p-6"><Shimmer>Generating with AI...</Shimmer></div>;
  if (!text) return <p className="p-6 text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="p-6 text-sm leading-relaxed">
      <MessageResponse>{text}</MessageResponse>
      <p className="mt-6 border-t pt-3 text-xs text-muted-foreground">AI-generated guidance. Verify important details independently.</p>
    </div>
  );
}
