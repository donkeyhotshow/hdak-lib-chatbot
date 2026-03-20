import { useEffect, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { useConversation, useChatStream } from "@/hooks/use-chat";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { Loader2, AlertCircle, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Chat() {
  const params = useParams();
  const id = params.id ? parseInt(params.id) : null;

  const { data: conversation, isLoading, error, refetch } = useConversation(id);
  const { sendMessage, isStreaming, streamedContent, stopStream } = useChatStream(id);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Smooth auto-scroll — only when near the bottom already
  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "instant",
      block: "end",
    });
  }, []);

  useEffect(() => {
    scrollToBottom(true);
  }, [conversation?.messages.length, streamedContent, scrollToBottom]);

  // ── Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center parchment-bg">
        <Loader2 className="w-7 h-7 text-amber-700 animate-spin" />
      </div>
    );
  }

  // ── Error state
  if (error || !conversation) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-5 text-center p-8 parchment-bg">
        <div className="w-16 h-16 bg-red-50 border border-red-200 rounded-full flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <div>
          <h2 className="text-xl font-serif font-bold text-amber-900">
            Не вдалося завантажити розмову
          </h2>
          <p className="text-amber-600/70 mt-1.5 text-sm">
            Розмова могла бути видалена або не існує.
          </p>
        </div>
        <Button
          onClick={() => refetch()}
          variant="outline"
          className="border-amber-300 text-amber-800 hover:bg-amber-50"
        >
          Спробувати ще раз
        </Button>
      </div>
    );
  }

  const hasMessages = conversation.messages.length > 0;

  return (
    <div className="flex flex-col h-full parchment-bg">

      {/* ── Messages area */}
      <div className="flex-1 overflow-y-auto scrollbar-parchment scroll-smooth">
        <div className="min-h-full pb-36">

          {/* Empty state */}
          {!hasMessages && !isStreaming && (
            <div className="max-w-2xl mx-auto px-6 py-20 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-100 border border-amber-200/60">
                <BookOpen className="w-7 h-7 text-amber-700" />
              </div>
              <h2 className="text-2xl font-serif font-bold text-amber-900">
                {conversation.title || "Нова розмова"}
              </h2>
              <p className="text-amber-600/70 leading-relaxed text-sm max-w-sm mx-auto">
                Привіт! Я — бібліотечний асистент ХДАК. Запитайте про каталог, розклад, правила або ресурси.
              </p>
              {/* Quick prompts */}
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {[
                  "Як знайти книгу в каталозі?",
                  "Коли працює бібліотека?",
                  "Що таке репозитарій ХДАК?",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    disabled={isStreaming}
                    className="px-3 py-1.5 text-xs rounded-full border border-amber-300/70
                      bg-white/70 hover:bg-amber-50 text-amber-800
                      transition-colors duration-150 font-medium"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message list */}
          {conversation.messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              role={msg.role as "user" | "assistant"}
              content={msg.content}
              createdAt={msg.createdAt}
            />
          ))}

          {/* Streaming placeholder */}
          {isStreaming && (
            <ChatMessage
              role="assistant"
              content={streamedContent}
              isStreaming={true}
            />
          )}

          <div ref={bottomRef} className="h-4" />
        </div>
      </div>

      {/* ── Input area — light parchment gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none"
           style={{ height: "140px", background: "linear-gradient(to top, #f7f2ea 55%, transparent)" }} />
      <div className="relative z-10">
        <ChatInput
          onSend={sendMessage}
          onStop={stopStream}
          isStreaming={isStreaming}
        />
      </div>
    </div>
  );
}
