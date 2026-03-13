/**
 * Chat API Handler
 *
 * Express endpoint for AI SDK streaming chat with HDAK library tools.
 * Uses patched fetch to fix OpenAI-compatible proxy issues.
 */

import { streamText, stepCountIs } from "ai";
import { tool } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { TRPCError } from "@trpc/server";
import type { Express } from "express";
import { z } from "zod/v4";
import { ENV } from "./env";
import { createPatchedFetch } from "./patchedFetch";
import { logger } from "./logger";
import { sdk } from "./sdk";
import * as db from "../db";
import {
  getSystemPrompt,
  officialLibraryInfo,
  officialLibraryResources,
  hdakResources,
} from "../system-prompts-official";
import {
  detectLanguageFromText,
  sanitizeUntrustedContent,
  AI_TEMPERATURE,
  AI_MODEL_NAME,
} from "../services/aiPipeline";
import { getOwnedConversationHistory } from "../services/chatService";
import { recordLatency, recordStreamOutcome } from "./metrics";

/** Maximum number of recent messages to scan when detecting the last user language. */
const MAX_LANGUAGE_LOOKBACK = 20;

type IncomingMessage = { role?: string; content?: string };

function findLastUserMessage(messages: IncomingMessage[] | unknown): string {
  if (!Array.isArray(messages)) return "";

  let scanned = 0;
  for (
    let i = messages.length - 1;
    i >= 0 && scanned < MAX_LANGUAGE_LOOKBACK;
    i--, scanned++
  ) {
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
export const MAX_CHAT_MESSAGE_LENGTH = 10_000;

/** Zod schema for validating individual chat messages from the client. */
const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(MAX_CHAT_MESSAGE_LENGTH),
});

/** Zod schema for validating the full /api/chat request body. */
export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(100),
  language: z.enum(["en", "uk", "ru"]).optional(),
  conversationId: z.number().int().positive().optional(),
});

/**
 * Creates an OpenAI-compatible provider with patched fetch.
 */
