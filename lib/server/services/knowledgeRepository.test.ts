import { afterEach, describe, expect, it, vi } from "vitest";

const getLibraryInfoMock = vi.fn();
const setLibraryInfoMock = vi.fn();

vi.mock("../db", () => ({
  getLibraryInfo: getLibraryInfoMock,
  setLibraryInfo: setLibraryInfoMock,
}));

describe("knowledgeRepository", () => {
  afterEach(() => {
    getLibraryInfoMock.mockReset();
    setLibraryInfoMock.mockReset();
  });

  it("creates and persists a valid editable knowledge entry", async () => {
    getLibraryInfoMock.mockResolvedValueOnce(null);
    setLibraryInfoMock.mockResolvedValueOnce({ key: "ok" });
    const { createEditableKnowledgeEntry } =
      await import("./knowledgeRepository");

    const created = await createEditableKnowledgeEntry({
      topic: "Користування бібліотекою",
      title: "Користування бібліотекою",
      keywords: ["правила бібліотеки"],
      shortFacts: ["Є офіційні правила користування"],
      policySnippets: [
        "Перед використанням перевіряйте офіційну сторінку правил.",
      ],
      sourceUrls: ["https://lib-hdak.in.ua/rules-library.html"],
      sourceBadge: "official-rule",
      suggestedFollowUps: ["Які правила е-читальної зали?"],
      enabled: true,
      overrideBuiltInId: "library-rules",
    });

    expect(created.id).toBeTruthy();
    expect(created.topic).toBe("Користування бібліотекою");
    expect(setLibraryInfoMock).toHaveBeenCalledTimes(1);
  });

  it("rejects non-official source URLs", async () => {
    getLibraryInfoMock.mockResolvedValueOnce(null);
    const { createEditableKnowledgeEntry } =
      await import("./knowledgeRepository");

    await expect(
      createEditableKnowledgeEntry({
        topic: "Зовнішні посилання",
        title: "Зовнішні посилання",
        keywords: ["посилання"],
        shortFacts: ["test"],
        policySnippets: [],
        sourceUrls: ["https://example.com/not-official"],
        sourceBadge: "quick",
        suggestedFollowUps: [],
        enabled: true,
      })
    ).rejects.toThrow(/official lib-hdak\.in\.ua/);
  });

  it("disables an entry via setEditableKnowledgeEntryEnabled", async () => {
    getLibraryInfoMock.mockResolvedValue({
      valueUk: JSON.stringify([
        {
          id: "entry-1",
          topic: "Контакти",
          title: "Контакти",
          keywords: ["контакти бібліотеки"],
          shortFacts: ["Контакти на офіційному сайті"],
          policySnippets: [],
          sourceUrls: ["https://lib-hdak.in.ua/"],
          sourceBadge: "quick",
          suggestedFollowUps: [],
          enabled: true,
          updatedAt: "2026-01-01T00:00:00.000Z",
          overrideBuiltInId: null,
        },
      ]),
    });
    setLibraryInfoMock.mockResolvedValue({ key: "ok" });
    const { setEditableKnowledgeEntryEnabled } =
      await import("./knowledgeRepository");

    const updated = await setEditableKnowledgeEntryEnabled("entry-1", false);
    expect(updated.enabled).toBe(false);
    expect(setLibraryInfoMock).toHaveBeenCalledTimes(1);
  });
});
