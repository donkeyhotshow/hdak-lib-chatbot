import { describe, expect, it } from "vitest";

import {
  generateCatalogInstantAnswer,
  generateInstantAnswerWithStatus,
  type CatalogBook,
} from "./catalogInstantAnswers";

const testBooks: CatalogBook[] = [
  {
    title: "Історія української культури",
    author: "Іван Франко",
    status: "доступна",
  },
  {
    title: "Театральна естетика",
    author: "Леся Українка",
    status: "замовлена",
  },
  {
    title: "Дизайн інтер'єру",
    author: "Олександр Коваль",
    status: "на полиці",
  },
];

describe("catalogInstantAnswers", () => {
  it("finds a single book by author and keeps catalog action", () => {
    const result = generateCatalogInstantAnswer("Іван Франко", testBooks);
    expect(result.found).toBe(true);
    expect(result.books).toHaveLength(1);
    expect(result.books[0]?.status).toBe("доступна");
    expect(result.action.type).toBe("catalog");
    expect(result.answer).toContain("Історія української культури");
  });

  it("finds a single book by title fragment and returns ordered status", () => {
    const result = generateCatalogInstantAnswer("театральна", testBooks);
    expect(result.found).toBe(true);
    expect(result.books).toHaveLength(1);
    expect(result.books[0]?.status).toBe("замовлена");
    expect(result.answer).toContain("🟡");
  });

  it("finds by generic subject token", () => {
    const result = generateCatalogInstantAnswer("культура", testBooks);
    expect(result.found).toBe(true);
    expect(result.books).toHaveLength(1);
  });

  it("returns fallback when no records are found", () => {
    const result = generateInstantAnswerWithStatus("не існує", testBooks);
    expect(result.found).toBe(false);
    expect(result.answer).toContain("Не знайдено");
    expect(result.smartChips).toEqual(
      expect.arrayContaining(["🔍 Шукати в каталозі", "📞 Звʼязатися"])
    );
  });

  it("supports partial author match", () => {
    const result = generateCatalogInstantAnswer("Леся", testBooks);
    expect(result.found).toBe(true);
    expect(result.books).toHaveLength(1);
    expect(result.books[0]?.author).toContain("Леся");
  });

  it("handles 100 queries under 50ms", () => {
    const start = performance.now();
    for (let i = 0; i < 100; i += 1) {
      generateCatalogInstantAnswer("театр", testBooks, { skipJsonSize: true });
    }
    expect(performance.now() - start).toBeLessThan(50);
  });

  it("keeps serialized response below 5KB", () => {
    const result = generateCatalogInstantAnswer("Іван Франко", testBooks);
    expect(result.jsonSizeBytes).toBeLessThan(5 * 1024);
  });
});
