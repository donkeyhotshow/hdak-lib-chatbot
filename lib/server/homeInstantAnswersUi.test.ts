import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("Home instant answers UX guards", () => {
  const homePagePath = path.join(process.cwd(), "lib/pages/Home.tsx");
  const homePageContent = readFileSync(homePagePath, "utf8");

  it("renders quick prompt chips from shared instant answers list", () => {
    expect(homePageContent).toContain("QUICK_PROMPTS[language]");
    expect(homePageContent).toContain("slice(0, 3).map");
    expect(homePageContent).toContain("chips.map(chip =>");
  });

  it("handles guest instant answers locally before regular API send", () => {
    expect(homePageContent).toContain("const instantAnswer = getInstantAnswer");
    expect(homePageContent).toContain("if (!isAuthenticated && instantAnswer)");
    expect(homePageContent).toContain("setStreamedMessages(prev => [");
  });

  it("renders catalog status badges, smart chips and copy action", () => {
    expect(homePageContent).toContain("catalogMatches.slice(0, 3).map");
    expect(homePageContent).toContain("smartResultChips.map(chip =>");
    expect(homePageContent).toContain("actionCopySource");
    expect(homePageContent).toContain("extractContactsFromText");
  });
});
