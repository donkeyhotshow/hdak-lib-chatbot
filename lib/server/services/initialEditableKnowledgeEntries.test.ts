import { describe, expect, it } from "vitest";
import initialEditableKnowledgeEntries from "./initialEditableKnowledgeEntries.json";

describe("initial editable knowledge entries seed", () => {
  it("contains 20 entries for knowledge editor bootstrap", () => {
    expect(initialEditableKnowledgeEntries).toHaveLength(20);
  });

  it("uses unique ids, allowed badges, and official lib-hdak URLs", () => {
    const ids = new Set<string>();
    for (const entry of initialEditableKnowledgeEntries) {
      expect(ids.has(entry.id)).toBe(false);
      ids.add(entry.id);
      expect(["quick", "catalog", "official-rule"]).toContain(
        entry.sourceBadge
      );
      expect(entry.enabled).toBe(true);
      expect(entry.sourceUrls.length).toBeGreaterThan(0);
      for (const url of entry.sourceUrls) {
        const parsed = new URL(url);
        expect(parsed.protocol).toBe("https:");
        expect(parsed.hostname).toBe("lib-hdak.in.ua");
      }
    }
  });
});
