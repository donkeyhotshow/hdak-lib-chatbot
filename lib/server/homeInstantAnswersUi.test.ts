import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("Home instant answers UX guards", () => {
  const homePagePath = path.join(process.cwd(), "lib/pages/Home.tsx");
  const homePageContent = readFileSync(homePagePath, "utf8");

  it("renders quick prompt chips from shared instant answers list", () => {
    expect(homePageContent).toContain("QUICK_PROMPTS[language]");
    expect(homePageContent).toContain("chips.slice(0, 4).map");
  });

  it("handles guest instant answers locally before regular API send", () => {
    expect(homePageContent).toContain("const instantAnswer = getInstantAnswer");
    expect(homePageContent).toContain("if (!isAuthenticated && instantAnswer)");
    expect(homePageContent).toContain("setStreamedMessages(prev => [");
  });
});
