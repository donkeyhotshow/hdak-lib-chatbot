import { describe, expect, it } from "vitest";

import { OFFICIAL_CATALOG_URL } from "./catalogIntent";
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
    expect(text).toContain(OFFICIAL_CATALOG_URL);
  });

  it("uses editable knowledge topics for fallback topic match", () => {
    const fallback = buildKnowledgeAssistedFallback(
      "режим роботи медіатеки",
      "uk",
      {
        knowledgeTopics: [
          {
            id: "editable-media",
            topic: "Медіатека",
            title: "Медіатека",
            keywords: ["режим роботи медіатеки", "медіатека"],
            shortFacts: ["Медіатека працює за розкладом."],
            policySnippets: [],
            sourceUrls: ["https://lib-hdak.in.ua/site-map.html"],
            sourceBadge: "quick",
            suggestedFollowUps: [],
            enabled: true,
          },
        ],
      }
    );
    expect(fallback).not.toBeNull();
    expect(fallback?.answer).toContain("Медіатека працює за розкладом.");
  });
});
