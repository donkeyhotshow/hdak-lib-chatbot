import { describe, expect, it } from "vitest";
import { getSuggestions, QUICK_MENU } from "./chat-suggestions";

describe("chat suggestions", () => {
  it("provides localized quick menus", () => {
    expect(QUICK_MENU.uk).toHaveLength(6);
    expect(QUICK_MENU.en).toHaveLength(6);
    expect(QUICK_MENU.uk[0].title).toBe("Графік роботи");
    expect(QUICK_MENU.en[0].title).toBe("Library hours");
  });

  it("selects follow-up suggestions based on the message language and topic", () => {
    expect(getSuggestions("Який графік роботи?", "uk")).toContain(
      "Як записатися до бібліотеки?"
    );
    expect(getSuggestions("Find a book in the catalog", "en")).toContain(
      "How to find a book in the catalog?"
    );
  });

  it("returns a useful fallback for unrelated messages", () => {
    expect(getSuggestions("hello", "uk")).toEqual([
      "Як знайти книгу в каталозі?",
      "Який графік роботи бібліотеки?",
      "Які контакти бібліотеки?",
    ]);
  });
});
