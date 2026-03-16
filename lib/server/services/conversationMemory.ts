import { TRPCError } from "@trpc/server";
import NodeCache from "node-cache";
import * as db from "../db";
import type { ConversationHistoryMessage } from "./aiPipeline";
import {
  trimHistoryMessages,
  trimResponseLength,
} from "../security/tokenLimits";

type ConversationContext = {
  endpoint: string;
  userId?: number | null;
  ip?: string | null;
};

/**
 * Short-lived in-memory cache of per-conversation message lists.
 * Entries expire after 5 minutes; they are also explicitly invalidated
 * whenever `persistConversationMessages` writes a new message.
 */
const historyCache = new NodeCache({
  stdTTL: 5 * 60,
  checkperiod: 60,
});

/** Flush the conversation history cache — for use in tests only. */
export function clearHistoryCache(): void {
  historyCache.flushAll();
}

async function assertConversationOwnership(
  conversationId: number,
  userId: number
) {
  const conversation = await db.getConversation(conversationId);
  if (!conversation) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }
  if (conversation.userId !== userId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
  }
  return conversation;
}

export async function loadConversationHistory(params: {
  conversationId: number;
  userId: number;
  maxHistory: number;
  context: ConversationContext;
}): Promise<ConversationHistoryMessage[]> {
  await assertConversationOwnership(params.conversationId, params.userId);

  const cacheKey = `history:${params.conversationId}`;
  const cached = historyCache.get<ConversationHistoryMessage[]>(cacheKey);
  // The cache always holds the *complete* filtered message list for this
  // conversation, not a pre-sliced subset.  Token-trimming and maxHistory
  // slicing are applied on every call so that different callers with
  // different maxHistory values all get correctly bounded results from the
  // same shared cache entry.
  const messages =
    cached !== undefined
      ? cached
      : await (async () => {
          const dbMessages = await db.getMessages(params.conversationId);
          const mapped = dbMessages
            .filter(m => m.role === "assistant" || m.role === "user")
            .map(m => ({
              role: m.role as "assistant" | "user",
              content: m.content,
            }));
          historyCache.set(cacheKey, mapped);
          return mapped;
        })();

  return trimHistoryMessages(messages, params.context).slice(
    -params.maxHistory
  );
}

export async function persistConversationMessages(params: {
  conversationId: number;
  userMessage: string | null;
  assistantMessage: string;
  context: ConversationContext;
}) {
  if (params.userMessage) {
    await db.createMessage(params.conversationId, "user", params.userMessage);
  }
  await db.createMessage(
    params.conversationId,
    "assistant",
    trimResponseLength(params.assistantMessage, params.context)
  );
  // Invalidate cached history so the next load reflects the new messages.
  historyCache.del(`history:${params.conversationId}`);
}
