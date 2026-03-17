import { describe, expect, it } from "vitest";

import {
  getCatalogIntentAction,
  normalizeCatalogIntentQuery,
  OFFICIAL_CATALOG_URL,
} from "./catalogIntent";

describe("catalogIntent", () => {
  it("normalizes catalog queries", () => {
    expect(normalizeCatalogIntentQuery("  Де   Електронний-каталог?! ")).toBe(
      "де електронний каталог"
    );
  });

  it("detects generic catalog intent with fallback URL", () => {
    const action = getCatalogIntentAction("де електронний каталог", "uk");
    expect(action).not.toBeNull();
    expect(action?.searchType).toBe("generic");
    expect(action?.url).toBe(OFFICIAL_CATALOG_URL);
  });

  it("detects author search intent", () => {
    const action = getCatalogIntentAction("знайти автора Шевченко", "uk");
    expect(action).not.toBeNull();
    expect(action?.searchType).toBe("author");
    expect(action?.searchQuery).toBe("шевченко");
    expect(action?.url).toContain(OFFICIAL_CATALOG_URL);
  });

  it("detects subject search intent", () => {
    const action = getCatalogIntentAction("книги з теми режисури", "uk");
    expect(action).not.toBeNull();
    expect(action?.searchType).toBe("subject");
    expect(action?.searchQuery).toBe("режисури");
  });

  it("never returns old library-service URL", () => {
    const action = getCatalogIntentAction("відкрий каталог", "uk");
    expect(action).not.toBeNull();
    expect(action?.url.includes("library-service.com.ua")).toBe(false);
  });
});
