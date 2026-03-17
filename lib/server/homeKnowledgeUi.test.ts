import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("Home editable knowledge UI guards", () => {
  const homePagePath = path.join(process.cwd(), "lib/pages/Home.tsx");
  const homePageContent = readFileSync(homePagePath, "utf8");

  it("loads runtime merged knowledge topics for local instant answer matching", () => {
    expect(homePageContent).toContain("trpc.knowledge.getRuntime.useQuery");
    expect(homePageContent).toContain("runtimeKnowledgeTopics");
    expect(homePageContent).toContain(
      "knowledgeTopics: runtimeKnowledgeTopics"
    );
  });

  it("supports entry-level suggested follow-up prompts", () => {
    expect(homePageContent).toContain("instantAnswerMeta.suggestedFollowUps");
  });
});
