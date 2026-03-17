import { beforeEach, describe, expect, it, vi } from "vitest";

const runAiOrchestrationMock = vi.fn();
const loadConversationHistoryMock = vi.fn();
const persistConversationMessagesMock = vi.fn();

vi.mock("./aiOrchestrator", () => ({
  runAiOrchestration: runAiOrchestrationMock,
}));

vi.mock("./conversationMemory", () => ({
  loadConversationHistory: loadConversationHistoryMock,
  persistConversationMessages: persistConversationMessagesMock,
}));

describe("processChatRequest instant answers", () => {
  beforeEach(() => {
    runAiOrchestrationMock.mockReset();
    loadConversationHistoryMock.mockReset();
    persistConversationMessagesMock.mockReset();

    runAiOrchestrationMock.mockResolvedValue({
      flagged: false,
      stream: {
        toUIMessageStreamResponse: () => new Response("ok"),
        pipeUIMessageStreamToResponse: vi.fn(),
      },
      language: "uk",
    });
    loadConversationHistoryMock.mockResolvedValue([]);
    persistConversationMessagesMock.mockResolvedValue(undefined);
  });

  it("returns instant FAQ answer without LLM call for typical question", async () => {
    const { processChatRequest } = await import("./chatService");

    const result = await processChatRequest({
      messages: [{ role: "user", content: "Як записатися до бібліотеки?" }],
      userId: null,
      ip: "127.0.0.1",
    });

    expect(result.flagged).toBe(false);
    expect(runAiOrchestrationMock).not.toHaveBeenCalled();
    expect(typeof result.stream.toUIMessageStreamResponse).toBe("function");
  });

  it("falls back to normal LLM orchestration for non-FAQ question", async () => {
    const { processChatRequest } = await import("./chatService");

    await processChatRequest({
      messages: [{ role: "user", content: "Поясни квантову криптографію" }],
      userId: null,
      ip: "127.0.0.1",
    });

    expect(runAiOrchestrationMock).toHaveBeenCalledTimes(1);
  });

  it("handles complex catalog query as instant answer without LLM call", async () => {
    const { processChatRequest } = await import("./chatService");

    const result = await processChatRequest({
      messages: [{ role: "user", content: "знайти автора Шевченко" }],
      userId: null,
      ip: "127.0.0.1",
    });

    expect(result.flagged).toBe(false);
    expect(runAiOrchestrationMock).not.toHaveBeenCalled();
  });

  it("persists instant answers for authenticated conversation flow", async () => {
    const { processChatRequest } = await import("./chatService");

    await processChatRequest({
      messages: [{ role: "user", content: "Де електронний каталог?" }],
      language: "uk",
      conversationId: 55,
      userId: 1,
      ip: "127.0.0.1",
    });

    expect(persistConversationMessagesMock).toHaveBeenCalledTimes(1);
    expect(runAiOrchestrationMock).not.toHaveBeenCalled();
  });
});
