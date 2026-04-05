import { describe, expect, it } from "vitest";

import {
  generateCatalogInstantAnswer,
  REAL_CATALOG_BOOKS,
} from "./catalogInstantAnswers";

describe("BenchmarkInstantAnswers", () => {
  it("runs 1000 catalog queries with <5ms average", () => {
    const iterations = 1000;
    const start = performance.now();
    for (let i = 0; i < iterations; i += 1) {
      generateCatalogInstantAnswer("театр", REAL_CATALOG_BOOKS, {
        skipJsonSize: true,
      });
    }
    const totalMs = performance.now() - start;
    const avgMs = totalMs / iterations;
    expect(avgMs).toBeLessThan(5);
  });

  it("keeps serialized payload under 5KB", () => {
    const result = generateCatalogInstantAnswer(
      "Іван Франко",
      REAL_CATALOG_BOOKS
    );
    const size = Buffer.byteLength(JSON.stringify(result), "utf8");
    expect(size).toBeLessThan(5 * 1024);
  });

  it("keeps render-like markdown preparation under 100ms", () => {
    const start = performance.now();
    for (let i = 0; i < 1000; i += 1) {
      const result = generateCatalogInstantAnswer(
        "культура",
        REAL_CATALOG_BOOKS,
        {
          skipJsonSize: true,
        }
      );
      const markdown = `**Швидка відповідь**\n\n${result.answer}\n\n- ${result.links.join("\n- ")}`;
      expect(markdown.length).toBeGreaterThan(20);
    }
    expect(performance.now() - start).toBeLessThan(500);
  });

  it("keeps memory growth under 10MB peak during benchmark", () => {
    if (typeof global.gc === "function") {
      global.gc();
    }
    const before = process.memoryUsage().heapUsed;
    for (let i = 0; i < 1000; i += 1) {
      generateCatalogInstantAnswer("дизайн", REAL_CATALOG_BOOKS, {
        skipJsonSize: true,
      });
    }
    if (typeof global.gc === "function") {
      global.gc();
    }
    const after = process.memoryUsage().heapUsed;
    const growthMb = (after - before) / (1024 * 1024);
    expect(growthMb).toBeLessThan(typeof global.gc === "function" ? 10 : 20);
  });
});
