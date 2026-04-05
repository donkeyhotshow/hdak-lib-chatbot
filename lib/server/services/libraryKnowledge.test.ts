import { describe, expect, it } from "vitest";

import {
  buildLibraryKnowledgeContext,
  findLibraryKnowledgeTopicInTopics,
  findLibraryKnowledgeTopic,
  LIBRARY_KNOWLEDGE_TOPICS,
} from "./libraryKnowledge";

describe("libraryKnowledge", () => {
  it("contains required knowledge topics", () => {
    const ids = LIBRARY_KNOWLEDGE_TOPICS.map(topic => topic.id);
    expect(ids).toHaveLength(20);
    expect(ids).toEqual(
      expect.arrayContaining([
        "signup-library",
        "reader-card",
        "library-rules",
        "reading-room-rules",
        "catalog",
        "find-book",
        "contacts",
        "library-director",
        "scientific-resources",
        "library-structure",
        "library-collection",
        "library-history",
        "news-events",
        "documents",
        "vpn-access",
        "helpful-links",
        "site-map",
        "library-projects",
        "working-hours",
        "hdak-address",
      ])
    );
  });

  it("marks catalog-related topics with catalog source badge", () => {
    const catalogTopic = LIBRARY_KNOWLEDGE_TOPICS.find(
      topic => topic.id === "catalog"
    );
    const findBookTopic = LIBRARY_KNOWLEDGE_TOPICS.find(
      topic => topic.id === "find-book"
    );
    expect(catalogTopic?.sourceBadge).toBe("catalog");
    expect(findBookTopic?.sourceBadge).toBe("catalog");
  });

  it("keeps official library domain links only", () => {
    for (const topic of LIBRARY_KNOWLEDGE_TOPICS) {
      for (const url of topic.sourceUrls) {
        expect(url.startsWith("https://lib-hdak.in.ua/")).toBe(true);
        expect(url.includes("library-service.com.ua")).toBe(false);
      }
    }
  });

  it("builds structured knowledge context for fallback orchestration", () => {
    const context = buildLibraryKnowledgeContext(
      "Підкажіть правила користування бібліотекою",
      "uk"
    );
    expect(context).not.toBeNull();
    expect(context).toContain("Довідковий контекст бібліотеки");
    expect(context).toContain("Sources:");
    expect(context).toContain("https://lib-hdak.in.ua/rules-library.html");
  });

  it("finds topic by keyword query", () => {
    const topic = findLibraryKnowledgeTopic("хто директор бібліотеки хдак");
    expect(topic?.id).toBe("library-director");
  });

  it("keeps instant-answer facts concrete and non-generic", () => {
    const bannedGenericPhrases = [
      "опубліковані на сторінці",
      "розміщені на офіційному сайті",
      "доступна інформація",
      "перейдіть на сторінку",
    ];
    for (const topic of LIBRARY_KNOWLEDGE_TOPICS) {
      expect(topic.shortFacts.length).toBeGreaterThanOrEqual(2);
      for (const fact of topic.shortFacts) {
        const normalizedFact = fact.toLowerCase();
        for (const phrase of bannedGenericPhrases) {
          expect(normalizedFact).not.toContain(phrase);
        }
      }
    }
  });

  it("keeps follow-up prompts available for each curated topic", () => {
    for (const topic of LIBRARY_KNOWLEDGE_TOPICS) {
      expect(topic.suggestedFollowUps?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it("ignores disabled topics when searching in runtime topics", () => {
    const topic = findLibraryKnowledgeTopicInTopics("режим медіатеки", [
      {
        id: "editable-media",
        topic: "Медіатека",
        title: "Медіатека",
        keywords: ["режим медіатеки"],
        shortFacts: ["Медіатека працює за графіком."],
        policySnippets: [],
        sourceUrls: ["https://lib-hdak.in.ua/site-map.html"],
        sourceBadge: "quick",
        enabled: false,
      },
    ]);
    expect(topic).toBeNull();
  });
});
