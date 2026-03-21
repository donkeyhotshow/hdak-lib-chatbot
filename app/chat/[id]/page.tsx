"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";
import { AppHeader } from "@/components/app-header";
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
  const pendingMessageSentRef = useRef(false);

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
    let didMutateOnError = false;

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
      let serverDone = false;

      outer: while (true) {
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
            if (data.done === true) {
              serverDone = true;
              break outer;
            }
            if (data.error) {
              throw new Error(data.error);
            }
            if (typeof data.content === "string") {
              streamBufRef.current += data.content;
              scheduleFlush();
            }
          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) continue;
            throw parseErr;
          }
        }
      }

      if (!serverDone) {
        reader.cancel().catch(() => {});
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("Stream error:", err);
        setStreamError("Помилка з'єднання. Спробуйте ще раз.");
        didMutateOnError = true;
        mutate(`/api/conversations/${id}`);
      }
    } finally {
      flushBuffer();
      const elapsed = Date.now() - startTimeRef.current;
      setLastResponseMs(elapsed);
      setIsStreaming(false);
      setStreamedContent("");
      streamBufRef.current = "";
      abortRef.current = null;
      if (!didMutateOnError) {
        mutate(`/api/conversations/${id}`);
      }
    }
  }, [id, scheduleFlush, flushBuffer]);

  // Handle pending message from landing page
  useEffect(() => {
    if (!conversation || pendingMessageSentRef.current) return;
    const pending = sessionStorage.getItem("pendingMessage");
    if (pending && conversation.messages.length === 0) {
      pendingMessageSentRef.current = true;
      sessionStorage.removeItem("pendingMessage");
      sendMessage(pending);
    }
  }, [conversation, sendMessage]);

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
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100dvh",
          maxWidth: 720,
          margin: "0 auto",
          background: "var(--paper)",
          borderLeft: "0.5px solid rgba(255,255,255,0.04)",
          borderRight: "0.5px solid rgba(255,255,255,0.04)",
        }}
      >
        <AppHeader showBackButton onBack={() => router.push("/")} />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--ink3)" }} />
        </div>
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100dvh",
          maxWidth: 720,
          margin: "0 auto",
          background: "var(--paper)",
          borderLeft: "0.5px solid rgba(255,255,255,0.04)",
          borderRight: "0.5px solid rgba(255,255,255,0.04)",
        }}
      >
        <AppHeader showBackButton onBack={() => router.push("/")} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 32, textAlign: "center" }}>
          <div style={{ width: 64, height: 64, background: "rgba(160,40,40,0.08)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <AlertCircle style={{ width: 32, height: 32, color: "#8a5050" }} />
          </div>
          <div>
            <h2 style={{ fontFamily: "var(--ff-s)", fontSize: 20, fontWeight: 500, color: "var(--ink)" }}>
              Не вдалося завантажити розмову
            </h2>
            <p style={{ fontSize: 14, color: "var(--ink3)", marginTop: 8 }}>
              Розмову могло бути видалено або вона не існує.
            </p>
          </div>
          <button
            onClick={() => router.push("/")}
            style={{
              height: 36,
              padding: "0 16px",
              background: "transparent",
              border: "1px solid var(--ln2)",
              borderRadius: 8,
              fontSize: 13,
              color: "var(--ink2)",
              cursor: "pointer",
              transition: "all 0.12s",
            }}
          >
            На головну
          </button>
        </div>
      </div>
    );
  }

  const messages = conversation.messages;
  const lastAssistantIdx = messages.map(m => m.role).lastIndexOf("assistant");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        maxWidth: 720,
        margin: "0 auto",
        background: "var(--paper)",
        borderLeft: "0.5px solid rgba(255,255,255,0.04)",
        borderRight: "0.5px solid rgba(255,255,255,0.04)",
        overflow: "hidden",
      }}
    >
      <AppHeader showBackButton onBack={() => router.push("/")} />

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
            background: "var(--paper2)",
            borderBottom: "0.5px solid var(--ln)",
          }}
        >
          <WifiOff style={{ width: 14, height: 14, color: "var(--ink3)" }} />
          <span style={{ fontSize: 12, color: "var(--ink2)", fontWeight: 500 }}>
            Немає з'єднання з інтернетом
          </span>
        </div>
      )}

      {/* Chat area */}
      <div
        className="scrollbar-thin"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "28px 20px 16px",
          display: "flex",
          flexDirection: "column",
          background: "var(--paper)",
        }}
      >
        {/* Empty state */}
        {messages.length === 0 && !isStreaming && (
          <div className="animate-rise" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 12 }}>
            <h2 style={{ fontFamily: "var(--ff-s)", fontSize: 24, fontWeight: 400, color: "var(--ink)" }}>
              {conversation.title || "Нова розмова"}
            </h2>
            <p style={{ fontSize: 14, color: "var(--ink3)", maxWidth: 300 }}>
              Привіт! Я — бібліотечний асистент ХДАК. Чим можу допомогти?
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 6, marginTop: 8 }}>
              {["Як знайти книгу в каталозі?", "Коли працює бібліотека?", "Що таке репозитарій ХДАК?"].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  disabled={isStreaming}
                  style={{
                    height: 28,
                    padding: "0 12px",
                    background: "#fff",
                    border: "0.5px solid var(--ln)",
                    borderRadius: 100,
                    fontSize: 12,
                    color: "var(--ink3)",
                    cursor: "pointer",
                    transition: "all 0.12s",
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
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

        {/* Streaming */}
        {isStreaming && (
          <ChatMessage
            role="assistant"
            content={streamedContent}
            isStreaming={true}
          />
        )}

        <div ref={scrollRef} style={{ height: 16 }} />
      </div>

      {/* Error bar */}
      {streamError && (
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "7px 12px",
            margin: "0 20px 4px",
            background: "rgba(160,40,40,0.04)",
            border: "0.5px solid rgba(160,40,40,0.12)",
            borderRadius: 10,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#8a5050" }}>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#8a5050", flexShrink: 0 }} />
            {streamError}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              onClick={retryLastMessage}
              style={{
                height: 22,
                padding: "0 9px",
                background: "transparent",
                border: "0.5px solid rgba(160,40,40,0.2)",
                borderRadius: 100,
                color: "#8a5050",
                fontSize: 11,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.12s",
              }}
            >
              ↺ Повторити
            </button>
            <button
              onClick={clearError}
              aria-label="Закрити"
              style={{
                width: 22,
                height: 22,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                border: "none",
                borderRadius: 6,
                color: "#8a5050",
                cursor: "pointer",
              }}
            >
              <X style={{ width: 12, height: 12 }} />
            </button>
          </div>
        </div>
      )}

      {/* Input zone */}
      <div
        style={{
          flexShrink: 0,
          padding: "10px 20px",
          paddingBottom: "max(10px, env(safe-area-inset-bottom))",
          background: "var(--paper)",
          borderTop: "0.5px solid var(--ln)",
        }}
      >
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
