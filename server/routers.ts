import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import * as db from "./db";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user?.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

// System prompt for the AI chatbot
const getSystemPrompt = (language: string) => {
  const prompts: Record<string, string> = {
    en: `You are a helpful AI assistant for the KSAC (King Saud bin Abdulaziz University for Health Sciences) library. 
Your role is to help users discover and access library resources through conversational interaction.

Key responsibilities:
1. Help users find library resources by answering questions about available materials
2. Provide information about electronic libraries, repositories, catalogs, and databases
3. Guide users on how to access different types of resources
4. Answer questions about library services and functionality
5. Suggest relevant resources based on user queries
6. For complex research needs, direct users to submit a thematic search request via Google Form

When responding:
- Be helpful, friendly, and professional
- Provide direct links to resources when available
- If a resource is not found in the database, acknowledge this and suggest alternatives
- Keep responses concise and focused on the user's query
- Ask clarifying questions if needed to better assist the user`,
    
    uk: `Ви - корисний AI-помічник бібліотеки KSAC (Університету медичних наук імені короля Сауда бін Абдулазіза).
Ваша роль - допомогти користувачам знайти та отримати доступ до ресурсів бібліотеки через розмовну взаємодію.

Основні обов'язки:
1. Допомогти користувачам знайти ресурси бібліотеки, відповідаючи на запитання про доступні матеріали
2. Надати інформацію про електронні бібліотеки, репозиторії, каталоги та бази даних
3. Керувати користувачами щодо того, як отримати доступ до різних типів ресурсів
4. Відповідати на запитання про послуги та функціональність бібліотеки
5. Пропонувати відповідні ресурси на основі запитів користувача
6. Для складних дослідницьких потреб спрямовувати користувачів на подання запиту на тематичний пошук через Google Form

При відповіді:
- Будьте корисними, дружелюбними та професійними
- Надавайте прямі посилання на ресурси, коли вони доступні
- Якщо ресурс не знайдено в базі даних, визнайте це та запропонуйте альтернативи
- Тримайте відповіді лаконічними та зосередженими на запиті користувача
- Задавайте уточнюючі запитання, якщо потрібно, щоб краще допомогти користувачу`,
    
    ru: `Вы - полезный AI-помощник библиотеки KSAC (Университета медицинских наук имени короля Сауда бин Абдулазиза).
Ваша роль - помочь пользователям найти и получить доступ к ресурсам библиотеки через разговорное взаимодействие.

Основные обязанности:
1. Помочь пользователям найти ресурсы библиотеки, отвечая на вопросы о доступных материалах
2. Предоставить информацию об электронных библиотеках, репозиториях, каталогах и базах данных
3. Направить пользователей о том, как получить доступ к различным типам ресурсов
4. Ответить на вопросы об услугах и функциональности библиотеки
5. Предложить соответствующие ресурсы на основе запросов пользователя
6. Для сложных исследовательских потребностей направить пользователей на отправку запроса на тематический поиск через Google Form

При ответе:
- Будьте полезными, дружелюбными и профессиональными
- Предоставляйте прямые ссылки на ресурсы, когда они доступны
- Если ресурс не найден в базе данных, признайте это и предложите альтернативы
- Держите ответы лаконичными и сосредоточенными на запросе пользователя
- Задавайте уточняющие вопросы, если необходимо, чтобы лучше помочь пользователю`
  };
  
  return prompts[language] || prompts.en;
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

        // Log the query
        await db.logUserQuery(ctx.user!.id, input.conversationId, input.content, conversation.language, relevantResources.map(r => r.id));

        // Generate AI response
        let aiResponse = "";
        try {
          const resourceContext = relevantResources.length > 0
            ? `\n\nRelevant resources found:\n${relevantResources.map(r => {
                const name = conversation.language === "uk" ? r.nameUk : conversation.language === "ru" ? r.nameRu : r.nameEn;
                const desc = conversation.language === "uk" ? r.descriptionUk : conversation.language === "ru" ? r.descriptionRu : r.descriptionEn;
                return `- ${name}: ${desc}${r.url ? ` (${r.url})` : ""}`;
              }).join("\n")}`
            : "";

          const { text } = await generateText({
            model: openai("gpt-4o-mini"),
            system: getSystemPrompt(conversation.language) + resourceContext,
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
