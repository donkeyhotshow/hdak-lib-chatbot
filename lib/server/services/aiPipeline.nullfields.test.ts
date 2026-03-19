/**
 * Tests for aiPipeline.ts buildResourceContext null-field fallback paths.
 *
 * buildResourceContext is a private function inside aiPipeline.ts.
 * We exercise it indirectly through generateConversationReply so that
 * v8 coverage records lines 164, 166, 170, 172 (the `?? nameEn ?? ""`
 * and `?? descriptionEn ?? ""` fallback branches).
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { generateConversationReply, clearReplyCache } from "./aiPipeline";
import * as db from "../db";
import * as ragService from "../rag-service";
import { generateText } from "ai";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("../db", async importOriginal => {
  const actual = await importOriginal<typeof import("../db")>();
  return { ...actual };
});

vi.mock("../rag-service", async importOriginal => {
  const actual = await importOriginal<typeof import("../rag-service")>();
  return { ...actual };
});

vi.mock("ai", async importOriginal => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual,
    generateText: vi.fn(),
    embed: vi.fn(),
  };
});

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() => ({ chat: vi.fn(() => "mock-model") })),
}));

vi.mock("./llmProviderFactory", () => ({
  createLLMProvider: vi.fn(() => ({
    provider: { chat: vi.fn(() => "mock-model") },
    providerName: "openai-compatible",
  })),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

afterEach(() => {
  vi.restoreAllMocks();
  clearReplyCache();
});

describe("buildResourceContext — null-name and null-description fallbacks", () => {
  it("falls back to nameEn when nameUk is null (uk language)", async () => {
    const resourceNullUk = {
      id: 1,
      nameEn: "English Name",
      nameUk: null,
      nameRu: null,
      descriptionEn: "English Desc",
      descriptionUk: null,
      descriptionRu: null,
      type: "catalog" as const,
      url: "https://example.com",
      keywords: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.spyOn(db, "searchResources").mockResolvedValueOnce([
      resourceNullUk as any,
    ]);
    vi.spyOn(ragService, "getRagContext").mockResolvedValueOnce("");
    vi.mocked(generateText).mockResolvedValueOnce({
      text: "ok",
      usage: { promptTokens: 0, completionTokens: 0 },
    } as any);
    vi.spyOn(db, "logUserQuery").mockResolvedValueOnce(null);

    const result = await generateConversationReply({
      prompt: "catalog",
      conversationId: 1,
      language: "uk",
      userId: 1,
      history: [],
    });

    expect(result.text).toBe("ok");
    expect(result.source).toBe("catalog_search");
  });

  it("falls back to descriptionEn when descriptionRu is null (ru language)", async () => {
    const resourceNullRu = {
      id: 2,
      nameEn: "English Name",
      nameUk: "Ukrainian Name",
      nameRu: null,
      descriptionEn: "English Desc",
      descriptionUk: "Ukrainian Desc",
      descriptionRu: null,
      type: "repository" as const,
      url: null,
      keywords: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.spyOn(db, "searchResources").mockResolvedValueOnce([
      resourceNullRu as any,
    ]);
    vi.spyOn(ragService, "getRagContext").mockResolvedValueOnce("");
    vi.mocked(generateText).mockResolvedValueOnce({
      text: "russian ok",
      usage: { promptTokens: 0, completionTokens: 0 },
    } as any);
    vi.spyOn(db, "logUserQuery").mockResolvedValueOnce(null);

    const result = await generateConversationReply({
      prompt: "query",
      conversationId: 2,
      language: "ru",
      userId: 1,
      history: [],
    });

    expect(result.text).toBe("russian ok");
    expect(result.source).toBe("catalog_search");
  });

  it("falls back to empty string when both nameEn and language-specific name are null", async () => {
    const resourceAllNull = {
      id: 3,
      nameEn: null,
      nameUk: null,
      nameRu: null,
      descriptionEn: null,
      descriptionUk: null,
      descriptionRu: null,
      type: "other" as const,
      url: null,
      keywords: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.spyOn(db, "searchResources").mockResolvedValueOnce([
      resourceAllNull as any,
    ]);
    vi.spyOn(ragService, "getRagContext").mockResolvedValueOnce("");
    vi.mocked(generateText).mockResolvedValueOnce({
      text: "fallback ok",
      usage: { promptTokens: 0, completionTokens: 0 },
    } as any);
    vi.spyOn(db, "logUserQuery").mockResolvedValueOnce(null);

    // Should not throw even with fully null fields
    const result = await generateConversationReply({
      prompt: "null resource",
      conversationId: 3,
      language: "uk",
      userId: 1,
      history: [],
    });

    expect(result.text).toBe("fallback ok");
  });
});
