import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { toast } from "sonner";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export type ChatPanelProps = {
  id: string;
  api: string;
  body?: Record<string, unknown>;
  initialMessages?: UIMessage[] | undefined;
  suggestions?: string[];
  emptyTitle: string;
  emptyDescription: string;
  emptyIcon: ReactNode;
  placeholder?: string;
  onMessagesChange?: (m: UIMessage[]) => void;
  className?: string;
  autoStart?: string;
};

export function ChatPanel(props: ChatPanelProps) {
  const bodyRef = useRef(props.body);
  bodyRef.current = props.body;
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: props.api,
        headers: async (): Promise<Record<string, string>> => {
          const { data } = await supabase.auth.getSession();
          const t = data.session?.access_token;
          return t ? { Authorization: `Bearer ${t}` } : {};
        },
        body: () => bodyRef.current ?? {},
      }),
    [props.api],
  );

  const { messages, sendMessage, status, stop } = useChat({
    id: props.id,
    ...(props.initialMessages ? { messages: props.initialMessages } : {}),
    transport,
    onError: (e) => {
      let msg = e.message;
      try {
        msg = JSON.parse(e.message).error ?? msg;
      } catch {
        /* not json */
      }
      toast.error(msg || "Something went wrong");
    },
  });

  const onChange = props.onMessagesChange;
  useEffect(() => {
    if (status === "ready" || status === "error") onChange?.(messages);
  }, [messages, status, onChange]);

  const started = useRef(false);
  useEffect(() => {
    if (!props.autoStart || started.current || messages.length > 0) return;
    // Defer so a dev double-mount can't swallow the first message.
    const t = setTimeout(() => {
      if (started.current) return;
      started.current = true;
      sendMessage({ text: props.autoStart! });
    }, 50);
    return () => clearTimeout(t);
  }, [props.autoStart, messages.length, sendMessage]);

  const busy = status === "submitted" || status === "streaming";
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!busy) textareaRef.current?.focus();
  }, [busy]);

  const send = (text: string) => {
    if (!text.trim() || busy) return;
    sendMessage({ text });
  };

  return (
    <div className={cn("flex h-full min-h-0 flex-col", props.className)}>
      <Conversation className="min-h-0 flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={props.emptyIcon}
              title={props.emptyTitle}
              description={props.emptyDescription}
            />
          ) : (
            messages.map((m) => (
              <Message from={m.role} key={m.id}>
                <MessageContent>
                  {m.parts.map((p, i) =>
                    p.type === "text" ? (
                      m.role === "assistant" ? (
                        <MessageResponse key={i}>{p.text}</MessageResponse>
                      ) : (
                        <span key={i} className="whitespace-pre-wrap">{p.text}</span>
                      )
                    ) : null,
                  )}
                </MessageContent>
              </Message>
            ))
          )}
          {status === "submitted" && (
            <div className="px-1 text-sm">
              <Shimmer>Thinking...</Shimmer>
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="space-y-2 border-t bg-card/60 p-3">
        {messages.length === 0 && props.suggestions && (
          <Suggestions>
            {props.suggestions.map((s) => (
              <Suggestion key={s} suggestion={s} onClick={send} />
            ))}
          </Suggestions>
        )}
        <PromptInput
          onSubmit={(msg) => {
            send(msg.text ?? "");
          }}
        >
          <PromptInputTextarea ref={textareaRef} placeholder={props.placeholder ?? "Type your message..."} />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} onStop={stop} size="icon-sm" />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
