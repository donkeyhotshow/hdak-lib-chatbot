import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Conversation, type Message } from "@shared/schema"; // Use shared schema types if available, otherwise define locally
import { useState, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

// Types based on the API contract provided in instructions
interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export function useConversations() {
  return useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    queryFn: async () => {
      const res = await fetch("/api/conversations");
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return res.json();
    },
  });
}

export function useConversation(id: number | null) {
  return useQuery<ConversationWithMessages>({
    queryKey: ["/api/conversations", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/conversations/${id}`);
      if (!res.ok) throw new Error("Failed to fetch conversation");
      return res.json();
    },
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (title?: string) => {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title || "New Chat" }),
      });
      if (!res.ok) throw new Error("Failed to create conversation");
      return res.json() as Promise<Conversation>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create new conversation.",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete conversation");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({
        title: "Deleted",
        description: "Conversation removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete conversation.",
        variant: "destructive",
      });
    },
  });
}

// Custom hook for handling streaming messages
export function useChatStream(conversationId: number | null) {
  const queryClient = useQueryClient();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (!conversationId) return;

    setIsStreaming(true);
    setStreamedContent("");
    
    // Create optimistic user message
    const tempId = Date.now();
    const optimisticMessage: Message = {
      id: tempId,
      conversationId,
      role: "user",
      content,
      createdAt: new Date(), // This will be mismatched with string from DB, handled in UI
    };

    // Update cache immediately
    queryClient.setQueryData<ConversationWithMessages>(
      ["/api/conversations", conversationId],
      (old) => {
        if (!old) return old;
        return {
          ...old,
          messages: [...old.messages, optimisticMessage],
        };
      }
    );

    try {
      abortControllerRef.current = new AbortController();
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) throw new Error("Failed to send message");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) throw new Error("No response body");

      let assistantMessageContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            if (!dataStr || dataStr === "[DONE]") continue;

            try {
              const data = JSON.parse(dataStr);
              
              if (data.content) {
                assistantMessageContent += data.content;
                setStreamedContent(assistantMessageContent);
              }
              
              if (data.done) {
                 // Stream finished
              }
            } catch (e) {
              console.error("Error parsing SSE data", e);
            }
          }
        }
      }

    } catch (error) {
      console.error("Stream error:", error);
    } finally {
      setIsStreaming(false);
      setStreamedContent("");
      // Invalidate to fetch the real persisted messages (including the assistant's full response)
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
      abortControllerRef.current = null;
    }
  }, [conversationId, queryClient]);

  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
    }
  }, [conversationId, queryClient]);

  return { sendMessage, isStreaming, streamedContent, stopStream };
}
