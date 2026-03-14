import { beforeEach, describe, expect, it, vi } from "vitest";

const createOpenAIMock = vi.fn();

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: createOpenAIMock,
}));

vi.mock("ai", () => ({
  stepCountIs: vi.fn(() => () => false),
  streamText: vi.fn(() => ({ stream: "ok" })),
}));

vi.mock("../config/security", () => ({
  SECURITY_CONFIG: {
    chat: { timeoutMs: 30_000 },
  },
}));

vi.mock("./aiPipeline", () => ({
  AI_MODEL_NAME: "gpt-4o-mini",
  AI_TEMPERATURE: 0.7,
  detectLanguageFromText: vi.fn(() => "uk"),
  getOfficialSystemPrompt: vi.fn(() => "system"),
}));

vi.mock("./toolExecutor", () => ({
  buildAiTools: vi.fn(() => ({})),
}));

vi.mock("../security/promptGuard", () => ({
  guardPrompt: vi.fn((prompt: string) => ({
    flagged: false,
    sanitizedPrompt: prompt,
  })),
}));

vi.mock("../security/tokenLimits", () => ({
  trimHistoryMessages: vi.fn((messages: unknown) => messages),
  trimPromptToTokenLimit: vi.fn((prompt: string) => prompt),
}));

vi.mock("../_core/patchedFetch", () => ({
  createPatchedFetch: vi.fn(() => fetch),
}));

describe("runAiOrchestration env requirements", () => {
  beforeEach(() => {
    vi.resetModules();
    createOpenAIMock.mockReset();
  });

  it("throws a clear error when AI base URL is missing", async () => {
    vi.doMock("../_core/env", () => ({
      ENV: {
        forgeApiUrl: "",
        forgeApiKey: "test-key",
      },
    }));

    const { runAiOrchestration } = await import("./aiOrchestrator");

    await expect(
      runAiOrchestration({
        messages: [{ role: "user", content: "hello" }],
        history: [],
        context: { endpoint: "/api/chat", userId: 1, ip: "127.0.0.1" },
      })
    ).rejects.toThrow(
      "Missing AI base URL. Set BUILT_IN_FORGE_API_URL or FORGE_API_URL."
    );
  });

  it("normalizes FORGE API base URL by appending /v1 when needed", async () => {
    createOpenAIMock.mockReturnValue({ chat: vi.fn(() => "model") });
    vi.doMock("../_core/env", () => ({
      ENV: {
        forgeApiUrl: "https://api.openai.com",
        forgeApiKey: "test-key",
      },
    }));

    const { runAiOrchestration } = await import("./aiOrchestrator");

    await runAiOrchestration({
      messages: [{ role: "user", content: "hello" }],
      history: [],
      context: { endpoint: "/api/chat", userId: 1, ip: "127.0.0.1" },
    });

    expect(createOpenAIMock).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: "https://api.openai.com/v1",
        apiKey: "test-key",
      })
    );
  });
});
