/**
 * AI Provider Fallback System
 *
 * Wraps `streamText` and `generateText` from the Vercel AI SDK with an
 * automatic fallback chain.  If the primary provider returns any error
 * (rate limit, timeout, network failure, server error) the call is
 * transparently retried with the next configured provider.
 *
 * Configuration via environment variables:
 *   Primary:  BUILT_IN_FORGE_API_URL / BUILT_IN_FORGE_API_KEY / LLM_MODEL
 *   Fallback: FALLBACK_API_URL       / FALLBACK_API_KEY       / FALLBACK_MODEL
 *
 * The fallback is skipped when FALLBACK_API_KEY is not set.
 */

import { streamText, generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { ENV } from "./_core/env";

// ── Provider factory ──────────────────────────────────────────────────────────

/**
 * Build an OpenAI-compatible provider client for the given credentials.
 */
export function makeProvider(baseURL: string, apiKey: string) {
  return createOpenAI({ baseURL, apiKey });
}

// ── Provider list ─────────────────────────────────────────────────────────────

/** A provider configuration entry. */
export interface ProviderConfig {
  baseURL: string;
  apiKey: string;
  model: string;
}

/**
 * Return the ordered list of configured providers.
 * The primary provider is always first; the fallback is appended when its
 * API key is set.  Entries whose `baseURL` or `apiKey` is empty are dropped
 * so a partially-configured provider never causes spurious calls.
 */
export function getProviders(): ProviderConfig[] {
  const candidates: ProviderConfig[] = [
    {
      baseURL: ENV.forgeApiUrl,
      apiKey: ENV.forgeApiKey,
      model: ENV.llmModel,
    },
    {
      baseURL: ENV.fallbackApiUrl,
      apiKey: ENV.fallbackApiKey,
      model: ENV.fallbackModel,
    },
  ];
  return candidates.filter(p => Boolean(p.baseURL) && Boolean(p.apiKey));
}

// ── Streaming wrapper ─────────────────────────────────────────────────────────

/** Parameters forwarded to `streamText` (minus `model` which we inject). */
type StreamTextParams = Omit<Parameters<typeof streamText>[0], "model">;

/**
 * Call `streamText` with automatic provider fallback.
 *
 * Iterates over `getProviders()` in order.  On success the result is returned
 * immediately.  On failure (any thrown error) a warning is logged and the next
 * provider is tried.  If every provider fails the last error is re-thrown as a
 * clear "all providers unavailable" message.
 *
 * @throws {Error} When every configured provider fails.
 */
export async function streamWithFallback(
  params: StreamTextParams
): Promise<ReturnType<typeof streamText>> {
  const providers = getProviders();

  if (providers.length === 0) {
    throw new Error(
      "No AI providers configured. Set BUILT_IN_FORGE_API_KEY to enable the service."
    );
  }

  let lastError: unknown;

  for (let i = 0; i < providers.length; i++) {
    const cfg = providers[i];
    try {
      const provider = makeProvider(cfg.baseURL, cfg.apiKey);
      // We must cast the assembled params to satisfy the Vercel AI SDK's
      // discriminated-union overloads (messages vs prompt) that TypeScript
      // cannot narrow through a generic spread.
      return streamText({
        model: provider.chat(cfg.model),
        ...params,
      } as Parameters<typeof streamText>[0]);
    } catch (err) {
      lastError = err;
      if (i < providers.length - 1) {
        console.warn(
          `Provider ${i + 1} failed, trying next:`,
          err instanceof Error ? err.message : String(err)
        );
      }
    }
  }

  throw new Error(
    `All AI providers unavailable. Please try again later. Last error: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

// ── Non-streaming wrapper ─────────────────────────────────────────────────────

/** Parameters forwarded to `generateText` (minus `model` which we inject). */
type GenerateTextParams = Omit<Parameters<typeof generateText>[0], "model">;

/**
 * Call `generateText` with automatic provider fallback.
 *
 * Same retry semantics as {@link streamWithFallback}.
 *
 * @throws {Error} When every configured provider fails.
 */
export async function generateWithFallback(
  params: GenerateTextParams
): Promise<Awaited<ReturnType<typeof generateText>>> {
  const providers = getProviders();

  if (providers.length === 0) {
    throw new Error(
      "No AI providers configured. Set BUILT_IN_FORGE_API_KEY to enable the service."
    );
  }

  let lastError: unknown;

  for (let i = 0; i < providers.length; i++) {
    const cfg = providers[i];
    try {
      const provider = makeProvider(cfg.baseURL, cfg.apiKey);
      // Cast the assembled params to satisfy the Vercel AI SDK's
      // discriminated-union overloads.
      return await generateText({
        model: provider.chat(cfg.model),
        ...params,
      } as Parameters<typeof generateText>[0]);
    } catch (err) {
      lastError = err;
      if (i < providers.length - 1) {
        console.warn(
          `Provider ${i + 1} failed, trying next:`,
          err instanceof Error ? err.message : String(err)
        );
      }
    }
  }

  throw new Error(
    `All AI providers unavailable. Please try again later. Last error: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}
