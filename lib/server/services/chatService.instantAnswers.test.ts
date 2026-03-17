import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const runAiOrchestrationMock = vi.fn();
const loadConversationHistoryMock = vi.fn();
const persistConversationMessagesMock = vi.fn();
const getMergedKnowledgeTopicsMock = vi.fn();

vi.mock("./aiOrchestrator", () => ({
  runAiOrchestration: runAiOrchestrationMock,
}));

vi.mock("./conversationMemory", () => ({
  loadConversationHistory: loadConversationHistoryMock,
  persistConversationMessages: persistConversationMessagesMock,
}));

vi.mock("./knowledgeAdmin", () => ({
  getMergedKnowledgeTopics: getMergedKnowledgeTopicsMock,
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
    getMergedKnowledgeTopicsMock.mockResolvedValue([]);
  });

  afterEach(async () => {
    const { clearResponseCache } = await import("./responseCache");
    const { clearChatAnalyticsEvents } = await import("./chatAnalytics");
    clearResponseCache();
    clearChatAnalyticsEvents();
  });

  it("returns instant FAQ answer without LLM call for typical question", async () => {
    const { processChatRequest } = await import("./chatService");
    const { listChatAnalyticsEvents } = await import("./chatAnalytics");

    const result = await processChatRequest({
      messages: [{ role: "user", content: "Як записатися до бібліотеки?" }],
      userId: null,
      ip: "127.0.0.1",
    });

    expect(result.flagged).toBe(false);
    expect(runAiOrchestrationMock).not.toHaveBeenCalled();
    expect(typeof result.stream.toUIMessageStreamResponse).toBe("function");
    expect(
      listChatAnalyticsEvents().some(
        event => event.name === "instant_answer_hit" && event.mode === "guest"
      )
    ).toBe(true);
  });

  it("falls back to normal LLM orchestration for non-FAQ question", async () => {
    const { processChatRequest } = await import("./chatService");
    const { listChatAnalyticsEvents } = await import("./chatAnalytics");

    await processChatRequest({
      messages: [{ role: "user", content: "Поясни квантову криптографію" }],
      userId: null,
      ip: "127.0.0.1",
    });

    expect(runAiOrchestrationMock).toHaveBeenCalledTimes(1);
    expect(
      listChatAnalyticsEvents().some(event => event.name === "retrieval_hit")
    ).toBe(false);
  });

  it("injects official retrieval context into LLM flow when chunks are found", async () => {
    const { processChatRequest } = await import("./chatService");
    const { listChatAnalyticsEvents } = await import("./chatAnalytics");

    await processChatRequest({
      messages: [{ role: "user", content: "навігація розділи" }],
      userId: null,
      ip: "127.0.0.1",
    });

    expect(runAiOrchestrationMock).toHaveBeenCalledTimes(1);
    const orchestratorArgs = runAiOrchestrationMock.mock.calls[0]?.[0];
    expect(orchestratorArgs?.knowledgeContext).toContain(
      "Офіційні матеріали бібліотеки (retrieval)"
    );
    expect(orchestratorArgs?.knowledgeContext).toContain("lib-hdak.in.ua");
    expect(
      listChatAnalyticsEvents().some(event => event.name === "retrieval_hit")
    ).toBe(true);
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

  it("uses knowledge-assisted fallback before LLM for nearby library query", async () => {
    const { processChatRequest } = await import("./chatService");

    const result = await processChatRequest({
      messages: [
        {
          role: "user",
          content: "потрібна допомога з правилами бібліотеки, куди дивитися?",
        },
      ],
      userId: null,
      ip: "127.0.0.1",
    });

    expect(result.flagged).toBe(false);
    expect(runAiOrchestrationMock).not.toHaveBeenCalled();
  });

  it("returns safe fallback when LLM orchestration throws", async () => {
    runAiOrchestrationMock.mockRejectedValueOnce(new Error("OpenRouter down"));
    const { processChatRequest } = await import("./chatService");

    const result = await processChatRequest({
      messages: [{ role: "user", content: "Поясни незвичну тему" }],
      userId: null,
      ip: "127.0.0.1",
    });

    const response = result.stream.toUIMessageStreamResponse();
    expect(response).toBeInstanceOf(Response);
    expect(result.flagged).toBe(false);
  });

  it("uses merged editable knowledge topics for instant answer matching", async () => {
    getMergedKnowledgeTopicsMock.mockResolvedValueOnce([
      {
        id: "editable-hours",
        topic: "Режим роботи медіатеки",
        title: "Режим роботи медіатеки",
        keywords: ["режим медіатеки"],
        shortFacts: ["Медіатека працює у будні дні."],
        policySnippets: [],
        sourceUrls: ["https://lib-hdak.in.ua/site-map.html"],
        sourceBadge: "quick",
        suggestedFollowUps: ["Де контакти бібліотеки?"],
        enabled: true,
      },
    ]);
    const { processChatRequest } = await import("./chatService");

    const result = await processChatRequest({
      messages: [{ role: "user", content: "режим медіатеки" }],
      userId: null,
      ip: "127.0.0.1",
    });

    expect(result.flagged).toBe(false);
    expect(runAiOrchestrationMock).not.toHaveBeenCalled();
  });
});
