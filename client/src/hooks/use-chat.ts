import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Conversation, type Message } from "@shared/schema";
import { useState, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import type { CatalogResult } from "@/components/CatalogResults";

interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

const CONVERSATIONS_KEY = ["/api/conversations"] as const;
const conversationKey = (id: number | null) => ["/api/conversations", id] as const;

// ─── Parse catalog result embedded in message content ─────────────────────────
export function parseCatalogFromContent(content: string): { text: string; catalogResult: CatalogResult | null } {
  const MARKER_START = "<!--CATALOG:";
  const MARKER_END = "-->";
  const idx = content.indexOf(MARKER_START);
  if (idx === -1) return { text: content, catalogResult: null };

  const text = content.slice(0, idx).trimEnd();
  const jsonStart = idx + MARKER_START.length;
  const jsonEnd = content.indexOf(MARKER_END, jsonStart);
  if (jsonEnd === -1) return { text, catalogResult: null };

  try {
    const catalogResult = JSON.parse(content.slice(jsonStart, jsonEnd)) as CatalogResult;
    return { text, catalogResult };
  } catch {
    return { text, catalogResult: null };
  }
}

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
  const [streamedCatalogResult, setStreamedCatalogResult] = useState<CatalogResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Streaming buffer to reduce re-render frequency
  const streamBufRef   = useRef("");
  const streamTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushBuffer = useCallback(() => {
    if (streamTimerRef.current) {
      clearTimeout(streamTimerRef.current);
      streamTimerRef.current = null;
    }
    setStreamedContent(streamBufRef.current);
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!conversationId) return;

    setIsStreaming(true);
    setStreamedContent("");
    setStreamedCatalogResult(null);
    streamBufRef.current = "";

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
              streamBufRef.current += data.content;
              // Throttle state updates to ~30fps
              if (!streamTimerRef.current) {
                streamTimerRef.current = setTimeout(() => {
                  setStreamedContent(streamBufRef.current);
                  streamTimerRef.current = null;
                }, 32);
              }
            }

            if (data.catalogResult) {
              setStreamedCatalogResult(data.catalogResult as CatalogResult);
            }
          } catch {
            // skip malformed frames
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("Stream error:", err);
      }
    } finally {
      flushBuffer();
      if (streamTimerRef.current) {
        clearTimeout(streamTimerRef.current);
        streamTimerRef.current = null;
      }
      streamBufRef.current = "";
      setIsStreaming(false);
      setStreamedContent("");
      setStreamedCatalogResult(null);
      abortRef.current = null;
      qc.invalidateQueries({ queryKey: conversationKey(conversationId) });
    }
  }, [conversationId, qc, flushBuffer]);

  const stopStream = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      if (streamTimerRef.current) {
        clearTimeout(streamTimerRef.current);
        streamTimerRef.current = null;
      }
      streamBufRef.current = "";
      setIsStreaming(false);
      setStreamedContent("");
      setStreamedCatalogResult(null);
      qc.invalidateQueries({ queryKey: conversationKey(conversationId) });
    }
  }, [conversationId, qc]);

  return { sendMessage, isStreaming, streamedContent, streamedCatalogResult, stopStream };
}
