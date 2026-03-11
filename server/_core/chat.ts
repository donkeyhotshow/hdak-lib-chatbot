/**
 * Chat API Handler
 *
 * Express endpoint for AI SDK streaming chat with HDAK library tools.
 * Uses patched fetch to fix OpenAI-compatible proxy issues.
 */

import { streamText, stepCountIs } from "ai";
import { tool } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import type { Express } from "express";
import { z } from "zod/v4";
import { ENV } from "./env";
import { createPatchedFetch } from "./patchedFetch";
import { logger } from "./logger";
import { sdk } from "./sdk";
import * as db from "../db";
import { getSystemPrompt, officialLibraryInfo, officialLibraryResources, hdakResources } from "../system-prompts-official";
import { detectLanguageFromText, sanitizeUntrustedContent, AI_TEMPERATURE, AI_MODEL_NAME } from "../services/aiPipeline";

/** Maximum number of recent messages to scan when detecting the last user language. */
const MAX_LANGUAGE_LOOKBACK = 20;

type IncomingMessage = { role?: string; content?: string };

function findLastUserMessage(messages: IncomingMessage[] | unknown): string {
  if (!Array.isArray(messages)) return "";

  let scanned = 0;
  for (let i = messages.length - 1; i >= 0 && scanned < MAX_LANGUAGE_LOOKBACK; i--, scanned++) {
    const msg = messages[i];
    if (msg?.role === "user" && typeof msg.content === "string") {
      return msg.content;
    }
  }
  return "";
}

/** Maximum time (ms) allowed for a single streaming chat request. */
const CHAT_TIMEOUT_MS = 30_000;

/** Maximum character length allowed per individual message in the /api/chat endpoint. */
const MAX_CHAT_MESSAGE_LENGTH = 10_000;

/** Zod schema for validating individual chat messages from the client. */
const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(MAX_CHAT_MESSAGE_LENGTH),
});

/** Zod schema for validating the full /api/chat request body. */
const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(100),
  language: z.enum(["en", "uk", "ru"]).optional(),
  conversationId: z.number().int().positive().optional(),
});

/**
 * Creates an OpenAI-compatible provider with patched fetch.
 */
function createLLMProvider() {
  const baseURL = ENV.forgeApiUrl.endsWith("/v1")
    ? ENV.forgeApiUrl
    : `${ENV.forgeApiUrl}/v1`;

  return createOpenAI({
    baseURL,
    apiKey: ENV.forgeApiKey,
    fetch: createPatchedFetch(fetch),
  });
}

/**
 * HDAK Library tool registry.
 * These tools let the AI search library resources and generate catalog links
 * when a user asks "do you have author X?" or "what databases do you have?".
 */
export const tools = {
  /**
   * Search library resources by keyword/author/topic.
   * Returns matching local resource records and relevant hdakResources entries.
   */
  searchLibraryResources: tool({
    description:
      "Search library databases and resources by keyword, topic, or author. " +
      "Use this when the user asks about available databases, what resources " +
      "the library has, or anything related to specific topics or research areas.",
    inputSchema: z.object({
      query: z
        .string()
        .describe("Search query — author name, subject, database name, topic, etc."),
    }),
    execute: async ({ query }) => {
      const dbResources = await db.searchResources(query);
      const q = query.toLowerCase();
      const siteResources = hdakResources.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q)
      );
      return {
        query,
        dbResources: dbResources.slice(0, 5).map((r) => ({
          name: sanitizeUntrustedContent(r.nameUk || r.nameEn || ""),
          description: sanitizeUntrustedContent(r.descriptionUk || r.descriptionEn || ""),
          url: r.url,
          type: r.type,
        })),
        siteResources: siteResources.slice(0, 4).map((r) => ({
          name: r.name,
          description: r.description,
          url: r.url,
          accessConditions: r.accessConditions,
        })),
        found: dbResources.length + siteResources.length,
      };
    },
  }),

  /**
   * Get a direct link to the HDAK electronic catalog and step-by-step search
   * instructions for finding a specific author, title, or subject.
   * Use this when the user asks "do you have author X?" or "how do I find book Y?".
   */
  getCatalogSearchLink: tool({
    description:
      "Get the HDAK electronic catalog URL and step-by-step instructions for " +
      "searching by author, title, or subject. Use this when the user asks " +
      "whether the library has a specific author or book, or how to find a " +
      "publication in the catalog.",
    inputSchema: z.object({
      searchTerm: z
        .string()
        .describe("The author name, book title, or subject to search for"),
      searchType: z
        .enum(["author", "title", "subject", "keyword"])
        .default("author")
        .describe("Type of search field to use"),
    }),
    execute: async ({ searchTerm, searchType }) => {
      const fieldLabel: Record<string, string> = {
        author: "Автор / Author",
        title: "Назва / Title",
        subject: "Тематика / Subject",
        keyword: "Ключові слова / Keywords",
      };
      return {
        catalogUrl: "https://library-service.com.ua:8443/khkhdak/DocumentSearchForm",
        catalogPageUrl: "https://lib-hdak.in.ua/e-catalog.html",
        repositoryUrl: "https://repository.ac.kharkov.ua/home",
        searchTerm,
        searchType,
        searchFieldLabel: fieldLabel[searchType] ?? fieldLabel.author,
        steps: [
          `Відкрийте електронний каталог ХДАК: https://lib-hdak.in.ua/e-catalog.html`,
          `Натисніть кнопку "Пошук" або перейдіть за посиланням: https://library-service.com.ua:8443/khkhdak/DocumentSearchForm`,
          `У полі "${fieldLabel[searchType]}" введіть: ${searchTerm}`,
          `Натисніть кнопку пошуку та перегляньте результати.`,
        ],
        repositoryNote:
          "Якщо шукаєте публікації вчених ХДАК — скористайтесь репозитарієм: https://repository.ac.kharkov.ua/home",
      };
    },
  }),
};

