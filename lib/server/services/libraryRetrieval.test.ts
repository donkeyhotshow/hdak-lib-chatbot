import { describe, expect, it } from "vitest";

import {
  buildOfficialRetrievalContext,
  retrieveOfficialLibraryChunks,
} from "./libraryRetrieval";

describe("libraryRetrieval", () => {
  it("returns relevant official chunks for rules and catalog queries", () => {
    const rulesChunks = retrieveOfficialLibraryChunks(
      "Які правила користування бібліотекою?"
    );
    const catalogChunks = retrieveOfficialLibraryChunks(
      "Де шукати книгу в електронному каталозі?"
    );

    expect(rulesChunks.length).toBeGreaterThan(0);
    expect(catalogChunks.length).toBeGreaterThan(0);
    expect(rulesChunks[0].sourceUrl).toContain("lib-hdak.in.ua");
    expect(catalogChunks[0].sourceUrl).toContain("lib-hdak.in.ua");
  });

  it("uses official sources only", () => {
    const chunks = retrieveOfficialLibraryChunks("де контакти бібліотеки");
    expect(chunks.length).toBeGreaterThan(0);
    expect(
      chunks.every(chunk => chunk.sourceUrl.includes("lib-hdak.in.ua"))
    ).toBe(true);
  });

  it("builds retrieval context with source links", () => {
    const chunks = retrieveOfficialLibraryChunks("де знайти наукові ресурси");
    const context = buildOfficialRetrievalContext(chunks);
    expect(context).toContain("Офіційні матеріали бібліотеки (retrieval)");
    expect(context).toContain("https://lib-hdak.in.ua/");
  });
});
