import { TRPCError } from "@trpc/server";
import type { Message } from "../../../drizzle/schema";
import { SECURITY_CONFIG } from "../config/security";
import * as db from "../db";
import { logger } from "../_core/logger";
import {
  detectLanguageFromText,
  generateConversationReply,
  getLocalizedAiErrorMessage,
  logAiPipelineError,
  normalizeLanguage,
  type ConversationHistoryMessage,
  type MessageSource,
} from "./aiPipeline";
import { guardPrompt } from "./security/promptGuard";
import {
  trimHistoryMessages,
  trimPromptToTokenLimit,
  trimResponseLength,
} from "./security/tokenLimits";
import { runAiOrchestration } from "./aiOrchestrator";
import {
  loadConversationHistory,
  persistConversationMessages,
} from "./conversationMemory";
import { logSecurityEvent } from "../observability/securityLogger";
import { setSessionState } from "./sessionStore";

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
  ip?: string | null;
  content: string;
  maxHistory: number;
};

export async function sendConversationMessage(
  input: SendConversationMessageInput
): Promise<Message & { source: MessageSource }> {
  const { conversationId, userId, ip, content, maxHistory } = input;
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
  const conversationHistory = messages.slice(-maxHistory).map(m => {
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
  const limitedHistory: ConversationHistoryMessage[] = trimHistoryMessages(
    conversationHistory,
    {
      endpoint: "trpc.conversations.sendMessage",
      userId,
      ip: ip ?? null,
    }
  ).slice(
    -Math.min(maxHistory, SECURITY_CONFIG.tokenLimits.maxHistoryMessages)
  );

  const userMessage = await db.createMessage(conversationId, "user", content);
  if (!userMessage) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

  const guardResult = guardPrompt(content, {
    endpoint: "trpc.conversations.sendMessage",
    userId,
    ip: ip ?? null,
  });
  if (guardResult.flagged) {
    if (!guardResult.fallbackResponse) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }
    const assistantMessage = await db.createMessage(
      conversationId,
      "assistant",
      guardResult.fallbackResponse
    );
    if (!assistantMessage)
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return { ...assistantMessage, source: "general" };
  }

  const sanitizedPrompt = trimPromptToTokenLimit(guardResult.sanitizedPrompt, {
    endpoint: "trpc.conversations.sendMessage",
    userId,
    ip: ip ?? null,
  });

  let aiResponse = "";
  let source: MessageSource = "general";

  try {
    const result = await generateConversationReply({
      prompt: sanitizedPrompt,
      conversationId,
      language,
      userId,
      history: limitedHistory,
    });
    aiResponse = trimResponseLength(result.text, {
      endpoint: "trpc.conversations.sendMessage",
      userId,
      ip: ip ?? null,
    });
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

  // Update the in-memory session state so subsequent calls within the same
  // session benefit from the already-detected language and message count.
  setSessionState(
    userId,
    {
      conversationId,
      dialogState: {
        sessionLanguage: language,
        messageCount:
          (messages.filter(m => m.role === "user").length + 1),
        lastActiveAt: new Date().toISOString(),
        context: {},
      },
    },
    conversationId
  );

  return { ...assistantMessage, source };
}

type ChatEndpointMessage = { role: "assistant" | "user"; content: string };

export class ChatEndpointError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "ChatEndpointError";
    Error.captureStackTrace?.(this, ChatEndpointError);
  }
}

export async function processChatRequest(input: {
  messages: ChatEndpointMessage[];
  language?: "en" | "uk" | "ru";
  conversationId?: number;
  userId?: number | null;
  ip: string;
}) {
  const conversationId = input.conversationId ?? null;
  const context = {
    endpoint: "/api/chat",
    userId: input.userId ?? null,
    ip: input.ip,
  };

  if (conversationId !== null && input.userId == null) {
    logSecurityEvent({
      endpoint: "/api/chat",
      eventType: "auth_failure",
      ip: input.ip,
    });
    throw new ChatEndpointError(401, "Authentication required");
  }

  let history: ChatEndpointMessage[] = [];
  if (conversationId !== null && input.userId != null) {
    try {
      history = await loadConversationHistory({
        conversationId,
        userId: input.userId,
        maxHistory: 14,
        context,
      });
    } catch (error) {
      if (error instanceof TRPCError) {
        if (error.code === "NOT_FOUND") {
          throw new ChatEndpointError(404, "Conversation not found");
        }
        if (error.code === "FORBIDDEN") {
          throw new ChatEndpointError(403, "Access denied");
        }
      }
      throw new ChatEndpointError(500, "Failed to load conversation history");
    }
  }

  return runAiOrchestration({
    messages: input.messages,
    language: input.language,
    history,
    context,
    onFinish: async text => {
      if (conversationId === null) return;
      const lastUserMessage =
        [...input.messages].reverse().find(message => message.role === "user")
          ?.content ?? null;
      await persistConversationMessages({
        conversationId,
        userMessage: lastUserMessage,
        assistantMessage: text,
        context,
      });
    },
  });
}
