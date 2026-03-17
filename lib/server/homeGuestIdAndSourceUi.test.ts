import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("Home guestId and source provenance guards", () => {
  const homePagePath = path.join(process.cwd(), "lib/pages/Home.tsx");
  const homePageContent = readFileSync(homePagePath, "utf8");

  it("persists guest id and uses guest-scoped history storage key", () => {
    expect(homePageContent).toContain(
      'const GUEST_ID_STORAGE_KEY = "hdak-guest-id"'
    );
    expect(homePageContent).toContain("GUEST_HISTORY_STORAGE_PREFIX");
    expect(homePageContent).toContain("getGuestHistoryKey");
  });

  it("renders compact source badge and source links for assistant messages", () => {
    expect(homePageContent).toContain("sourceBadge");
    expect(homePageContent).toContain("sourceLinks");
    expect(homePageContent).toContain("t.sourcesLabel");
    expect(homePageContent).toContain("t.viewSource");
  });
});
