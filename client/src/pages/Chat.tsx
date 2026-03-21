import { useEffect, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { useConversation, useChatStream } from "@/hooks/use-chat";
import { ChatMessage, TypingIndicator } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { Loader2, AlertCircle, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { uk } from "date-fns/locale";

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
      <div className="h-full flex items-center justify-center" style={{ background: "var(--p0)" }}>
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: "var(--b3)" }} />
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-center p-8" style={{ background: "var(--p0)" }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "var(--error-bg)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <AlertCircle style={{ width: 24, height: 24, color: "var(--error-tx)" }} />
        </div>
        <div>
          <h2 style={{ fontFamily: "var(--ff-d)", fontSize: 20, color: "var(--b0)", marginBottom: 6 }}>
            Не вдалося завантажити розмову
          </h2>
          <p style={{ fontSize: 13.5, color: "var(--text-3)" }}>
            Розмову могло бути видалено або вона не існує.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            height: 34, padding: "0 16px",
            background: "transparent",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--r-pill)",
            color: "var(--text-2)", fontSize: 13, fontWeight: 500,
            cursor: "pointer",
            transition: "all .12s",
            fontFamily: "var(--ff-b)",
          }}
        >
          <RotateCcw style={{ width: 13, height: 13 }} />
          Спробувати ще раз
        </button>
      </div>
    );
  }

  const today = format(new Date(), "EEEE, d MMMM", { locale: uk });

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--p0)" }}>

      {/* Chat scroll area */}
      <div
        className="flex-1 overflow-y-auto"
        role="log"
        aria-live="polite"
        aria-label="Повідомлення чату"
        style={{ padding: "20px 16px 8px" }}
      >
        {/* Empty state */}
        {conversation.messages.length === 0 && !isStreaming && (
          <div
            className="flex flex-col items-center justify-center text-center h-full"
            style={{ padding: "32px 20px", animation: "rise .45s cubic-bezier(.22,.8,.36,1) both" }}
          >
            {/* Decorative glyph */}
            <div style={{
              fontFamily: "var(--ff-d)",
              fontSize: 48,
              lineHeight: 1,
              fontStyle: "italic",
              color: "var(--b3)",
              marginBottom: 18,
              opacity: .55,
            }}>
              ✦
            </div>
            <h1 style={{
              fontFamily: "var(--ff-d)",
              fontSize: 24,
              fontWeight: 500,
              color: "var(--b0)",
              letterSpacing: "-.025em",
              lineHeight: 1.2,
              marginBottom: 8,
            }}>
              Чим можу допомогти?
            </h1>
            <p style={{
              fontSize: 13.5,
              color: "var(--text-3)",
              lineHeight: 1.65,
              maxWidth: 310,
              marginBottom: 28,
              fontWeight: 300,
            }}>
              Знайду книги в каталозі, розповім про ресурси і допоможу орієнтуватися на сайті бібліотеки ХДАК.
            </p>

            {/* How-to steps */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5, width: "100%", maxWidth: 340 }}>
              {[
                { n: "1", text: <><b>Оберіть запит</b> нижче або напишіть своє</> },
                { n: "2", text: <><b>Уточніть тему</b> — автор, предмет, ключові слова</> },
                { n: "3", text: <><b>Відкрийте посилання</b> з офіційного джерела</> },
              ].map(({ n, text }, i) => (
                <div
                  key={n}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 9,
                    padding: "9px 13px",
                    background: "rgba(255,252,245,.8)",
                    border: "0.5px solid var(--border-light)",
                    borderRadius: "var(--r-md)",
                    textAlign: "left",
                    animation: `rise .45s cubic-bezier(.22,.8,.36,1) ${(i + 1) * 0.06}s both`,
                  }}
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%",
                    background: "var(--p2)", border: "1px solid var(--border-mid)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10.5, fontWeight: 500, color: "var(--text-2)",
                    flexShrink: 0, marginTop: 1,
                  }}>
                    {n}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.45 }}>
                    {text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Day separator */}
        {conversation.messages.length > 0 && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            fontSize: 10.5, color: "var(--text-4)",
            letterSpacing: ".04em", textTransform: "uppercase",
            margin: "0 0 14px",
          }}>
            <span style={{ flex: 1, height: "0.5px", background: "var(--border-light)", display: "block" }} />
            {today}
            <span style={{ flex: 1, height: "0.5px", background: "var(--border-light)", display: "block" }} />
          </div>
        )}

        {/* Messages */}
        {conversation.messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            role={msg.role as "user" | "assistant"}
            content={msg.content}
            createdAt={msg.createdAt}
          />
        ))}

        {/* Streaming */}
        {isStreaming && streamedContent && (
          <ChatMessage
            role="assistant"
            content={streamedContent}
            isStreaming={true}
          />
        )}
        {isStreaming && !streamedContent && <TypingIndicator />}

        <div ref={scrollRef} className="h-2" />
      </div>

      {/* Sticky input zone */}
      <ChatInput
        onSend={sendMessage}
        onStop={stopStream}
        isStreaming={isStreaming}
      />
    </div>
  );
}
