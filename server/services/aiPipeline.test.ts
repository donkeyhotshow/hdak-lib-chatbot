import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AiPipelineError,
  generateConversationReply,
  getLocalizedAiErrorMessage,
  normalizeLanguage,
} from "./aiPipeline";
import { searchResources, logUserQuery } from "../db";
import { getRagContext } from "../rag-service";
import { generateText } from "ai";

vi.mock("../db", () => ({
  searchResources: vi.fn(),
  logUserQuery: vi.fn(),
}));

vi.mock("../rag-service", () => ({
  getRagContext: vi.fn(),
}));

vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn(() => "mock-model"),
}));

const mockedSearchResources = searchResources as unknown as vi.Mock;
const mockedLogUserQuery = logUserQuery as unknown as vi.Mock;
const mockedGetRagContext = getRagContext as unknown as vi.Mock;
const mockedGenerateText = generateText as unknown as vi.Mock;

const mockResource = {
  id: 1,
  nameEn: "Resource",
  nameUk: "Ресурс",
  nameRu: "Ресурс",
  descriptionEn: "desc",
  descriptionUk: "desc",
  descriptionRu: "desc",
  type: "database",
  url: "https://example.com",
  keywords: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("aiPipeline helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedSearchResources.mockResolvedValue([mockResource]);
    mockedLogUserQuery.mockResolvedValue(null);
    mockedGetRagContext.mockResolvedValue("\nRAG");
    mockedGenerateText.mockResolvedValue({ text: "mock reply" });
  });

  it("returns localized error messages for supported languages", () => {
    expect(getLocalizedAiErrorMessage("uk")).toContain("Вибачте");
    expect(getLocalizedAiErrorMessage("ru")).toContain("Извините");
    expect(getLocalizedAiErrorMessage("en")).toContain("Sorry");
  });

  it("normalizes unsupported languages to English", () => {
    expect(normalizeLanguage("de")).toBe("en");
    expect(normalizeLanguage(null)).toBe("en");
    expect(normalizeLanguage("uk")).toBe("uk");
  });

  it("generates AI replies using the pipeline and logs queries", async () => {
    const text = await generateConversationReply({
      prompt: "hello",
      conversationId: 1,
      language: "en",
      userId: 2,
      history: [{ role: "user", content: "hi" }],
    });

    expect(text).toBe("mock reply");
    expect(mockedSearchResources).toHaveBeenCalledWith("hello");
    expect(mockedGetRagContext).toHaveBeenCalledWith("hello", "en");
    expect(mockedLogUserQuery).toHaveBeenCalledWith(2, 1, "hello", "en", [1]);
    expect(mockedGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "mock-model",
      })
    );
  });

  it("wraps failures in AiPipelineError", async () => {
    mockedGenerateText.mockRejectedValueOnce(new Error("boom"));

    await expect(
      generateConversationReply({
        prompt: "hello",
        conversationId: 1,
        language: "en",
        userId: 2,
        history: [{ role: "user", content: "hi" }],
      })
    ).rejects.toBeInstanceOf(AiPipelineError);
  });
});
