import { TRPCError } from "@trpc/server";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  pipeUIMessageStreamToResponse,
} from "ai";
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
import { getInstantAnswer } from "./instantAnswers";
import {
  buildLibraryKnowledgeContext,
  type LibraryKnowledgeTopic,
} from "./libraryKnowledge";
import {
  buildOfficialRetrievalContext,
  retrieveOfficialLibraryChunks,
} from "./libraryRetrieval";
import { getMergedKnowledgeTopics } from "./knowledgeAdmin";
import {
  buildResponseCacheKey,
  getCachedResponse,
  setCachedResponse,
} from "./responseCache";
import {
  buildKnowledgeAssistedFallback,
  buildSafeLlmUnavailableFallback,
} from "./fallbackSuggestions";
import { emitChatAnalyticsEvent } from "./chatAnalytics";
import {
  recordLatency,
  recordRecommendationImpression,
  recordModelUsage,
  recordStreamOutcome,
} from "../_core/metrics";

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
        messageCount: messages.filter(m => m.role === "user").length + 1,
        lastActiveAt: new Date().toISOString(),
        context: {},
      },
    },
    conversationId
  );

  return { ...assistantMessage, source };
}

type ChatEndpointMessage = { role: "assistant" | "user"; content: string };

function findLastUserMessage(messages: ChatEndpointMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === "user") return messages[index].content;
  }
  return "";
}

