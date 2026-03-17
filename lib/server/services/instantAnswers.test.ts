import { describe, expect, it } from "vitest";

import {
  getInstantAnswer,
  LIBRARY_FAQ,
  normalizeInstantAnswerQuery,
  QUICK_PROMPTS,
  SUGGESTED_PROMPTS,
} from "./instantAnswers";

describe("instantAnswers", () => {
  it("normalizes user query for simple intent matching", () => {
    expect(normalizeInstantAnswerQuery("  Де   ЕЛЕКТРОННИЙ-каталог?!  ")).toBe(
      "де електронний каталог"
    );
  });

  it("covers all required FAQ topics with official links", () => {
    expect(LIBRARY_FAQ).toHaveLength(10);
    for (const faq of LIBRARY_FAQ) {
      expect(faq.links.length).toBeGreaterThan(0);
      for (const link of faq.links) {
        expect(link.startsWith("https://lib-hdak.in.ua/")).toBe(true);
      }
    }
  });

  it("returns instant answer for signup question with source links", () => {
    const answer = getInstantAnswer("Як записатися до бібліотеки?", "uk");
    expect(answer).not.toBeNull();
    expect(answer?.intent).toBe("signup-library");
    expect(answer?.answer).toContain(
      "https://lib-hdak.in.ua/project-unified-reader-card.html"
    );
  });

  it("returns instant answer for library rules question", () => {
    const answer = getInstantAnswer(
      "Які правила користування бібліотекою?",
      "uk"
    );
    expect(answer).not.toBeNull();
    expect(answer?.intent).toBe("library-rules");
    expect(answer?.answer).toContain(
      "https://lib-hdak.in.ua/rules-library.html"
    );
  });

  it("returns instant answer for electronic catalog question", () => {
    const answer = getInstantAnswer("Де електронний каталог?", "uk");
    expect(answer).not.toBeNull();
    expect(answer?.intent).toBe("catalog");
    expect(answer?.answer).toContain("https://lib-hdak.in.ua/e-catalog.html");
  });

  it("keeps suggested prompts and quick prompts in expected size range", () => {
    expect(SUGGESTED_PROMPTS.length).toBeGreaterThanOrEqual(4);
    expect(SUGGESTED_PROMPTS.length).toBeLessThanOrEqual(6);
    expect(QUICK_PROMPTS.uk.length).toBeGreaterThanOrEqual(4);
    expect(QUICK_PROMPTS.uk.length).toBeLessThanOrEqual(6);
  });

  it("returns null when question is not from known FAQ intents", () => {
    expect(getInstantAnswer("Поясни квантову криптографію", "uk")).toBeNull();
  });
});
