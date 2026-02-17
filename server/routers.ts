import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import * as db from "./db";
import { getSystemPrompt, officialLibraryInfo, officialLibraryResources } from "./system-prompts-official";
import { getRagContext } from "./rag-service";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user?.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

// Get the official KSAC library system prompt
const getOfficialSystemPrompt = (language: "en" | "uk" | "ru") => {
  const libInfo = officialLibraryInfo[language];
  const libResources = officialLibraryResources[language];
  
  const context = {
    libraryInfo: libInfo,
    libraryResources: libResources,
  };
  
  return getSystemPrompt(language, context);
};

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
        language: z.enum(["en", "uk", "ru"]).default("en"),
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

        // Get conversation history for context
        const messages = await db.getMessages(input.conversationId);
        const conversationHistory = messages
          .slice(-10) // Last 10 messages for context
          .map(m => ({ role: m.role, content: m.content }));

        // Search for relevant resources
        const relevantResources = await db.searchResources(input.content);

        // Get RAG context from document chunks
        const ragContext = await getRagContext(input.content, conversation.language as "en" | "uk" | "ru");

        // Log the query
        await db.logUserQuery(ctx.user!.id, input.conversationId, input.content, conversation.language, relevantResources.map(r => r.id));

        // Generate AI response
        let aiResponse = "";
        try {
          const resourceContext = relevantResources.length > 0
            ? `\n\nДоступні ресурси:\n${relevantResources.map(r => {
                const name = conversation.language === "uk" ? r.nameUk : conversation.language === "ru" ? r.nameRu : r.nameEn;
                const desc = conversation.language === "uk" ? r.descriptionUk : conversation.language === "ru" ? r.descriptionRu : r.descriptionEn;
                return `- ${name}: ${desc}${r.url ? ` (${r.url})` : ""}`;
              }).join("\n")}`
            : "";

          const { text } = await generateText({
            model: openai("gpt-4o-mini"),
            system: getOfficialSystemPrompt(conversation.language as "en" | "uk" | "ru") + resourceContext + ragContext,
            messages: conversationHistory as any,
            prompt: input.content,
          });

          aiResponse = text;
        } catch (error) {
          console.error("AI generation error:", error);
          aiResponse = conversation.language === "uk" 
            ? "Вибачте, сталася помилка при генеруванні відповіді. Будь ласка, спробуйте ще раз."
            : conversation.language === "ru"
            ? "Извините, произошла ошибка при генерировании ответа. Пожалуйста, попробуйте еще раз."
            : "Sorry, an error occurred while generating the response. Please try again.";
          console.error("Full error:", error);
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
});

export type AppRouter = typeof appRouter;
