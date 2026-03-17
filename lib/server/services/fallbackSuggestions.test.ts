import { describe, expect, it } from "vitest";

import {
  buildKnowledgeAssistedFallback,
  buildSafeLlmUnavailableFallback,
} from "./fallbackSuggestions";

describe("fallbackSuggestions", () => {
  it("builds knowledge-assisted fallback for library-like prompts", () => {
    const fallback = buildKnowledgeAssistedFallback(
      "підкажіть правила бібліотеки",
      "uk"
    );
    expect(fallback).not.toBeNull();
    expect(fallback?.sourceBadge).toBe("generated");
    expect(fallback?.answer).toContain("Офіційні посилання");
  });

  it("builds safe fallback text when LLM is unavailable", () => {
    const text = buildSafeLlmUnavailableFallback("uk");
    expect(text).toContain("Тимчасова проблема сервісу");
    expect(text).toContain("https://lib-hdak.in.ua/e-catalog.html");
  });
});
