import { createOpenAI } from "@ai-sdk/openai";
import { stepCountIs, streamText } from "ai";
import { SECURITY_CONFIG } from "../config/security";
import { ENV } from "../_core/env";
import { createPatchedFetch } from "../_core/patchedFetch";
import {
  AI_MODEL_NAME,
  AI_TEMPERATURE,
  detectLanguageFromText,
  getOfficialSystemPrompt,
} from "./aiPipeline";
import { guardPrompt } from "../security/promptGuard";
import {
  trimHistoryMessages,
  trimPromptToTokenLimit,
} from "../security/tokenLimits";
import { buildAiTools } from "./toolExecutor";

const MAX_TOOL_CALLS = 5;

type ChatMessage = { role: "assistant" | "user"; content: string };

function buildModelAttemptOrder(primaryModel: string): string[] {
  const fallbacks = ENV.openRouterFallbackModels ?? [];
  return [...new Set([primaryModel, ...fallbacks])];
}

function createLLMProvider() {
  const rawUrl = ENV.forgeApiUrl;
  if (!rawUrl) {
    throw new Error(
      "Missing AI base URL. Set BUILT_IN_FORGE_API_URL or FORGE_API_URL."
    );
  }
  const hasVersionedPath =
    rawUrl.includes("/v1beta") ||
    rawUrl.includes("/openai") ||
    rawUrl.endsWith("/v1");
  const baseURL = hasVersionedPath ? rawUrl : `${rawUrl}/v1`;
  const providerName = baseURL.includes("openrouter.ai")
    ? "openrouter"
    : "openai-compatible";

  return {
    providerName,
    provider: createOpenAI({
      baseURL,
      apiKey: ENV.forgeApiKey,
      headers: {
        ...(ENV.openRouterHttpReferer
          ? { "HTTP-Referer": ENV.openRouterHttpReferer }
          : {}),
        ...(ENV.openRouterXTitle ? { "X-Title": ENV.openRouterXTitle } : {}),
      },
      fetch: createPatchedFetch(fetch),
    }),
  };
}

export async function runAiOrchestration(params: {
  messages: ChatMessage[];
  language?: "en" | "uk" | "ru";
  model?: string;
  history: ChatMessage[];
  knowledgeContext?: string | null;
  context: { endpoint: string; userId?: number | null; ip?: string | null };
  onFinish?: (payload: {
    text: string;
    usage?: {
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
    } | null;
    model: string;
    provider: string;
  }) => Promise<void>;
  onError?: (error: unknown) => void;
}) {
  const guardedMessages = params.messages.map(message => {
    if (message.role !== "user") return { ...message, flagged: false };
    const guarded = guardPrompt(message.content, params.context);
    return {
      role: message.role,
      flagged: guarded.flagged,
      content: trimPromptToTokenLimit(guarded.sanitizedPrompt, params.context),
    };
  });

  if (guardedMessages.some(message => message.flagged)) {
    return {
      flagged: true as const,
      fallbackResponse: SECURITY_CONFIG.promptInjection.safeFallbackResponse,
    };
  }

  const messages = guardedMessages.map(message => ({
    role: message.role,
    content: message.content,
  }));
  const lastUserMessage =
    [...messages].reverse().find(message => message.role === "user")?.content ??
    "";
  const detectedLanguage = lastUserMessage
    ? detectLanguageFromText(lastUserMessage)
    : null;
  const language: "en" | "uk" | "ru" =
    params.language ?? detectedLanguage ?? "uk";

  const messagesForAi = trimHistoryMessages(
    [...params.history, ...messages],
    params.context
  );
  const { provider, providerName } = createLLMProvider();
  const primaryModel = params.model ?? ENV.aiModelName ?? AI_MODEL_NAME;
  const modelAttempts = buildModelAttemptOrder(primaryModel);
  const systemPrompt = params.knowledgeContext
    ? `${getOfficialSystemPrompt(language)}\n\n${params.knowledgeContext}`
    : getOfficialSystemPrompt(language);
  let stream: unknown = null;
  let selectedModel = primaryModel;
  let lastError: unknown = null;

  for (const candidateModel of modelAttempts) {
    try {
      // Fallback retries handle model initialization errors (e.g., unsupported
      // model identifier). Runtime stream failures are surfaced via onError.
      selectedModel = candidateModel;
      stream = streamText({
        model: provider.chat(candidateModel),
        system: systemPrompt,
        messages: messagesForAi,
        tools: buildAiTools(params.context),
        temperature: AI_TEMPERATURE,
        stopWhen: stepCountIs(MAX_TOOL_CALLS),
        timeout: SECURITY_CONFIG.chat.timeoutMs,
        onFinish: async ({ text, usage }) => {
          if (params.onFinish) {
            await params.onFinish({
              text,
              usage: usage ?? null,
              model: selectedModel,
              provider: providerName,
            });
          }
        },
        onError: ({ error }) => params.onError?.(error),
      });
      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (!stream) {
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  return {
    flagged: false as const,
    stream: stream as ReturnType<typeof streamText>,
    language,
  };
}

export { MAX_TOOL_CALLS };
