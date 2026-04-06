import { generateText } from "ai";
import NodeCache from "node-cache";
import type { LibraryResource } from "../../../drizzle/schema";
import { SECURITY_CONFIG } from "../config/security";
import * as db from "../db";
import { logger } from "../_core/logger";
import { ENV } from "../_core/env";
import { getRagContext } from "./rag/retriever";
import { buildRagPromptSection } from "./rag/promptBuilder";
import {
  getSystemPrompt,
  officialLibraryInfo,
  officialLibraryResources,
} from "../system-prompts-official";
import { createLLMProvider } from "./llmProviderFactory";

/** Maximum time (ms) allowed for a single AI text generation call. */
const AI_TIMEOUT_MS = 30_000;

/** Sampling temperature for AI responses. Balanced between consistency and creativity. */
export const AI_TEMPERATURE = 0.7;

/** Default chat model name, centralised here so both pathways stay in sync. */
export const AI_MODEL_NAME = ENV.aiModelName;

/** Cache for AI conversation replies: key = hash of (prompt+lang+history), TTL = 24h. */
const replyCache = new NodeCache({
  stdTTL: 24 * 60 * 60,
  checkperiod: 60 * 60,
});

/** Flush the reply cache — intended for testing only. */
export function clearReplyCache(): void {
  replyCache.flushAll();
}

/**
 * Patterns that indicate prompt injection attempts.
 * Used to sanitize untrusted text (RAG chunks, tool outputs) before
 * including it in the model context.
 */
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(previous|all|prior)\s+(instructions?|prompts?|rules?|context)/i,
  /disregard\s+(previous|all|prior|everything|the\s+above)/i,
  /forget\s+(everything|all|the\s+above|what\s+(I|you|we)\s+(said|discussed)|your\s+instructions)/i,
  /you\s+are\s+now\s+a?n?\s*\w+/i,
  /act\s+as\s+(a\s+)?(jailbroken|uncensored|unrestricted|different|evil|hacker|dan)\s/i,
  /new\s+instructions?:/i,
  /override\s+(system|instructions?)/i,
  /\[SYSTEM\]/i,
  /\[INST\]/i,
  /###\s*(instruction|system|prompt)/i,
];

/**
 * Sanitize a text string retrieved from untrusted sources (RAG chunks, tool
 * outputs) to remove HTML tags and obvious prompt-injection phrases.
 *
 * @param text Raw text from an untrusted source.
 * @returns Sanitized text safe for inclusion in model context.
 */
export function sanitizeUntrustedContent(text: string): string {
  // Iteratively strip HTML tags to handle malformed/nested tags (e.g. <scr<b>ipt>)
  let sanitized = text;
  let prev: string;
  do {
    prev = sanitized;
    sanitized = sanitized.replace(/<[^>]*>/g, "");
  } while (sanitized !== prev);

  // Remove lines containing injection patterns
  const lines = sanitized.split("\n");
  const filtered = lines.filter(line => {
    const hasInjection = INJECTION_PATTERNS.some(pattern => pattern.test(line));
    if (hasInjection) {
      logger.warn(
        "[sanitizeUntrustedContent] Removed potential injection line",
        {
          line: line.slice(0, 120),
        }
      );
    }
    return !hasInjection;
  });

  const result = filtered.join("\n").trim();

  // Log a summary warning whenever the output differs from the input so that
  // any HTML stripping or injection-line removal is surfaced in monitoring.
  if (result !== text.trim()) {
    logger.warn(
      "[sanitizeUntrustedContent] Content was modified — possible injection attempt",
      {
        originalLength: text.length,
        sanitizedLength: result.length,
        hadHtml: /<[^>]*>/.test(text),
      }
    );
  }

  return result;
}

export type SupportedLanguage = "en" | "uk" | "ru";

export type ConversationHistoryMessage = {
  role: "assistant" | "user";
  content: string;
};

const localizedErrorMessages: Record<SupportedLanguage, string> = {
  uk: "Вибачте, сталася помилка при генеруванні відповіді. Будь ласка, спробуйте ще раз.",
  ru: "Извините, произошла ошибка при генерировании ответа. Пожалуйста, попробуйте еще раз.",
  en: "Sorry, an error occurred while generating the response. Please try again.",
};

