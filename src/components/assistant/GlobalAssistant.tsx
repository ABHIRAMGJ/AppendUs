import { useCallback, useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import type { UIMessage } from "ai";
import { MessageCircle, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { LogoMark } from "@/components/brand/Logo";

const KEY = "careeros-assistant-v1";

export function GlobalAssistant() {
  const [open, setOpen] = useState(false);
  const [initial, setInitial] = useState<UIMessage[] | null>(null);
  const [chatKey, setChatKey] = useState(0);
  const page = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      setInitial(raw ? (JSON.parse(raw) as UIMessage[]) : []);
    } catch {
      setInitial([]);
    }
  }, []);

  const save = useCallback((m: UIMessage[]) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(m.slice(-40)));
    } catch {
      /* ignore */
    }
  }, []);

  const clear = () => {
    localStorage.removeItem(KEY);
    setInitial([]);
    setChatKey((k) => k + 1);
  };

  if (page.startsWith("/mentor")) return null;

  return (
    <>
      {open && initial && (
        <div className="fixed inset-x-3 bottom-24 z-50 flex h-[min(620px,75vh)] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl sm:inset-x-auto sm:right-6 sm:w-[400px]">
          <div className="flex items-center gap-3 bg-gradient-primary px-4 py-3 text-primary-foreground">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-background/20">
              <LogoMark className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-semibold">AppendUs Global Assistant</p>
              <p className="truncate text-xs opacity-80">Your guide to the platform</p>
            </div>
            <Button size="icon-sm" variant="ghost" className="hover:bg-background/20 hover:text-primary-foreground" onClick={clear} aria-label="Clear chat">
              <Trash2 />
            </Button>
            <Button size="icon-sm" variant="ghost" className="hover:bg-background/20 hover:text-primary-foreground" onClick={() => setOpen(false)} aria-label="Close assistant">
              <X />
            </Button>
          </div>
          <ChatPanel
            key={chatKey}
            id={`assistant-${chatKey}`}
            api="/api/chat"
            body={{ mode: "assistant", context: { page } }}
            initialMessages={initial}
            onMessagesChange={save}
            emptyIcon={<LogoMark className="h-12 w-12" />}
            emptyTitle="Hi! I'm your AppendUs Assistant"
            emptyDescription="I can help you find features, explain this page, and troubleshoot issues."
            suggestions={["Find a feature", "Explain this page", "Help me troubleshoot", "How do I analyze my resume?"]}
          />
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close assistant" : "Open assistant"}
        className="fixed bottom-6 right-6 z-50 grid h-14 w-14 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow transition-transform hover:scale-105"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </>
  );
}
