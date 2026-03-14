import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import {
  adminProcedure,
  publicProcedure,
  protectedProcedure,
  router,
} from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { SECURITY_CONFIG } from "./config/security";
import * as db from "./db";
import { hdakResources } from "./system-prompts-official";
import {
  assertConversationOwnership,
  sendConversationMessage,
} from "./services/chatService";
import {
  enforceSecurityRateLimit,
  getRequestIp,
} from "./services/security/rateLimiter";
import { runSync, isSyncing, getLastSyncStatus } from "./services/syncService";
import {
  getCachedAllResources,
  getCachedSearchResources,
  getCachedAllContacts,
  getCachedLibraryInfo,
  getCachedAllLibraryInfo,
  invalidateResourceCache,
  invalidateContactCache,
  invalidateInfoCache,
} from "./services/libraryCache";
import { clearSession } from "./services/sessionStore";

/** Maximum number of previous messages included in the AI context window. */
const MAX_CONVERSATION_HISTORY =
  SECURITY_CONFIG.tokenLimits.conversationContextHistory;
/** Maximum character length allowed for a single user message. */
const MAX_MESSAGE_LENGTH = SECURITY_CONFIG.tokenLimits.maxMessageChars;
const conversationProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  await enforceSecurityRateLimit({
    endpoint: "trpc.conversations",
    userId: ctx.user.id,
    ip: getRequestIp(ctx.req),
  });
  return await next();
});

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      // Clear the in-memory session for this user if authenticated.
      if (ctx.user) {
        clearSession(ctx.user.id);
      }
      return {
        success: true,
      } as const;
    }),
  }),

  // Conversation management
  conversations: router({
    create: conversationProcedure
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

    list: conversationProcedure.query(async ({ ctx }) => {
      return await db.getConversations(ctx.user!.id);
    }),

    get: conversationProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const conversation = await db.getConversation(input.id);
        if (!conversation) return null;
        if (conversation.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        return conversation;
      }),

    getMessages: conversationProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertConversationOwnership(input.conversationId, ctx.user.id);
        return await db.getMessages(input.conversationId);
      }),

    delete: conversationProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await assertConversationOwnership(input.id, ctx.user.id);
        const success = await db.deleteConversation(input.id);
        if (!success) throw new TRPCError({ code: "NOT_FOUND" });
        // Clear the per-conversation session state when the conversation is deleted.
        clearSession(ctx.user.id, input.id);
        return { success: true };
      }),

    sendMessage: conversationProcedure
      .input(
        z.object({
          conversationId: z.number().int().positive(),
          content: z.string().min(1).max(MAX_MESSAGE_LENGTH),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await sendConversationMessage({
          conversationId: input.conversationId,
          userId: ctx.user.id,
          ip: getRequestIp(ctx.req),
          content: input.content,
          maxHistory: MAX_CONVERSATION_HISTORY,
        });
      }),
  }),

  // Resource management
  resources: router({
    getAll: publicProcedure.query(async () => {
      return await getCachedAllResources();
    }),

    search: publicProcedure
      .input(z.object({ query: z.string().max(500) }))
      .query(async ({ input }) => {
        return await getCachedSearchResources(input.query);
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
        invalidateResourceCache();
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
        invalidateResourceCache();
        return resource;
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const success = await db.deleteResource(input.id);
        if (!success) throw new TRPCError({ code: "NOT_FOUND" });
        invalidateResourceCache();
        return { success: true };
      }),

    getSiteResources: publicProcedure.query(() => {
      return hdakResources;
    }),
  }),

  // Contact management
  contacts: router({
    getAll: publicProcedure.query(async () => {
      return await getCachedAllContacts();
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
        invalidateContactCache();
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
        invalidateContactCache();
        return contact;
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const success = await db.deleteContact(input.id);
        if (!success) throw new TRPCError({ code: "NOT_FOUND" });
        invalidateContactCache();
        return { success: true };
      }),
  }),

  // Library info management
  libraryInfo: router({
    get: publicProcedure
      .input(z.object({ key: z.string().max(200) }))
      .query(async ({ input }) => {
        return await getCachedLibraryInfo(input.key);
      }),

    getAll: adminProcedure.query(async () => {
      return await getCachedAllLibraryInfo();
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
        invalidateInfoCache();
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
