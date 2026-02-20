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
  type ConversationHistoryMessage,
} from "./services/aiPipeline";
import { runSync } from "./services/syncService";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user?.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

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
      .input(z.object({
        title: z.string().min(1),
        language: z.enum(["en", "uk", "ru"]).default("uk"),
      }))
      .mutation(async ({ ctx, input }) => {
        const conversation = await db.createConversation(ctx.user!.id, input.title, input.language);
        if (!conversation) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        return conversation;
      }),

    list: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getConversations(ctx.user!.id);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getConversation(input.id);
      }),

    getMessages: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ input }) => {
        return await db.getMessages(input.conversationId);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const success = await db.deleteConversation(input.id);
        if (!success) throw new TRPCError({ code: "NOT_FOUND" });
        return { success: true };
      }),

    sendMessage: protectedProcedure
      .input(z.object({
        conversationId: z.number(),
        content: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        // Save user message
        const userMessage = await db.createMessage(input.conversationId, "user", input.content);
        if (!userMessage) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        // Get conversation for language context
        const conversation = await db.getConversation(input.conversationId);
        if (!conversation) throw new TRPCError({ code: "NOT_FOUND" });
        const conversationLanguage = normalizeLanguage(conversation.language as string | null);
        const detectedLanguage = detectLanguageFromText(input.content);
        const language = detectedLanguage ?? conversationLanguage;

        // Get conversation history for context
        const messages = await db.getMessages(input.conversationId);
        const conversationHistory: ConversationHistoryMessage[] = messages
          .slice(-10) // Last 10 messages for context
          .map((m) => {
            const isSupportedRole = m.role === "assistant" || m.role === "user";
            if (!isSupportedRole) {
              logger.warn(
                `[sendMessage] Unexpected role in conversation`,
                {
                  role: m.role,
                  conversationId: input.conversationId,
                  messageId: m.id ?? "unknown",
                }
              );
            }
            const role: ConversationHistoryMessage["role"] = isSupportedRole
              ? (m.role as ConversationHistoryMessage["role"])
              : "user";
            return { role, content: m.content };
          });

        // Generate AI response (resource search and RAG are inside the try/catch
        // so that embedding or search failures produce a graceful error message
        // rather than an uncaught exception)
        let aiResponse = "";
        try {
          aiResponse = await generateConversationReply({
            prompt: input.content,
            conversationId: input.conversationId,
            language,
            userId: ctx.user!.id,
            history: conversationHistory,
          });
        } catch (error) {
          logAiPipelineError(error, {
            conversationId: input.conversationId,
            userId: ctx.user!.id,
            prompt: input.content,
          });
          aiResponse = getLocalizedAiErrorMessage(language);
        }

        // Save assistant message
        const assistantMessage = await db.createMessage(input.conversationId, "assistant", aiResponse);
        if (!assistantMessage) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        return assistantMessage;
      }),
  }),

  // Resource management
  resources: router({
    getAll: publicProcedure
      .query(async () => {
        return await db.getAllResources();
      }),

    search: publicProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ input }) => {
        return await db.searchResources(input.query);
      }),

    getByType: publicProcedure
      .input(z.object({ type: z.string() }))
      .query(async ({ input }) => {
        return await db.getResourcesByType(input.type);
      }),

    create: adminProcedure
      .input(z.object({
        nameEn: z.string(),
        nameUk: z.string(),
        nameRu: z.string(),
        descriptionEn: z.string().optional(),
        descriptionUk: z.string().optional(),
        descriptionRu: z.string().optional(),
        type: z.enum(["electronic_library", "repository", "catalog", "database", "other"]),
        url: z.string().optional(),
        keywords: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const resource = await db.createResource({
          ...input,
          keywords: input.keywords ? JSON.stringify(input.keywords) : null,
        });
        if (!resource) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        return resource;
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        nameEn: z.string().optional(),
        nameUk: z.string().optional(),
        nameRu: z.string().optional(),
        descriptionEn: z.string().optional(),
        descriptionUk: z.string().optional(),
        descriptionRu: z.string().optional(),
        type: z.enum(["electronic_library", "repository", "catalog", "database", "other"]).optional(),
        url: z.string().optional(),
        keywords: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updateData } = input;
        const resource = await db.updateResource(id, {
          ...updateData,
          keywords: updateData.keywords ? JSON.stringify(updateData.keywords) : undefined,
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

    getSiteResources: publicProcedure
      .query(() => {
        return hdakResources;
      }),
  }),

  // Contact management
  contacts: router({
    getAll: publicProcedure
      .query(async () => {
        return await db.getAllContacts();
      }),

    create: adminProcedure
      .input(z.object({
        type: z.enum(["email", "phone", "address", "telegram", "viber", "facebook", "instagram", "other"]),
        value: z.string(),
        labelEn: z.string().optional(),
        labelUk: z.string().optional(),
        labelRu: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const contact = await db.createContact(input);
        if (!contact) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        return contact;
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        type: z.enum(["email", "phone", "address", "telegram", "viber", "facebook", "instagram", "other"]).optional(),
        value: z.string().optional(),
        labelEn: z.string().optional(),
        labelUk: z.string().optional(),
        labelRu: z.string().optional(),
      }))
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
      .input(z.object({ key: z.string() }))
      .query(async ({ input }) => {
        return await db.getLibraryInfo(input.key);
      }),

    getAll: adminProcedure
      .query(async () => {
        // Return the three standard keys used throughout the app
        const keys = ["about", "hours", "address"];
        const entries = await Promise.all(keys.map(k => db.getLibraryInfo(k)));
        return entries.filter(Boolean);
      }),

    set: adminProcedure
      .input(z.object({
        key: z.string(),
        valueEn: z.string(),
        valueUk: z.string(),
        valueRu: z.string(),
      }))
      .mutation(async ({ input }) => {
        const info = await db.setLibraryInfo(input.key, input.valueEn, input.valueUk, input.valueRu);
        if (!info) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        return info;
      }),
  }),

  // Analytics (admin only)
  analytics: router({
    getQueryStats: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(20) }).optional())
      .query(async ({ input }) => {
        return await db.getQueryAnalytics(input?.limit ?? 20);
      }),
  }),

  // Catalog sync (admin only)
  sync: router({
    runNow: adminProcedure
      .mutation(async () => {
        const result = await runSync();
        return result;
      }),
  }),
});

export type AppRouter = typeof appRouter;
