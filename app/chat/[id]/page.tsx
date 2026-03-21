"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";
import { ChatMessage } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import { Loader2, AlertCircle, WifiOff, X } from "lucide-react";

interface Message {
  id: number;
  conversationId: number;
  role: string;
  content: string;
  createdAt: string;
}

interface ConversationWithMessages {
  id: number;
  title: string;
  createdAt: string;
  messages: Message[];
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

function useOnlineStatus() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id ? parseInt(params.id as string) : null;

  const { data: conversation, error, isLoading } = useSWR<ConversationWithMessages>(
    id ? `/api/conversations/${id}` : null,
    fetcher,
    { refreshInterval: 0, revalidateOnFocus: false }
  );

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");
  const [streamError, setStreamError] = useState<string | null>(null);
  const [lastResponseMs, setLastResponseMs] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<string>("");
  const abortRef = useRef<AbortController | null>(null);
  const streamBufRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);

  const isOnline = useOnlineStatus();

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages.length, streamedContent, scrollToBottom]);

  const scheduleFlush = useCallback(() => {
    if (!timerRef.current) {
      timerRef.current = setTimeout(() => {
        setStreamedContent(streamBufRef.current);
        timerRef.current = null;
      }, 32);
    }
  }, []);

  const flushBuffer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setStreamedContent(streamBufRef.current);
  }, []);

  const clearError = useCallback(() => setStreamError(null), []);

  const sendMessage = useCallback(async (content: string) => {
    if (!id) return;

    setIsStreaming(true);
    setStreamedContent("");
    setStreamError(null);
    streamBufRef.current = "";
    startTimeRef.current = Date.now();
    lastMessageRef.current = content;

    // Optimistic update
    mutate(`/api/conversations/${id}`, (old: ConversationWithMessages | undefined) => {
      if (!old) return old;
      return {
        ...old,
        messages: [...old.messages, {
          id: Date.now(),
          conversationId: id,
          role: "user",
          content,
          createdAt: new Date().toISOString(),
        }],
      };
    }, false);

    abortRef.current = new AbortController();

    try {
      const res = await fetch(`/api/conversations/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let lineBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        lineBuffer += decoder.decode(value, { stream: true });
        const lines = lineBuffer.split("\n");
        lineBuffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw || raw === "[DONE]") continue;

          try {
            const data = JSON.parse(raw);
            if (typeof data.content === "string") {
              streamBufRef.current += data.content;
              scheduleFlush();
            }
          } catch {
            // skip malformed frames
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("Stream error:", err);
        setStreamError("Помилка з'єднання. Спробуйте ще раз.");
      }
    } finally {
      flushBuffer();
      const elapsed = Date.now() - startTimeRef.current;
      setLastResponseMs(elapsed);
      setIsStreaming(false);
      setStreamedContent("");
      streamBufRef.current = "";
      abortRef.current = null;
      mutate(`/api/conversations/${id}`);
    }
  }, [id, scheduleFlush, flushBuffer]);

  const stopStream = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      flushBuffer();
      setIsStreaming(false);
      setStreamedContent("");
      streamBufRef.current = "";
      mutate(`/api/conversations/${id}`);
    }
  }, [id, flushBuffer]);

  const retryLastMessage = useCallback(() => {
    if (lastMessageRef.current) {
      clearError();
      sendMessage(lastMessageRef.current);
    }
  }, [sendMessage, clearError]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[hsl(var(--b0))] animate-spin" />
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-center p-8">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <div>
          <h2 className="text-xl font-serif font-bold">
            Не вдалося завантажити розмову
          </h2>
          <p className="text-[hsl(var(--muted-foreground))] mt-2 text-sm">
            Розмову могло бути видалено або вона не існує.
          </p>
        </div>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 text-sm border border-[hsl(var(--border))] rounded-lg hover:bg-[hsl(var(--muted))] transition-colors"
        >
          На головну
        </button>
      </div>
    );
  }

  const messages = conversation.messages;
  const lastAssistantIdx = messages.map(m => m.role).lastIndexOf("assistant");

  return (
    <div className="flex flex-col h-full bg-[hsl(var(--background))] relative">

      {/* Offline banner */}
      {!isOnline && (
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "6px 16px",
            background: "hsl(37 60% 92%)",
            borderBottom: "0.5px solid hsl(37 40% 78%)",
          }}
        >
          <WifiOff style={{ width: 14, height: 14, color: "hsl(var(--b3))" }} />
          <span style={{ fontSize: 12, color: "hsl(var(--b2))", fontWeight: 500 }}>
            Немає з'єднання з інтернетом. Перевірте мережу.
          </span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scroll-smooth">
        <div className="min-h-full pb-36">

          {/* Empty state */}
          {messages.length === 0 && !isStreaming && (
            <div className="max-w-3xl mx-auto px-4 py-10 text-center space-y-3">
              <h2 className="text-2xl font-serif font-bold text-[hsl(var(--b0))]">
                {conversation.title || "Нова розмова"}
              </h2>
              <p className="text-[hsl(var(--muted-foreground))] text-sm">
                Привіт! Я — бібліотечний асистент ХДАК. Чим можу допомогти?
              </p>
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
                    className="px-3 py-1.5 text-xs rounded-full border border-[hsl(var(--border))] bg-white hover:bg-[hsl(var(--muted))] transition-colors font-medium"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages list */}
          {messages.map((msg, idx) => (
            <ChatMessage
              key={msg.id}
              role={msg.role as "user" | "assistant"}
              content={msg.content}
              createdAt={msg.createdAt}
              responseMs={idx === lastAssistantIdx && !isStreaming ? lastResponseMs : null}
              onChipClick={!isStreaming ? sendMessage : undefined}
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

      {/* Error retry bar */}
      {streamError && (
        <div
          className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 bg-red-50 border-t border-red-200"
        >
          <span className="text-sm text-red-600 font-medium flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block flex-shrink-0" />
            {streamError}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={retryLastMessage}
              className="flex items-center gap-1 h-7 px-3 text-xs font-medium rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              {"↺"} Повторити
            </button>
            <button
              onClick={clearError}
              aria-label="Закрити"
              className="h-7 px-2 text-xs rounded-full border border-red-300 text-red-600 hover:bg-red-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Input zone */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[hsl(var(--background))] via-[hsl(var(--background)/0.95)] to-transparent pt-10 pb-2">
        <ChatInput
          onSend={sendMessage}
          onStop={stopStream}
          isStreaming={isStreaming}
          disabled={!isOnline}
        />
      </div>
    </div>
  );
}
