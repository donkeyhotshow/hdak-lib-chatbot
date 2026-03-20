import { afterEach, describe, expect, it, vi } from "vitest";
import * as env from "../_core/env";

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() => ({ chat: vi.fn() })),
}));

vi.mock("../_core/patchedFetch", () => ({
  createPatchedFetch: vi.fn(() => fetch),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createLLMProvider", () => {
  it("throws when forgeApiUrl is not configured", async () => {
    vi.spyOn(env, "ENV", "get").mockReturnValue({
      ...env.ENV,
      forgeApiUrl: undefined as unknown as string,
    });

    const { createLLMProvider } = await import("./llmProviderFactory");
    expect(() => createLLMProvider()).toThrow(
      "Missing AI base URL. Set BUILT_IN_FORGE_API_URL or FORGE_API_URL."
    );
  });

  it("appends /v1 when URL does not have a versioned path", async () => {
    const { createOpenAI } = await import("@ai-sdk/openai");
    vi.spyOn(env, "ENV", "get").mockReturnValue({
      ...env.ENV,
      forgeApiUrl: "https://api.example.com",
      forgeApiKey: "test-key",
      openRouterHttpReferer: undefined as unknown as string,
      openRouterXTitle: undefined as unknown as string,
    });

    const { createLLMProvider } = await import("./llmProviderFactory");
    createLLMProvider();

    expect(vi.mocked(createOpenAI)).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: "https://api.example.com/v1",
      })
    );
  });

  it("does not append /v1 when URL already ends with /v1", async () => {
    const { createOpenAI } = await import("@ai-sdk/openai");
    vi.spyOn(env, "ENV", "get").mockReturnValue({
      ...env.ENV,
      forgeApiUrl: "https://api.example.com/v1",
      forgeApiKey: "test-key",
      openRouterHttpReferer: undefined as unknown as string,
      openRouterXTitle: undefined as unknown as string,
    });

    const { createLLMProvider } = await import("./llmProviderFactory");
    createLLMProvider();

    expect(vi.mocked(createOpenAI)).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: "https://api.example.com/v1",
      })
    );
  });

  it("does not append /v1 when URL contains /v1beta", async () => {
    const { createOpenAI } = await import("@ai-sdk/openai");
    vi.spyOn(env, "ENV", "get").mockReturnValue({
      ...env.ENV,
      forgeApiUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
      forgeApiKey: "test-key",
      openRouterHttpReferer: undefined as unknown as string,
      openRouterXTitle: undefined as unknown as string,
    });

    const { createLLMProvider } = await import("./llmProviderFactory");
    createLLMProvider();

    expect(vi.mocked(createOpenAI)).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
      })
    );
  });

  it("sets providerName to 'openrouter' for OpenRouter URLs", async () => {
    vi.spyOn(env, "ENV", "get").mockReturnValue({
      ...env.ENV,
      forgeApiUrl: "https://openrouter.ai/api",
      forgeApiKey: "test-key",
      openRouterHttpReferer: undefined as unknown as string,
      openRouterXTitle: undefined as unknown as string,
    });

    const { createLLMProvider } = await import("./llmProviderFactory");
    const { providerName } = createLLMProvider();
    expect(providerName).toBe("openrouter");
  });

  it("sets providerName to 'openai-compatible' for non-OpenRouter URLs", async () => {
    vi.spyOn(env, "ENV", "get").mockReturnValue({
      ...env.ENV,
      forgeApiUrl: "https://api.example.com/v1",
      forgeApiKey: "test-key",
      openRouterHttpReferer: undefined as unknown as string,
      openRouterXTitle: undefined as unknown as string,
    });

    const { createLLMProvider } = await import("./llmProviderFactory");
    const { providerName } = createLLMProvider();
    expect(providerName).toBe("openai-compatible");
  });

  it("includes HTTP-Referer header when openRouterHttpReferer is configured", async () => {
    const { createOpenAI } = await import("@ai-sdk/openai");
    vi.spyOn(env, "ENV", "get").mockReturnValue({
      ...env.ENV,
      forgeApiUrl: "https://openrouter.ai/api/v1",
      forgeApiKey: "test-key",
      openRouterHttpReferer: "https://my-app.com",
      openRouterXTitle: undefined as unknown as string,
    });

    const { createLLMProvider } = await import("./llmProviderFactory");
    createLLMProvider();

    expect(vi.mocked(createOpenAI)).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          "HTTP-Referer": "https://my-app.com",
        }),
      })
    );
  });

  it("includes X-Title header when openRouterXTitle is configured", async () => {
    const { createOpenAI } = await import("@ai-sdk/openai");
    vi.spyOn(env, "ENV", "get").mockReturnValue({
      ...env.ENV,
      forgeApiUrl: "https://openrouter.ai/api/v1",
      forgeApiKey: "test-key",
      openRouterHttpReferer: undefined as unknown as string,
      openRouterXTitle: "My App",
    });

    const { createLLMProvider } = await import("./llmProviderFactory");
    createLLMProvider();

    expect(vi.mocked(createOpenAI)).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Title": "My App",
        }),
      })
    );
  });
});