function createInstantAnswerStream(answerText: string) {
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const messageId = generateId();
      const textId = generateId();

      writer.write({ type: "start", messageId });
      writer.write({ type: "text-start", id: textId });
      writer.write({ type: "text-delta", id: textId, delta: answerText });
      writer.write({ type: "text-end", id: textId });
      writer.write({ type: "finish", finishReason: "stop" });
    },
  });

  return {
    pipeUIMessageStreamToResponse: (
      response: Parameters<typeof pipeUIMessageStreamToResponse>[0]["response"]
    ) => pipeUIMessageStreamToResponse({ response, stream }),
    toUIMessageStreamResponse: () => createUIMessageStreamResponse({ stream }),
  };
}

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
  model?: string;
  userId?: number | null;
  ip: string;
}) {
  const requestStartedAt = Date.now();
  let streamOutcomeRecorded = false;
  const recordOutcome = (outcome: "success" | "error" | "timeout") => {
    if (streamOutcomeRecorded) return;
    streamOutcomeRecorded = true;
    recordLatency(Date.now() - requestStartedAt);
    recordStreamOutcome(outcome);
  };
  const safeToken = (value: unknown): number =>
    typeof value === "number" && Number.isFinite(value)
      ? Math.max(0, Math.floor(value))
      : 0;
  const conversationId = input.conversationId ?? null;
  const mode = input.userId == null ? "guest" : "auth";
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

  const lastUserMessage = findLastUserMessage(input.messages);
  const requestedLanguage = normalizeLanguage(input.language);
  let runtimeKnowledgeTopics: LibraryKnowledgeTopic[] | undefined;
  try {
    runtimeKnowledgeTopics = await getMergedKnowledgeTopics();
  } catch (error) {
    logger.warn("[chatService] Failed to load editable knowledge entries", {
      error: error instanceof Error ? error.message : String(error),
    });
    runtimeKnowledgeTopics = undefined;
  }
  const activeKnowledgeTopics =
    runtimeKnowledgeTopics && runtimeKnowledgeTopics.length > 0
      ? runtimeKnowledgeTopics
      : undefined;

  const instantAnswer = getInstantAnswer(lastUserMessage, requestedLanguage, {
    knowledgeTopics: activeKnowledgeTopics,
  });

  const instantType =
    instantAnswer?.sourceBadge === "catalog" ? "catalog" : "instant";
  const instantCacheKey = buildResponseCacheKey({
    query: lastUserMessage,
    language: requestedLanguage,
    responseType: instantType,
  });
  const cachedInstant = getCachedResponse(instantCacheKey);
  if (cachedInstant) {
    emitChatAnalyticsEvent({
      name: "cache_hit",
      mode,
      sourceBadge: cachedInstant.sourceBadge,
      latencyBucket: "instant",
      metadata: {
        responseType: cachedInstant.responseType,
        query: lastUserMessage,
      },
    });
    recordOutcome("success");
    return {
      flagged: false as const,
      stream: createInstantAnswerStream(cachedInstant.text),
      language: requestedLanguage,
    };
  }

  emitChatAnalyticsEvent({
    name: "cache_miss",
    mode,
    sourceBadge: instantAnswer?.sourceBadge ?? "unknown",
    latencyBucket: "instant",
    metadata: { responseType: instantType, query: lastUserMessage },
  });

  if (instantAnswer) {
    if ((instantAnswer.suggestedFollowUps?.length ?? 0) > 0) {
      recordRecommendationImpression(1);
    }
    setCachedResponse(instantCacheKey, {
      text: instantAnswer.answer,
      sourceBadge:
        instantAnswer.sourceBadge === "official-rule"
          ? "official-rule"
          : instantAnswer.sourceBadge === "catalog"
            ? "catalog"
            : "quick",
      responseType: instantType,
    });
    emitChatAnalyticsEvent({
      name: "instant_answer_hit",
      mode,
      sourceBadge: instantAnswer.sourceBadge ?? "quick",
      latencyBucket: "instant",
      metadata: { query: lastUserMessage },
    });
    if (instantAnswer.sourceBadge === "catalog") {
      emitChatAnalyticsEvent({
        name: "catalog_intent_hit",
        mode,
        sourceBadge: "catalog",
        latencyBucket: "instant",
        metadata: { query: lastUserMessage },
      });
    }

    if (conversationId !== null) {
      await persistConversationMessages({
        conversationId,
        userMessage: lastUserMessage,
        assistantMessage: instantAnswer.answer,
        context,
      });
    }
    recordOutcome("success");

    return {
      flagged: false as const,
      stream: createInstantAnswerStream(instantAnswer.answer),
      language: requestedLanguage,
    };
  }

  const retrievalChunks = retrieveOfficialLibraryChunks(lastUserMessage, {
    limit: 3,
    minScore: 2,
    knowledgeTopics: activeKnowledgeTopics,
  });
  const retrievalContext = buildOfficialRetrievalContext(retrievalChunks);
  if (retrievalChunks.length > 0) {
    emitChatAnalyticsEvent({
      name: "retrieval_hit",
      mode,
      sourceBadge: "generated",
      latencyBucket: "instant",
      metadata: {
        query: lastUserMessage,
        topSourceUrl: retrievalChunks[0]?.sourceUrl ?? null,
        sourceDocUrls: retrievalChunks.map(chunk => chunk.sourceUrl).join("|"),
      },
    });
  }

  const knowledgeContextParts = [
    buildLibraryKnowledgeContext(
      lastUserMessage,
      requestedLanguage,
      activeKnowledgeTopics
    ),
    retrievalContext,
  ].filter(Boolean);
  const knowledgeContext =
    knowledgeContextParts.length > 0
      ? knowledgeContextParts.join("\n\n")
      : null;

  const knowledgeFallback = buildKnowledgeAssistedFallback(
    lastUserMessage,
    requestedLanguage,
    { knowledgeTopics: activeKnowledgeTopics }
  );
  if (knowledgeFallback) {
    const fallbackCacheKey = buildResponseCacheKey({
      query: lastUserMessage,
      language: requestedLanguage,
      responseType: "knowledge-fallback",
    });
    const cachedFallback = getCachedResponse(fallbackCacheKey);
    if (cachedFallback) {
      emitChatAnalyticsEvent({
        name: "cache_hit",
        mode,
        sourceBadge: "generated",
        latencyBucket: "instant",
        metadata: {
          responseType: "knowledge-fallback",
          query: lastUserMessage,
        },
      });
      recordOutcome("success");
      return {
        flagged: false as const,
        stream: createInstantAnswerStream(cachedFallback.text),
        language: requestedLanguage,
      };
    }

    emitChatAnalyticsEvent({
      name: "cache_miss",
      mode,
      sourceBadge: "generated",
      latencyBucket: "instant",
      metadata: { responseType: "knowledge-fallback", query: lastUserMessage },
    });
    setCachedResponse(fallbackCacheKey, {
      text: knowledgeFallback.answer,
      sourceBadge: "generated",
      responseType: "knowledge-fallback",
    });
    emitChatAnalyticsEvent({
      name: "knowledge_fallback_hit",
      mode,
      sourceBadge: "generated",
      latencyBucket: "instant",
      metadata: { query: lastUserMessage },
    });
    if (conversationId !== null) {
      await persistConversationMessages({
        conversationId,
        userMessage: lastUserMessage,
        assistantMessage: knowledgeFallback.answer,
        context,
      });
    }
    recordOutcome("success");
    return {
      flagged: false as const,
      stream: createInstantAnswerStream(knowledgeFallback.answer),
      language: requestedLanguage,
    };
  }

  emitChatAnalyticsEvent({
    name: "llm_fallback_used",
    mode,
    sourceBadge: "llm-fallback",
    latencyBucket: "streamed",
    metadata: {
      query: lastUserMessage,
      completed: false,
      retrievalHit: retrievalChunks.length > 0,
    },
  });

  try {
    return await runAiOrchestration({
      messages: input.messages,
      language: input.language,
      model: input.model,
      history,
      knowledgeContext,
      context,
      onFinish: async ({ text, usage, model, provider }) => {
        emitChatAnalyticsEvent({
          name: "llm_fallback_used",
          mode,
          sourceBadge: "llm-fallback",
          latencyBucket:
            Date.now() - requestStartedAt < 250 ? "instant" : "streamed",
          metadata: {
            query: lastUserMessage,
            completed: true,
            retrievalHit: retrievalChunks.length > 0,
          },
        });
        if (retrievalChunks.length > 0) {
          emitChatAnalyticsEvent({
            name: "retrieval_assisted_response",
            mode,
            sourceBadge: "generated",
            latencyBucket: "streamed",
            metadata: {
              query: lastUserMessage,
              topSourceUrl: retrievalChunks[0]?.sourceUrl ?? null,
            },
          });
        }
        recordModelUsage({
          provider,
          model,
          inputTokens: safeToken(usage?.inputTokens),
          outputTokens: safeToken(usage?.outputTokens),
          totalTokens: safeToken(usage?.totalTokens),
        });
        recordOutcome("success");
        if (conversationId === null) return;
        await persistConversationMessages({
          conversationId,
          userMessage: findLastUserMessage(input.messages) || null,
          assistantMessage: text,
          context,
        });
      },
      onError: error => {
        const errorText =
          error instanceof Error ? error.message.toLowerCase() : String(error);
        if (
          errorText.includes("timeout") ||
          errorText.includes("timed out") ||
          errorText.includes("abort")
        ) {
          recordOutcome("timeout");
          return;
        }
        recordOutcome("error");
      },
    });
  } catch (error) {
    logger.warn(
      "[chatService] LLM orchestration unavailable, using safe fallback",
      {
        error: error instanceof Error ? error.message : String(error),
      }
    );
    emitChatAnalyticsEvent({
      name: "llm_safe_fallback_used",
      mode,
      sourceBadge: "llm-fallback",
      latencyBucket: "instant",
      metadata: { query: lastUserMessage },
    });
    const safeFallback = buildSafeLlmUnavailableFallback(requestedLanguage);
    if (conversationId !== null) {
      await persistConversationMessages({
        conversationId,
        userMessage: lastUserMessage,
        assistantMessage: safeFallback,
        context,
      });
    }
    recordOutcome("success");
    return {
      flagged: false as const,
      stream: createInstantAnswerStream(safeFallback),
      language: requestedLanguage,
    };
  }
}
