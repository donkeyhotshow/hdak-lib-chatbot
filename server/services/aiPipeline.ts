import { generateText, type CoreMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import type { LibraryResource } from "../../drizzle/schema";
import * as db from "../db";
import { getRagContext } from "../rag-service";
import {
  getSystemPrompt,
  officialLibraryInfo,
  officialLibraryResources,
} from "../system-prompts-official";

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
    const ragContext = await getRagContext(prompt, language);

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

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      messages: history,
      prompt,
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

  console.error("[AI pipeline] Failed to generate response", baseContext);

  if (error instanceof Error && error.stack) {
    console.error(error.stack);
  }
}