function createLLMProvider() {
  const rawUrl = ENV.forgeApiUrl;
  // Use the URL as-is when it already contains a versioned path (e.g. Gemini's
  // /v1beta/openai). Only append /v1 for plain base URLs like https://api.openai.com.
  const hasVersionedPath =
    rawUrl.includes("/v1beta") ||
    rawUrl.includes("/openai") ||
    rawUrl.endsWith("/v1");
  const baseURL = hasVersionedPath ? rawUrl : `${rawUrl}/v1`;

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
        .describe(
          "Search query — author name, subject, database name, topic, etc."
        ),
    }),
    execute: async ({ query }) => {
      const dbResources = await db.searchResources(query);
      const q = query.toLowerCase();
      const siteResources = hdakResources.filter(
        r =>
          r.name.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q)
      );
      return {
        query,
        dbResources: dbResources.slice(0, 5).map(r => ({
          name: sanitizeUntrustedContent(r.nameUk || r.nameEn || ""),
          description: sanitizeUntrustedContent(
            r.descriptionUk || r.descriptionEn || ""
          ),
          url: r.url,
          type: r.type,
        })),
        siteResources: siteResources.slice(0, 4).map(r => ({
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
        catalogUrl:
          "https://library-service.com.ua:8443/khkhdak/DocumentSearchForm",
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

  /**
   * Search upcoming or recent HDAK library events, exhibitions, and announcements
   * by date range or keyword.  When the user asks "what events does the library
   * have?", "are there any exhibitions this month?", or "I'm looking for events
   * about [topic]" — call this tool.
   */
  findUpcomingLibraryEvents: tool({
    description:
      "Find upcoming or recent events, exhibitions, lectures, and announcements " +
      "at the HDAK library. Use when the user asks about library events, what's " +
      "happening at the library, exhibitions, or cultural activities.",
    inputSchema: z.object({
      keyword: z
        .string()
        .optional()
        .describe(
          "Optional keyword or topic to filter events, e.g. 'виставка', 'лекція', 'презентація'"
        ),
      dateFrom: z
        .string()
        .regex(
          /^\d{4}-\d{2}-\d{2}$/,
          "dateFrom must be a valid date in YYYY-MM-DD format"
        )
        .optional()
        .describe(
          "Optional ISO date (YYYY-MM-DD) — filter events on or after this date"
        ),
      dateTo: z
        .string()
        .regex(
          /^\d{4}-\d{2}-\d{2}$/,
          "dateTo must be a valid date in YYYY-MM-DD format"
        )
        .optional()
        .describe(
          "Optional ISO date (YYYY-MM-DD) — filter events up to and including this date"
        ),
    }),
    execute: async ({ keyword, dateFrom, dateTo }) => {
      // Search library info entries whose key starts with "event" or contains the keyword.
      // This provides a lightweight events registry without a dedicated DB table.
      const allInfo = await db.getAllLibraryInfo();
      const kw = keyword?.toLowerCase() ?? "";
      const from = dateFrom ? new Date(dateFrom) : null;
      const to = dateTo ? new Date(dateTo) : null;

      const events = allInfo.filter(entry => {
        const isEvent =
          entry.key.toLowerCase().startsWith("event") ||
          entry.key.toLowerCase().includes("announcement") ||
          entry.key.toLowerCase().includes("exhibition") ||
          (kw &&
            ((entry.valueUk ?? "").toLowerCase().includes(kw) ||
              (entry.valueEn ?? "").toLowerCase().includes(kw) ||
              (entry.valueRu ?? "").toLowerCase().includes(kw)));
        if (!isEvent) return false;
        // Date filtering: parse date embedded in the key (e.g. "event_2024-12-15_exhibition")
        if (from || to) {
          const dateMatch = entry.key.match(/(\d{4}-\d{2}-\d{2})/);
          if (dateMatch) {
            const d = new Date(dateMatch[1]);
            if (from && d < from) return false;
            if (to && d > to) return false;
          }
        }
        return true;
      });

      return {
        found: events.length,
        eventsPageUrl: "https://lib-hdak.in.ua/news.html",
        events: events.slice(0, 8).map(e => ({
          key: e.key,
          uk: e.valueUk,
          en: e.valueEn,
          ru: e.valueRu,
        })),
        note:
          events.length === 0
            ? "No matching events found in the library info registry. Check the library news page: https://lib-hdak.in.ua/news.html"
            : undefined,
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
    const requestStartMs = Date.now();
    try {
      const parseResult = chatRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        // Return 413 when any message content exceeds the per-message size limit;
        // return 400 for all other validation failures (wrong role, empty content, etc.).
        const hasTooLarge = parseResult.error.issues.some(
          issue => issue.code === "too_big" && issue.path.includes("content")
        );
        if (hasTooLarge) {
          res.status(413).json({
            error: "Message too large",
            details: `Each message must be at most ${MAX_CHAT_MESSAGE_LENGTH} characters.`,
          });
          return;
        }
        res.status(400).json({
          error: "Invalid request",
          details: parseResult.error.issues,
        });
        return;
      }

      const { messages, language, conversationId } = parseResult.data;

      // Sanitize message content (strip HTML and injection patterns) before passing to AI
      const sanitizedMessages = messages.map(m => ({
        role: m.role,
        content: sanitizeUntrustedContent(m.content),
      }));

      const lastUserMessage = findLastUserMessage(sanitizedMessages);
      const detectedLanguage = lastUserMessage
        ? detectLanguageFromText(lastUserMessage)
        : null;
      const lang: "en" | "uk" | "ru" = language ?? detectedLanguage ?? "uk";

      // conversationId-scoped operations require authentication + ownership checks.
      let convId: number | null = null;
      let authUserId: number | null = null;
      if (conversationId !== undefined) {
        try {
          const user = await sdk.authenticateRequest(req);
          authUserId = user.id;
        } catch {
          res.status(401).json({ error: "Authentication required" });
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
      // 14 messages (7 user + 7 assistant) sits comfortably within the model's
      // context window while providing enough history for coherent multi-turn
      // conversations without incurring unnecessary token costs.
      const MAX_CHAT_HISTORY = 14;
      let dbHistory: { role: "user" | "assistant"; content: string }[] = [];
      if (convId !== null && authUserId !== null) {
        try {
          dbHistory = await getOwnedConversationHistory(
            convId,
            authUserId,
            MAX_CHAT_HISTORY
          );
        } catch (err) {
          if (err instanceof TRPCError) {
            if (err.code === "NOT_FOUND") {
              res.status(404).json({ error: "Conversation not found" });
              return;
            }
            if (err.code === "FORBIDDEN") {
              res.status(403).json({ error: "Access denied" });
              return;
            }
          }

          logger.warn("[/api/chat] Failed to load conversation history", {
            conversationId: convId,
            error: err instanceof Error ? err.message : String(err),
          });
          res
            .status(500)
            .json({ error: "Failed to load conversation history" });
          return;
        }
      }

      // Build the full message array for the AI: persisted history + new client message(s)
      const messagesForAI: { role: "user" | "assistant"; content: string }[] =
        dbHistory.length > 0
          ? [...dbHistory, ...sanitizedMessages]
          : sanitizedMessages;

      const result = streamText({
        model: openai.chat(AI_MODEL_NAME),
        system: buildSystemPrompt(lang),
        messages: messagesForAI,
        tools,
        temperature: AI_TEMPERATURE,
        stopWhen: stepCountIs(5),
        timeout: CHAT_TIMEOUT_MS,
        onFinish: async ({ text }) => {
          recordLatency(Date.now() - requestStartMs);
          recordStreamOutcome("success");
          if (convId !== null && authUserId !== null) {
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
        onError: ({ error }) => {
          const latencyMs = Date.now() - requestStartMs;
          const isTimeout =
            error instanceof Error &&
            (error.message.toLowerCase().includes("timeout") ||
              error.message.toLowerCase().includes("timed out"));
          recordLatency(latencyMs);
          recordStreamOutcome(isTimeout ? "timeout" : "error");
          logger.error("[/api/chat] streamText error", {
            error: error instanceof Error ? error.message : String(error),
          });
        },
      });

      result.pipeUIMessageStreamToResponse(res);
    } catch (error) {
      logger.error("[/api/chat] Error", {
        error: error instanceof Error ? error.message : String(error),
      });
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });
}
