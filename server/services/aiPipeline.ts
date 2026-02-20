import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import type { LibraryResource } from "../../drizzle/schema";
import * as db from "../db";
import { getRagContext } from "../rag-service";
import { logger } from "../_core/logger";
import {
  getSystemPrompt,
  officialLibraryInfo,
  officialLibraryResources,
} from "../system-prompts-official";

/** Maximum time (ms) allowed for a single AI text generation call. */
const AI_TIMEOUT_MS = 30_000;

/** Sampling temperature for AI responses. Balanced between consistency and creativity. */
export const AI_TEMPERATURE = 0.7;

/** Default chat model name, centralised here so both pathways stay in sync. */
export const AI_MODEL_NAME = "gpt-4o-mini";

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
  const filtered = lines.filter((line) => {
    const hasInjection = INJECTION_PATTERNS.some((pattern) => pattern.test(line));
    if (hasInjection) {
      logger.warn("[sanitizeUntrustedContent] Removed potential injection line", {
        line: line.slice(0, 120),
      });
    }
    return !hasInjection;
  });

  return filtered.join("\n").trim();
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

export const normalizeLanguage = (language: string | null | undefined): SupportedLanguage => {
  if (language === "uk" || language === "ru" || language === "en") return language;
  return "uk";
};

/**
 * Heuristic language detector for the latest user message.
 * Prefers Ukrainian by default, distinguishes Russian via ё/ы/э/ъ.
 * Returns null when the text is empty so callers can fall back to stored language.
 */
export const detectLanguageFromText = (text: string): SupportedLanguage | null => {
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

const buildResourceContext = (resources: LibraryResource[], language: SupportedLanguage) => {
  if (!resources.length) return "";

  const heading = resourceHeadings[language] ?? resourceHeadings.en;
  const resourceLines = resources
    .map((resource) => {
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

export async function generateConversationReply(params: AiPipelineParams): Promise<string> {
  const { prompt, language, conversationId, userId, history } = params;

  try {
    const relevantResources = await db.searchResources(prompt);
    const rawRagContext = await getRagContext(prompt, language);
    // Sanitize RAG context before injecting into the model prompt
    const ragContext = rawRagContext ? sanitizeUntrustedContent(rawRagContext) : "";

    await db.logUserQuery(
      userId,
      conversationId,
      prompt,
      language,
      relevantResources.map((r) => r.id)
    );

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
    const { text, usage } = await generateText({
      model: openai(AI_MODEL_NAME),
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
      inputTokens: usage?.inputTokens ?? 0,
      outputTokens: usage?.outputTokens ?? 0,
      totalTokens: usage?.totalTokens ?? 0,
    });

    return text;
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
