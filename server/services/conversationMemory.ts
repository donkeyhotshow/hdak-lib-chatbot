import { TRPCError } from "@trpc/server";
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
  const messages = await db.getMessages(params.conversationId);
  const history = messages
    .slice(-params.maxHistory)
    .filter(m => m.role === "assistant" || m.role === "user")
    .map(m => ({ role: m.role as "assistant" | "user", content: m.content }));

  return trimHistoryMessages(history, params.context).slice(-params.maxHistory);
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
}
