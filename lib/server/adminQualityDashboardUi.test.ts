import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("Admin quality dashboard UI guards", () => {
  const adminPagePath = path.join(process.cwd(), "lib/pages/Admin.tsx");
  const adminPageContent = readFileSync(adminPagePath, "utf8");

  it("loads server-side quality summary for analytics tab", () => {
    expect(adminPageContent).toContain(
      "trpc.analytics.getQualitySummary.useQuery"
    );
    expect(adminPageContent).toContain('enabled: activeTab === "analytics"');
  });

  it("renders quality dashboard sections for feedback, fallback, cache and coverage", () => {
    expect(adminPageContent).toContain("Quality Dashboard");
    expect(adminPageContent).toContain("Feedback summary");
    expect(adminPageContent).toContain("Cache stats");
    expect(adminPageContent).toContain("Coverage insight (LLM-heavy)");
    expect(adminPageContent).toContain("Retrieval hits");
    expect(adminPageContent).toContain("Top retrieved official sources");
    expect(adminPageContent).toContain("Uncovered after retrieval");
    expect(adminPageContent).toContain("Latest low-quality responses");
  });
});
