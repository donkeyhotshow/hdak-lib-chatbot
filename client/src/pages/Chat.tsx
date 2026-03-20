import { useEffect, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { useConversation, useChatStream } from "@/hooks/use-chat";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Chat() {
  const params = useParams();
  const id = params.id ? parseInt(params.id) : null;

  const { data: conversation, isLoading, error, refetch } = useConversation(id);
  const { sendMessage, isStreaming, streamedContent, stopStream } = useChatStream(id);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages.length, streamedContent, scrollToBottom]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-center p-8">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <div>
          <h2 className="text-xl font-serif font-bold text-foreground">
            Не вдалося завантажити розмову
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Розмову могло бути видалено або вона не існує.
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline">Спробувати ще раз</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background relative">

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scroll-smooth">
        <div className="min-h-full pb-32">

          {/* Empty state */}
          {conversation.messages.length === 0 && !isStreaming && (
            <div className="max-w-3xl mx-auto px-4 py-12 text-center space-y-3">
              <h2 className="text-2xl font-serif font-bold text-primary">
                {conversation.title || "Нова розмова"}
              </h2>
              <p className="text-muted-foreground text-sm">
                Привіт! Я — бібліотечний асистент ХДАК. Чим можу допомогти?
              </p>
              {/* Quick prompts */}
              <div className="flex flex-wrap justify-center gap-2 pt-3">
                {[
                  "Як знайти книгу в каталозі?",
                  "Коли працює бібліотека?",
                  "Що таке репозитарій ХДАК?",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    disabled={isStreaming}
                    className="
                      px-3 py-1.5 text-xs rounded-full
                      border border-border bg-white hover:bg-muted/50
                      text-foreground transition-colors duration-150 font-medium
                    "
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages list */}
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

          <div ref={scrollRef} className="h-4" />
        </div>
      </div>

      {/* Input — gradient fade over bottom of message list */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/95 to-transparent pt-10 pb-2">
        <ChatInput
          onSend={sendMessage}
          onStop={stopStream}
          isStreaming={isStreaming}
        />
      </div>
    </div>
  );
}
