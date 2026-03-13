import { TRPCError } from "@trpc/server";
import type { Message } from "../../drizzle/schema";
import * as db from "../db";
import { logger } from "../_core/logger";
import {
  detectLanguageFromText,
  generateConversationReply,
  getLocalizedAiErrorMessage,
  logAiPipelineError,
  normalizeLanguage,
  sanitizeUntrustedContent,
  type ConversationHistoryMessage,
  type MessageSource,
} from "./aiPipeline";

export async function assertConversationOwnership(
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

export async function getOwnedConversationHistory(
  conversationId: number,
  userId: number,
  maxHistory: number
): Promise<ConversationHistoryMessage[]> {
  await assertConversationOwnership(conversationId, userId);

  const messages = await db.getMessages(conversationId);
  return messages
    .slice(-maxHistory)
    .filter(m => m.role === "assistant" || m.role === "user")
    .map(m => ({ role: m.role as "assistant" | "user", content: m.content }));
}

type SendConversationMessageInput = {
  conversationId: number;
  userId: number;
  content: string;
  maxHistory: number;
};

export async function sendConversationMessage(
  input: SendConversationMessageInput
): Promise<Message & { source: MessageSource }> {
  const { conversationId, userId, content, maxHistory } = input;
  const conversation = await assertConversationOwnership(
    conversationId,
    userId
  );

  const conversationLanguage = normalizeLanguage(
    conversation.language as string | null
  );
  const detectedLanguage = detectLanguageFromText(content);
  const language = detectedLanguage ?? conversationLanguage;

  const messages = await db.getMessages(conversationId);
  const conversationHistory: ConversationHistoryMessage[] = messages
    .slice(-maxHistory)
    .map(m => {
      const isSupportedRole = m.role === "assistant" || m.role === "user";
      if (!isSupportedRole) {
        logger.warn(`[chatService] Unexpected role in conversation history`, {
          role: m.role,
          conversationId,
          messageId: m.id ?? "unknown",
        });
      }
      const role: ConversationHistoryMessage["role"] = isSupportedRole
        ? (m.role as ConversationHistoryMessage["role"])
        : "user";
      return { role, content: m.content };
    });

  const userMessage = await db.createMessage(conversationId, "user", content);
  if (!userMessage) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

  const sanitizedPrompt = sanitizeUntrustedContent(content);

  let aiResponse = "";
  let source: MessageSource = "general";

  try {
    const result = await generateConversationReply({
      prompt: sanitizedPrompt,
      conversationId,
      language,
      userId,
      history: conversationHistory,
    });
    aiResponse = result.text;
    source = result.source;
  } catch (error) {
    logAiPipelineError(error, {
      conversationId,
      userId,
      prompt: content,
    });
    aiResponse = getLocalizedAiErrorMessage(language);
  }

  const assistantMessage = await db.createMessage(
    conversationId,
    "assistant",
    aiResponse
  );
  if (!assistantMessage) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

  return { ...assistantMessage, source };
}