/**
 * Build the HDAK library system prompt for the given language.
 */
function buildSystemPrompt(language: "en" | "uk" | "ru"): string {
  return getSystemPrompt(language, {
    libraryInfo: officialLibraryInfo[language],
    libraryResources: officialLibraryResources[language],
  });
}

/**
 * Registers the /api/chat endpoint for streaming AI responses.
 * Accepts optional `language` ("uk" | "ru" | "en") in the request body.
 *
 * @example
 * ```ts
 * // In server/_core/index.ts
 * import { registerChatRoutes } from "./chat";
 *
 * registerChatRoutes(app);
 * ```
 */
export function registerChatRoutes(app: Express) {
  const openai = createLLMProvider();

  app.post("/api/chat", async (req, res) => {
    try {
      const parseResult = chatRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({ error: "Invalid request", details: parseResult.error.issues });
        return;
      }

      const { messages, language, conversationId } = parseResult.data;

      // Sanitize message content (strip HTML and injection patterns) before passing to AI
      const sanitizedMessages = messages.map((m) => ({
        role: m.role,
        content: sanitizeUntrustedContent(m.content),
      }));

      const lastUserMessage = findLastUserMessage(sanitizedMessages);
      const detectedLanguage = lastUserMessage ? detectLanguageFromText(lastUserMessage) : null;
      const lang: "en" | "uk" | "ru" = language ?? detectedLanguage ?? "uk";

      // When a conversationId is supplied, verify the caller is authenticated
      // and owns that conversation before allowing messages to be persisted.
      let convId: number | null = null;
      if (conversationId !== undefined) {
        let requestUser = null;
        try {
          requestUser = await sdk.authenticateRequest(req);
        } catch (authErr) {
          logger.warn("[/api/chat] Authentication error while checking conversationId ownership", {
            conversationId,
            error: authErr instanceof Error ? authErr.message : String(authErr),
          });
        }
        if (!requestUser) {
          res.status(401).json({ error: "Authentication required to save to a conversation" });
          return;
        }
        const conv = await db.getConversation(conversationId);
        if (!conv || conv.userId !== requestUser.id) {
          res.status(403).json({ error: "Access denied" });
          return;
        }
        convId = conversationId;
      }

      /**
       * When a conversationId is provided the client (new useChat API) sends only the
       * latest user message. Load the persisted history from DB so the AI has full context,
       * then append the new sanitized message(s) from the client.
       *
       * We cap at MAX_CHAT_HISTORY messages to avoid bloated prompts.
       */
      const MAX_CHAT_HISTORY = 14;
      let dbHistory: { role: "user" | "assistant"; content: string }[] = [];
      if (convId !== null) {
        try {
          const history = await db.getMessages(convId);
          dbHistory = history
            .slice(-MAX_CHAT_HISTORY)
            // Only include roles the AI understands; system messages are handled
            // via the system prompt, so they are intentionally excluded here.
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
        } catch (err) {
          logger.warn("[/api/chat] Failed to load conversation history", {
            conversationId: convId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      // Build the full message array for the AI: persisted history + new client message(s)
      const messagesForAI: { role: "user" | "assistant"; content: string }[] =
        dbHistory.length > 0 ? [...dbHistory, ...sanitizedMessages] : sanitizedMessages;

      const result = streamText({
        model: openai.chat(AI_MODEL_NAME),
        system: buildSystemPrompt(lang),
        messages: messagesForAI,
        tools,
        temperature: AI_TEMPERATURE,
        stopWhen: stepCountIs(5),
        timeout: CHAT_TIMEOUT_MS,
        onFinish: async ({ text }) => {
          if (convId !== null) {
            try {
              // Save the original (pre-sanitization) user message so the user
              // sees exactly what they typed. The AI received the sanitized version.
              const lastUserMsg = findLastUserMessage(messages);
              if (lastUserMsg) {
                await db.createMessage(convId, "user", lastUserMsg);
              }
              await db.createMessage(convId, "assistant", text);
            } catch (err) {
              logger.error("[/api/chat] Failed to save messages", { err });
            }
          }
        },
      });

      result.pipeUIMessageStreamToResponse(res);
    } catch (error) {
      logger.error("[/api/chat] Error", { error: error instanceof Error ? error.message : String(error) });
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });
}
