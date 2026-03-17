import { describe, expect, it } from "vitest";

import { LIBRARY_KNOWLEDGE_TOPICS } from "./libraryKnowledge";
import {
  createKnowledgeEntryDraftFromQuery,
  mergeBuiltInAndEditableKnowledge,
} from "./knowledgeAdmin";

describe("knowledgeAdmin", () => {
  it("merges built-in and editable knowledge with explicit override support", () => {
    const merged = mergeBuiltInAndEditableKnowledge(LIBRARY_KNOWLEDGE_TOPICS, [
      {
        id: "custom-1",
        topic: "Оновлені правила",
        title: "Оновлені правила",
        keywords: ["правила користування бібліотекою"],
        shortFacts: ["Оновлені правила доступні на офіційному сайті."],
        policySnippets: [],
        sourceUrls: ["https://lib-hdak.in.ua/rules-library.html"],
        sourceBadge: "official-rule",
        suggestedFollowUps: ["Які правила е-читальної зали?"],
        enabled: true,
        updatedAt: "2026-01-01T00:00:00.000Z",
        overrideBuiltInId: "library-rules",
      },
      {
        id: "custom-disabled",
        topic: "Disabled",
        title: "Disabled",
        keywords: ["disabled topic"],
        shortFacts: ["ignore"],
        policySnippets: [],
        sourceUrls: ["https://lib-hdak.in.ua/site-map.html"],
        sourceBadge: "quick",
        suggestedFollowUps: [],
        enabled: false,
        updatedAt: "2026-01-01T00:00:00.000Z",
        overrideBuiltInId: null,
      },
    ]);

    const overridden = merged.find(topic => topic.id === "library-rules");
    expect(overridden?.topic).toBe("Оновлені правила");
    expect(merged.some(topic => topic.id === "editable-custom-disabled")).toBe(
      false
    );
  });

  it("creates draft from uncovered query for dashboard action", () => {
    const draft = createKnowledgeEntryDraftFromQuery("де контакти бібліотеки");
    expect(draft).not.toBeNull();
    expect(draft?.topic).toContain("контакти");
    expect(draft?.sourceUrls[0]).toContain("lib-hdak.in.ua");
  });
});
