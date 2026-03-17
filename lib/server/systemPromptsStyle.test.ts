import { describe, expect, it } from "vitest";

import { getSystemPrompt } from "./system-prompts-official";

describe("official system prompt style guidance", () => {
  it("enforces direct answer-first style without self-description in Ukrainian", () => {
    const prompt = getSystemPrompt("uk", {
      libraryInfo: {},
      libraryResources: [],
    });
    expect(prompt).toContain("спочатку дай пряму відповідь по суті запиту");
    expect(prompt).toContain("не починай відповідь з самопрезентації");
  });

  it("enforces direct answer-first style without self-description in English", () => {
    const prompt = getSystemPrompt("en", {
      libraryInfo: {},
      libraryResources: [],
    });
    expect(prompt).toContain("start with a direct answer to the user question");
    expect(prompt).toContain(
      'do not start answers with self-description such as "As an AI assistant..."'
    );
  });
});
