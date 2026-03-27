import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

export interface Conversation {
  id: number;
  title: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Message {
  id: number;
  conversationId: number;
  role: "user" | "assistant";
  content: string;
  createdAt: Date | string;
}

interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

const CONVERSATIONS_KEY = ["/api/conversations"] as const;
const conversationKey = (id: number | null) => ["/api/conversations", id] as const;

// ─── Conversations list ───────────────────────────────────────────────────────
export function useConversations() {
  return useQuery<Conversation[]>({
    queryKey: CONVERSATIONS_KEY,
    queryFn: async () => {
      const res = await fetch("/api/conversations");
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return res.json();
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

// ─── Single conversation ──────────────────────────────────────────────────────
export function useConversation(id: number | null) {
  return useQuery<ConversationWithMessages>({
    queryKey: conversationKey(id),
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/conversations/${id}`);
      if (!res.ok) throw new Error("Failed to fetch conversation");
      return res.json();
    },
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

// ─── Create conversation ──────────────────────────────────────────────────────
export function useCreateConversation() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (title?: string) => {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title || "Нова розмова" }),
      });
      if (!res.ok) throw new Error("Failed to create conversation");
      return res.json() as Promise<Conversation>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    },
    onError: () => {
      toast({
        title: "Помилка",
        description: "Не вдалося створити розмову.",
        variant: "destructive",
      });
    },
  });
}

// ─── Delete conversation ──────────────────────────────────────────────────────
export function useDeleteConversation() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete conversation");
    },
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: conversationKey(id) });
      qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    },
    onError: () => {
      toast({
        title: "Помилка",
        description: "Не вдалося видалити розмову.",
        variant: "destructive",
      });
    },
  });
}

// ─── Streaming messages ───────────────────────────────────────────────────────
export function useChatStream(conversationId: number | null) {
  const qc = useQueryClient();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");
  const [streamError, setStreamError] = useState<string | null>(null);
  const [lastResponseMs, setLastResponseMs] = useState<number | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  // 32ms render buffer — prevents removeChild errors during rapid streaming
  const streamBufRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);

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
    if (!conversationId) return;

    setIsStreaming(true);
    setStreamedContent("");
    setStreamError(null);
    streamBufRef.current = "";
    startTimeRef.current = Date.now();

    const optimisticMsg: Message = {
      id: Date.now(),
      conversationId,
      role: "user",
      content,
      createdAt: new Date(),
    };

    qc.setQueryData<ConversationWithMessages>(
      conversationKey(conversationId),
      (old) => old ? { ...old, messages: [...old.messages, optimisticMsg] } : old,
    );

    abortRef.current = new AbortController();

    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
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
              // Buffer to prevent removeChild errors
              streamBufRef.current += data.content;
              scheduleFlush();
            }
          } catch {
            // skip malformed frames
            streamBufRef.current += raw;
            scheduleFlush();
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
      qc.invalidateQueries({ queryKey: conversationKey(conversationId) });
    }
  }, [conversationId, qc, scheduleFlush, flushBuffer]);

  const stopStream = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      flushBuffer();
      setIsStreaming(false);
      setStreamedContent("");
      streamBufRef.current = "";
      qc.invalidateQueries({ queryKey: conversationKey(conversationId) });
    }
  }, [conversationId, qc, flushBuffer]);

  return {
    sendMessage,
    isStreaming,
    streamedContent,
    streamError,
    lastResponseMs,
    clearError,
    stopStream,
  };
}
