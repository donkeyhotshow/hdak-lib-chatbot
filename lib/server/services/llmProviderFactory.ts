import { createOpenAI } from "@ai-sdk/openai";
import { ENV } from "../_core/env";
import { createPatchedFetch } from "../_core/patchedFetch";

/**
 * Creates an OpenAI-compatible LLM provider using the configured forge API
 * endpoint and credentials (`BUILT_IN_FORGE_API_URL` / `FORGE_API_URL` and
 * the corresponding API key).
 *
 * The URL is normalised: `/v1` is appended when the configured URL does not
 * already contain a versioned path segment (e.g. `/v1beta`, `/openai`, `/v1`).
 *
 * @throws {Error} when `forgeApiUrl` is not configured.
 */
export function createLLMProvider() {
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