export class AiPipelineError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AiPipelineError";
  }
}

export const getOfficialSystemPrompt = (language: SupportedLanguage) => {
  const libInfo = officialLibraryInfo[language];
  const libResources = officialLibraryResources[language];

  return getSystemPrompt(language, {
    libraryInfo: libInfo,
    libraryResources: libResources,
  });
};

export const normalizeLanguage = (
  language: string | null | undefined
): SupportedLanguage => {
  if (language === "uk" || language === "ru" || language === "en")
    return language;
  return "uk";
};

/**
 * Heuristic language detector for the latest user message.
 * Prefers Ukrainian by default, distinguishes Russian via ё/ы/э/ъ.
 * Returns null when the text is empty so callers can fall back to stored language.
 */
export const detectLanguageFromText = (
  text: string
): SupportedLanguage | null => {
  if (!text.trim()) return null;
  const sample = text.toLowerCase();

  const ukScore = (sample.match(/[іїєґ]/g) ?? []).length;
  // Russian indicators: hard signs/vowels plus the common greeting stem "здравств".
  const ruScore = (sample.match(/[ёыэъ]|здравств/g) ?? []).length;

  if (ukScore > ruScore && ukScore > 0) return "uk";
  if (ruScore > ukScore && ruScore > 0) return "ru";
  const hasCyrillic = /[\u0400-\u04FF]/.test(sample);
  if (hasCyrillic) return "uk";
  return "en";
};

export const getLocalizedAiErrorMessage = (language: SupportedLanguage) =>
  localizedErrorMessages[language] ?? localizedErrorMessages.en;

const resourceHeadings: Record<SupportedLanguage, string> = {
  uk: "Доступні ресурси:",
  ru: "Доступные ресурсы:",
  en: "Available resources:",
};

const buildResourceContext = (
  resources: LibraryResource[],
  language: SupportedLanguage
) => {
  if (!resources.length) return "";

  const heading = resourceHeadings[language] ?? resourceHeadings.en;
  const resourceLines = resources
    .map(resource => {
      const name =
        language === "uk"
          ? resource.nameUk
          : language === "ru"
            ? resource.nameRu
            : resource.nameEn;
      const description =
        language === "uk"
          ? resource.descriptionUk
          : language === "ru"
            ? resource.descriptionRu
            : resource.descriptionEn;

      const safeName = name ?? resource.nameEn ?? "";
      const safeDescription = description ?? resource.descriptionEn ?? "";

      return `- ${safeName}: ${safeDescription}${resource.url ? ` (${resource.url})` : ""}`;
    })
    .join("\n");

  return `\n\n${heading}\n${resourceLines}`;
};

type AiPipelineParams = {
  prompt: string;
  language: SupportedLanguage;
  conversationId: number;
  userId: number;
  history: ConversationHistoryMessage[];
};

/** Indicates which knowledge source primarily contributed to the AI reply. */
export type MessageSource = "rag" | "catalog_search" | "general";

export type ConversationReplyResult = {
  text: string;
  source: MessageSource;
};

/**
 * Generate an AI reply for a chat message using the full pipeline.
 *
 * The pipeline executes the following steps in order:
 * 1. Checks the in-memory reply cache (24 h TTL) for an identical request.
 *    On a cache hit the LLM call and the expensive embedding API call are both
 *    skipped; only the cheap DB catalog search runs so source attribution stays
 *    accurate and analytics are recorded.
 * 2. Runs a catalog resource search to find relevant library links.
 * 3. Calls `getRagContext` to retrieve semantically similar document chunks
 *    (requires an OpenAI embedding API call — skipped on cache hit).
 * 4. Sanitises RAG content to prevent prompt-injection attacks.
 * 5. Builds a composite system prompt and calls the LLM.
 * 6. Caches the raw LLM text for subsequent identical requests.
 *
 * The `source` field in the result always reflects the **current** knowledge
 * base (computed fresh from live context, never read from cache) so that
 * UI attribution labels stay accurate even after catalog updates.
 *
 * @param params.prompt          The latest user message.
 * @param params.language        Detected/normalised language of the conversation.
 * @param params.conversationId  DB ID of the current conversation (for analytics).
 * @param params.userId          DB ID of the requesting user (for analytics).
 * @param params.history         Recent conversation history (up to last 10 messages).
 * @returns `{ text, source }` where `source` is `'rag'`, `'catalog_search'`, or `'general'`.
 * @throws {AiPipelineError} when the LLM call fails after all retries/timeouts.
 */
