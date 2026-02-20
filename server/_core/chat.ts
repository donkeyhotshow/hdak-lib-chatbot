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
import * as db from "../db";
import { getSystemPrompt, officialLibraryInfo, officialLibraryResources, hdakResources } from "../system-prompts-official";
import { detectLanguageFromText } from "../services/aiPipeline";

/** Maximum time (ms) allowed for a single streaming chat request. */
const CHAT_TIMEOUT_MS = 30_000;

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
          name: r.nameUk || r.nameEn,
          description: r.descriptionUk || r.descriptionEn,
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
      const { messages, language } = req.body;

      if (!messages || !Array.isArray(messages)) {
        res.status(400).json({ error: "messages array is required" });
        return;
      }

      const lastUserMessage = Array.isArray(messages)
        ? [...messages].reverse().find((m) => m?.role === "user")?.content
        : "";
      const detectedLanguage = lastUserMessage ? detectLanguageFromText(String(lastUserMessage)) : null;
      const normalizedLanguage =
        language === "uk" || language === "ru" || language === "en" ? language : null;
      const lang: "en" | "uk" | "ru" = normalizedLanguage ?? detectedLanguage ?? "uk";

      const result = streamText({
        model: openai.chat("gpt-4o"),
        system: buildSystemPrompt(lang),
        messages,
        tools,
        stopWhen: stepCountIs(5),
        timeout: CHAT_TIMEOUT_MS,
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
