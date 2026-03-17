import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("Home feedback and follow-up UX guards", () => {
  const homePagePath = path.join(process.cwd(), "lib/pages/Home.tsx");
  const homePageContent = readFileSync(homePagePath, "utf8");

  it("renders compact feedback controls under assistant messages", () => {
    expect(homePageContent).toContain("t.feedbackUp");
    expect(homePageContent).toContain("t.feedbackDown");
    expect(homePageContent).toContain("saveFeedback(");
    expect(homePageContent).toContain("feedbackByResponseId");
  });

  it("stores feedback payload with source badge and user query context", () => {
    expect(homePageContent).toContain("sourceBadgeType");
    expect(homePageContent).toContain("guestIdRef.current");
    expect(homePageContent).toContain("FEEDBACK_STORAGE_KEY");
  });

  it("shows follow-up chips for instant answers", () => {
    expect(homePageContent).toContain("followUpPrompts");
    expect(homePageContent).toContain("t.followUpLabel");
    expect(homePageContent).toContain("handleQuickStart(prompt)");
  });
});