export async function generateConversationReply(
  params: AiPipelineParams
): Promise<ConversationReplyResult> {
  const { prompt, language, conversationId, userId, history } = params;

  // Build a deterministic cache key from the user prompt, language, recent history,
  // and userId.  Including userId prevents different users who happen to send the same
  // message from receiving each other's cached reply.
  // JSON.stringify escapes all special characters so no two distinct inputs share a key.
  const historyForKey = history.slice(-5).map(m => [m.role, m.content]);
  const cacheKey = `reply:${userId}:${language}:${JSON.stringify(historyForKey)}:${JSON.stringify(prompt)}`;

  try {
    // Run the cheap catalog DB search first so source attribution is always
    // accurate (computed from live data, not stored in cache).
    const relevantResources = await db.searchResources(prompt);

    // Determine the source based on catalog hits alone — RAG context is
    // checked below, but source is recalculated after getRagContext on a miss.
    const catalogSource: MessageSource =
      relevantResources.length > 0 ? "catalog_search" : "general";

    await db.logUserQuery(
      userId,
      conversationId,
      prompt,
      language,
      relevantResources.map(r => r.id)
    );

    // Check the cache BEFORE calling getRagContext (which makes an OpenAI
    // embedding API call).  On a cache hit the LLM + embedding calls are both
    // skipped; source is derived from the live catalog search above so UI
    // attribution labels remain accurate.
    const cachedText = replyCache.get<string>(cacheKey);
    if (cachedText !== undefined) {
      logger.info("[AI pipeline] Cache hit — returning cached reply", {
        conversationId,
        userId,
        source: catalogSource,
      });
      return { text: cachedText, source: catalogSource };
    }

    const rawRagContext = await getRagContext(prompt, language);
    // Sanitize RAG context before injecting into the model prompt
    const ragContext = rawRagContext
      ? buildRagPromptSection(sanitizeUntrustedContent(rawRagContext))
      : "";

    // Determine the knowledge source for this request (always computed fresh —
    // not cached — so source accurately reflects the current knowledge base).
    const hasRagContext = ragContext.length > 0 && !ragContext.includes("⚠️");
    const source: MessageSource = hasRagContext
      ? "rag"
      : relevantResources.length > 0
        ? "catalog_search"
        : "general";

    const systemPrompt = [
      getOfficialSystemPrompt(language),
      buildResourceContext(relevantResources, language),
      ragContext,
    ].join("");

    const allMessages: ConversationHistoryMessage[] = [
      ...history,
      { role: "user", content: prompt },
    ];

    const startMs = Date.now();
    const { provider } = createLLMProvider();
    const { text, usage } = await generateText({
      model: provider.chat(AI_MODEL_NAME),
      system: systemPrompt,
      messages: allMessages,
      temperature: AI_TEMPERATURE,
      timeout: AI_TIMEOUT_MS,
    });
    const latencyMs = Date.now() - startMs;

    logger.info("[AI pipeline] Response generated", {
      conversationId,
      userId,
      latencyMs,
      source,
      inputTokens: usage?.inputTokens ?? 0,
      outputTokens: usage?.outputTokens ?? 0,
      totalTokens: usage?.totalTokens ?? 0,
    });

    replyCache.set(cacheKey, text);
    return { text, source };
  } catch (error) {
    const cause = error instanceof Error ? error : new Error(String(error));
    throw new AiPipelineError("AI pipeline failed", { cause });
  }
}

export function logAiPipelineError(
  error: unknown,
  context: { conversationId: number; userId: number; prompt: string }
) {
  const baseContext = {
    conversationId: context.conversationId,
    userId: context.userId,
    prompt: context.prompt,
    error: error instanceof Error ? error.message : String(error),
  };

  logger.error("[AI pipeline] Failed to generate response", baseContext);

  if (error instanceof Error && error.stack) {
    logger.error(error.stack);
  }
}
