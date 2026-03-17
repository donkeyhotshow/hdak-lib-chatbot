import { describe, expect, it } from "vitest";

import {
  getInstantAnswer,
  LIBRARY_FAQ,
  normalizeInstantAnswerQuery,
  QUICK_PROMPTS,
  SUGGESTED_PROMPTS,
} from "./instantAnswers";
import { OFFICIAL_CATALOG_URL } from "./catalogIntent";

describe("instantAnswers", () => {
  it("normalizes user query for simple intent matching", () => {
    expect(normalizeInstantAnswerQuery("  Де   ЕЛЕКТРОННИЙ-каталог?!  ")).toBe(
      "де електронний каталог"
    );
  });

  it("covers all required FAQ topics with official links", () => {
    expect(LIBRARY_FAQ.length).toBeGreaterThanOrEqual(11);
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
    expect(answer?.sourceBadge).toBe("official-rule");
    expect(answer?.answer).toContain(
      "https://lib-hdak.in.ua/rules-library.html"
    );
  });

  it("returns instant answer for electronic catalog question", () => {
    const answer = getInstantAnswer("Де електронний каталог?", "uk");
    expect(answer).not.toBeNull();
    expect(answer?.intent).toBe("catalog");
    expect(answer?.answer).toContain(OFFICIAL_CATALOG_URL);
    expect(answer?.action?.type).toBe("catalog");
    expect(answer?.action?.searchType).toBe("generic");
    expect(answer?.action?.url).toBe(OFFICIAL_CATALOG_URL);
  });

  it("returns catalog instant answer for author search query", () => {
    const answer = getInstantAnswer("знайти автора Шевченко", "uk");
    expect(answer).not.toBeNull();
    expect(answer?.intent).toBe("catalog-intent");
    expect(answer?.action?.searchType).toBe("author");
    expect(answer?.action?.searchQuery).toBe("шевченко");
    expect(answer?.action?.url).toContain(OFFICIAL_CATALOG_URL);
  });

  it("returns catalog instant answer for subject query", () => {
    const answer = getInstantAnswer("книги з теми режисури", "uk");
    expect(answer).not.toBeNull();
    expect(answer?.intent).toBe("catalog-intent");
    expect(answer?.action?.searchType).toBe("subject");
    expect(answer?.action?.searchQuery).toBe("режисури");
    expect(answer?.links).toEqual([OFFICIAL_CATALOG_URL]);
    expect(answer?.sourceBadge).toBe("quick");
  });

  it("returns quick instant answer for how to find a book", () => {
    const answer = getInstantAnswer("як знайти книгу", "uk");
    expect(answer).not.toBeNull();
    expect(answer?.intent).toBe("find-book");
    expect(answer?.sourceBadge).toBe("quick");
  });

  it("uses official catalog URL for catalog instant answers", () => {
    const answer = getInstantAnswer("пошук у каталозі", "uk");
    expect(answer).not.toBeNull();
    expect(answer?.answer).toContain(OFFICIAL_CATALOG_URL);
    expect(answer?.action?.url).toContain(OFFICIAL_CATALOG_URL);
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
