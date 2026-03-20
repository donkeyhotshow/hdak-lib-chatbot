import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Conversation, type Message } from "@shared/schema";
import { useState, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

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
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (!conversationId) return;

    setIsStreaming(true);
    setStreamedContent("");

    // Optimistic update — show user message immediately
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
      let accumulated = "";
      // lineBuffer holds partial lines across chunk boundaries
      let lineBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        lineBuffer += decoder.decode(value, { stream: true });
        const lines = lineBuffer.split("\n");
        // Keep the last (potentially incomplete) line in the buffer
        lineBuffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw || raw === "[DONE]") continue;

          try {
            const data = JSON.parse(raw);
            if (typeof data.content === "string") {
              accumulated += data.content;
              setStreamedContent(accumulated);
            }
          } catch {
            // skip malformed frames
          }
        }
      }
    } catch (err: unknown) {
      // AbortError is intentional (user stopped) — don't surface as error
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("Stream error:", err);
      }
    } finally {
      setIsStreaming(false);
      setStreamedContent("");
      abortRef.current = null;
      // Refetch to get real persisted messages from DB
      qc.invalidateQueries({ queryKey: conversationKey(conversationId) });
    }
  }, [conversationId, qc]);

  const stopStream = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setIsStreaming(false);
      setStreamedContent("");
      qc.invalidateQueries({ queryKey: conversationKey(conversationId) });
    }
  }, [conversationId, qc]);

  return { sendMessage, isStreaming, streamedContent, stopStream };
}
