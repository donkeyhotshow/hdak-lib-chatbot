import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { logger } from "./_core/logger";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { hdakResources } from "./system-prompts-official";
import {
  detectLanguageFromText,
  generateConversationReply,
  getLocalizedAiErrorMessage,
  logAiPipelineError,
  normalizeLanguage,
  sanitizeUntrustedContent,
  type ConversationHistoryMessage,
  type MessageSource,
  type SupportedLanguage,
} from "./services/aiPipeline";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { AI_MODEL_NAME, AI_TEMPERATURE } from "./services/aiPipeline";
import { runSync, isSyncing, getLastSyncStatus } from "./services/syncService";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user?.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }
  return next({ ctx });
});

/** Maximum number of previous messages included in the AI context window. */
const MAX_CONVERSATION_HISTORY = 14;
/** Maximum character length allowed for a single user message. */
const MAX_MESSAGE_LENGTH = 10_000;

/**
 * When a conversation exceeds MAX_CONVERSATION_HISTORY messages, summarise the
 * oldest turns into a compact paragraph so the AI retains long-term context
 * without incurring the full token cost of all previous messages.
 *
 * Returns a new history array whose first element is the summary (as a
 * synthetic "user" turn) followed by the most recent messages.
 * Falls back to the simple slice if the summary LLM call fails.
 */
