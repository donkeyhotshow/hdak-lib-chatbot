import { describe, expect, it } from "vitest";
import { getFaqResponse } from "./faq-responses";

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

  it("does not invent an answer for low-confidence questions", () => {
    expect(getFaqResponse("розкажіть про погоду в Харкові")).toBeNull();
  });
});
