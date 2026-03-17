import { describe, expect, it } from "vitest";

import {
  getInstantAnswer,
  normalizeInstantAnswerQuery,
  QUICK_PROMPTS,
} from "./instantAnswers";

describe("instantAnswers", () => {
  it("normalizes user query for simple intent matching", () => {
    expect(normalizeInstantAnswerQuery("  Де   ЕЛЕКТРОННИЙ-каталог?!  ")).toBe(
      "де електронний каталог"
    );
  });

  it("returns instant answers for common library questions", () => {
    const prompts = [
      "Як записатися до бібліотеки?",
      "Як отримати читацький квиток?",
      "Де електронний каталог?",
      "Як знайти книгу?",
      "Які правила користування бібліотекою?",
      "Де контакти бібліотеки?",
      "Як поставити запитання бібліотекарю?",
      "Де корисні посилання?",
      "Де сайт бібліотеки?",
      "Де карта сайту?",
    ];

    for (const prompt of prompts) {
      expect(getInstantAnswer(prompt, "uk")).not.toBeNull();
    }
  });

  it("uses only official library links in quick prompts", () => {
    expect(QUICK_PROMPTS.uk.length).toBeGreaterThanOrEqual(4);
    expect(QUICK_PROMPTS.uk.length).toBeLessThanOrEqual(6);
  });

  it("returns null when question is not from known FAQ intents", () => {
    expect(getInstantAnswer("Поясни квантову криптографію", "uk")).toBeNull();
  });
});