async function buildHistoryWithSummary(
  allMessages: ConversationHistoryMessage[],
  language: SupportedLanguage
): Promise<ConversationHistoryMessage[]> {
  if (allMessages.length <= MAX_CONVERSATION_HISTORY) {
    return allMessages;
  }

  const oldMessages = allMessages.slice(0, -MAX_CONVERSATION_HISTORY);
  const recentMessages = allMessages.slice(-MAX_CONVERSATION_HISTORY);

  const summaryPrompts: Record<SupportedLanguage, string> = {
    uk: "Стисло підсумуй наступний фрагмент розмови в 2–3 речення, зберігаючи ключові факти та запити:",
    ru: "Кратко подведи итог следующего фрагмента разговора в 2–3 предложения, сохраняя ключевые факты и запросы:",
    en: "Briefly summarise the following conversation fragment in 2–3 sentences, preserving key facts and requests:",
  };

  const conversationText = oldMessages
    .map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  try {
    const { text: summary } = await generateText({
      model: openai(AI_MODEL_NAME),
      messages: [
        {
          role: "user",
          content: `${summaryPrompts[language]}\n\n${conversationText}`,
        },
      ],
      temperature: AI_TEMPERATURE,
      maxOutputTokens: 200,
    });

    const summaryMessage: ConversationHistoryMessage = {
      role: "user",
      content: `[Earlier conversation summary: ${summary}]`,
    };

    logger.info(
      "[sendMessage] Summarised older turns to stay within context window",
      {
        originalTurns: oldMessages.length,
        summaryLength: summary.length,
      }
    );

    return [summaryMessage, ...recentMessages];
  } catch (err) {
    logger.warn("[sendMessage] Summarisation failed — falling back to slice", {
      error: err instanceof Error ? err.message : String(err),
    });
    return recentMessages;
  }
}

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Conversation management
  conversations: router({
    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1).max(500),
          language: z.enum(["en", "uk", "ru"]).default("uk"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const conversation = await db.createConversation(
          ctx.user!.id,
          input.title,
          input.language
        );
        if (!conversation)
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        return conversation;
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getConversations(ctx.user!.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const conversation = await db.getConversation(input.id);
        if (!conversation) return null;
        if (conversation.userId !== ctx.user!.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        return conversation;
      }),

    getMessages: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ ctx, input }) => {
        const conversation = await db.getConversation(input.conversationId);
        if (!conversation) throw new TRPCError({ code: "NOT_FOUND" });
        if (conversation.userId !== ctx.user!.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        return await db.getMessages(input.conversationId);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const conversation = await db.getConversation(input.id);
        if (!conversation) throw new TRPCError({ code: "NOT_FOUND" });
        if (conversation.userId !== ctx.user!.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        const success = await db.deleteConversation(input.id);
        if (!success) throw new TRPCError({ code: "NOT_FOUND" });
        return { success: true };
      }),

    sendMessage: protectedProcedure
      .input(
        z.object({
          conversationId: z.number().int().positive(),
          content: z.string().min(1).max(MAX_MESSAGE_LENGTH),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Verify that this conversation belongs to the requesting user
        const conversation = await db.getConversation(input.conversationId);
        if (!conversation) throw new TRPCError({ code: "NOT_FOUND" });
        if (conversation.userId !== ctx.user!.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        const conversationLanguage = normalizeLanguage(
          conversation.language as string | null
        );
        const detectedLanguage = detectLanguageFromText(input.content);
        const language = detectedLanguage ?? conversationLanguage;

        // Fetch conversation history BEFORE saving the new user message so that
        // generateConversationReply (which appends the prompt itself) does not
        // receive the current user turn twice.
        const messages = await db.getMessages(input.conversationId);
        const allHistory: ConversationHistoryMessage[] = messages.map(m => {
          const isSupportedRole = m.role === "assistant" || m.role === "user";
          if (!isSupportedRole) {
            logger.warn(`[sendMessage] Unexpected role in conversation`, {
              role: m.role,
              conversationId: input.conversationId,
              messageId: m.id ?? "unknown",
            });
          }
          const role: ConversationHistoryMessage["role"] = isSupportedRole
            ? (m.role as ConversationHistoryMessage["role"])
            : "user";
          return { role, content: m.content };
        });

        // Summarise older turns when the history exceeds the context window to
        // avoid silently dropping messages while retaining long-term context.
        const conversationHistory = await buildHistoryWithSummary(
          allHistory,
          language
        );

        // Save user message after history has been read so the current turn
        // is not included in the history snapshot passed to the AI.
        const userMessage = await db.createMessage(
          input.conversationId,
          "user",
          input.content
        );
        if (!userMessage)
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        // Generate AI response (resource search and RAG are inside the try/catch
        // so that embedding or search failures produce a graceful error message
        // rather than an uncaught exception)
        // Sanitize the prompt before passing to AI to prevent prompt injection attacks.
        const sanitizedPrompt = sanitizeUntrustedContent(input.content);
        let aiResponse = "";
        let source: MessageSource = "general";
        try {
          const result = await generateConversationReply({
            prompt: sanitizedPrompt,
            conversationId: input.conversationId,
            language,
            userId: ctx.user!.id,
            history: conversationHistory,
          });
          aiResponse = result.text;
          source = result.source;
        } catch (error) {
          logAiPipelineError(error, {
            conversationId: input.conversationId,
            userId: ctx.user!.id,
            prompt: input.content,
          });
          aiResponse = getLocalizedAiErrorMessage(language);
        }

        // Save assistant message
        const assistantMessage = await db.createMessage(
          input.conversationId,
          "assistant",
          aiResponse
        );
        if (!assistantMessage)
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        return { ...assistantMessage, source };
      }),
  }),

  // Resource management
  resources: router({
    getAll: publicProcedure.query(async () => {
      return await db.getAllResources();
    }),

    search: publicProcedure
      .input(z.object({ query: z.string().max(500) }))
      .query(async ({ input }) => {
        return await db.searchResources(input.query);
      }),

    getByType: publicProcedure
      .input(
        z.object({
          type: z.enum([
            "electronic_library",
            "repository",
            "catalog",
            "database",
            "other",
          ]),
        })
      )
      .query(async ({ input }) => {
        return await db.getResourcesByType(input.type);
      }),

    create: adminProcedure
      .input(
        z.object({
          nameEn: z.string().min(1).max(500),
          nameUk: z.string().min(1).max(500),
          nameRu: z.string().min(1).max(500),
          descriptionEn: z.string().max(10_000).optional(),
          descriptionUk: z.string().max(10_000).optional(),
          descriptionRu: z.string().max(10_000).optional(),
          type: z.enum([
            "electronic_library",
            "repository",
            "catalog",
            "database",
            "other",
          ]),
          url: z.string().max(2048).optional(),
          keywords: z.array(z.string().max(200)).max(100).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const resource = await db.createResource({
          ...input,
          keywords: input.keywords ? JSON.stringify(input.keywords) : null,
        });
        if (!resource) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        return resource;
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          nameEn: z.string().min(1).max(500).optional(),
          nameUk: z.string().min(1).max(500).optional(),
          nameRu: z.string().min(1).max(500).optional(),
          descriptionEn: z.string().max(10_000).optional(),
          descriptionUk: z.string().max(10_000).optional(),
          descriptionRu: z.string().max(10_000).optional(),
          type: z
            .enum([
              "electronic_library",
              "repository",
              "catalog",
              "database",
              "other",
            ])
            .optional(),
          url: z.string().max(2048).optional(),
          keywords: z.array(z.string().max(200)).max(100).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...updateData } = input;
        const resource = await db.updateResource(id, {
          ...updateData,
          keywords: updateData.keywords
            ? JSON.stringify(updateData.keywords)
            : undefined,
        });
        if (!resource) throw new TRPCError({ code: "NOT_FOUND" });
        return resource;
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const success = await db.deleteResource(input.id);
        if (!success) throw new TRPCError({ code: "NOT_FOUND" });
        return { success: true };
      }),

    getSiteResources: publicProcedure.query(() => {
      return hdakResources;
    }),
  }),

  // Contact management
  contacts: router({
    getAll: publicProcedure.query(async () => {
      return await db.getAllContacts();
    }),

    create: adminProcedure
      .input(
        z.object({
          type: z.enum([
            "email",
            "phone",
            "address",
            "telegram",
            "viber",
            "facebook",
            "instagram",
            "other",
          ]),
          value: z.string().min(1).max(1000),
          labelEn: z.string().max(200).optional(),
          labelUk: z.string().max(200).optional(),
          labelRu: z.string().max(200).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const contact = await db.createContact(input);
        if (!contact) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        return contact;
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          type: z
            .enum([
              "email",
              "phone",
              "address",
              "telegram",
              "viber",
              "facebook",
              "instagram",
              "other",
            ])
            .optional(),
          value: z.string().min(1).max(1000).optional(),
          labelEn: z.string().max(200).optional(),
          labelUk: z.string().max(200).optional(),
          labelRu: z.string().max(200).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...updateData } = input;
        const contact = await db.updateContact(id, updateData);
        if (!contact) throw new TRPCError({ code: "NOT_FOUND" });
        return contact;
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const success = await db.deleteContact(input.id);
        if (!success) throw new TRPCError({ code: "NOT_FOUND" });
        return { success: true };
      }),
  }),

  // Library info management
  libraryInfo: router({
    get: publicProcedure
      .input(z.object({ key: z.string().max(200) }))
      .query(async ({ input }) => {
        return await db.getLibraryInfo(input.key);
      }),

    getAll: adminProcedure.query(async () => {
      return await db.getAllLibraryInfo();
    }),

    set: adminProcedure
      .input(
        z.object({
          key: z.string().min(1).max(200),
          valueEn: z.string().max(10_000),
          valueUk: z.string().max(10_000),
          valueRu: z.string().max(10_000),
        })
      )
      .mutation(async ({ input }) => {
        const info = await db.setLibraryInfo(
          input.key,
          input.valueEn,
          input.valueUk,
          input.valueRu
        );
        if (!info) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        return info;
      }),
  }),

  // Analytics (admin only)
  analytics: router({
    getQueryStats: adminProcedure
      .input(
        z.object({ limit: z.number().min(1).max(100).default(20) }).optional()
      )
      .query(async ({ input }) => {
        return await db.getQueryAnalytics(input?.limit ?? 20);
      }),
  }),

  // Catalog sync (admin only)
  sync: router({
    runNow: adminProcedure.mutation(async () => {
      const result = await runSync();
      return result;
    }),
    status: adminProcedure.query(() => {
      return { isSyncing: isSyncing() };
    }),
    lastStatus: adminProcedure.query(() => {
      const status = getLastSyncStatus();
      if (!status) return null;
      return {
        success: status.success,
        timestamp: status.timestamp.toISOString(),
        synced: status.synced,
        errors: status.errors,
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
