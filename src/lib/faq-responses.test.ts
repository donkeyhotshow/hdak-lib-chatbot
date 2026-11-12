import { describe, expect, it } from "vitest";
import { getFaqResponse } from "./faq-responses";
import { isLibraryOpen } from "./constants";

describe("curated FAQ matcher", () => {
  it("matches an exact Ukrainian question", () => {
    expect(getFaqResponse("Який графік роботи бібліотеки?")?.content).toContain(
      "графік роботи"
    );
  });

  it("matches an alternative phrasing", () => {
    expect(getFaqResponse("коли працює бібліотека")?.content).toContain(
      "графік роботи"
    );
  });

  it("matches meaningful keywords", () => {
    expect(
      getFaqResponse("потрібен номер телефону бібліотеки")?.content
    ).toContain("Телефон");
  });

  it("does not route unrelated registration questions to library registration", () => {
    expect(getFaqResponse("Як записатися на екскурсію?")).toBeNull();
    expect(getFaqResponse("Як записатися до репозитарію?")).toBeNull();
  });

  it("does not route specific people or book-topic searches to generic FAQs", () => {
    expect(getFaqResponse("Контакти директора")).toBeNull();
    expect(getFaqResponse("Як знайти книгу з режисури?")).toBeNull();
    expect(getFaqResponse("How do I find a book on directing?")).toBeNull();
  });

  it("matches specific Saturday and sanitary-day hours questions", () => {
    const hours = getFaqResponse("Який графік роботи бібліотеки?")?.content;
    expect(hours).toContain("Читальний зал");
    expect(hours).toContain("останній четвер місяця");
    expect(getFaqResponse("Чи працює бібліотека в суботу?")?.content).toContain(
      "графік роботи"
    );
    expect(
      getFaqResponse("Чи працює бібліотека в останню п'ятницю місяця?")?.content
    ).toContain("графік роботи");
  });

  it("reports open when another department remains open on the lending desk sanitary day", () => {
    expect(isLibraryOpen(new Date("2026-11-27T08:00:00.000Z"))).toBe(true);
  });

  it("does not invent an answer for low-confidence questions", () => {
    expect(getFaqResponse("розкажіть про погоду в Харкові")).toBeNull();
  });
});
