import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("Admin knowledge base UI guards", () => {
  const adminPagePath = path.join(process.cwd(), "lib/pages/Admin.tsx");
  const adminPageContent = readFileSync(adminPagePath, "utf8");

  it("includes Knowledge Base tab and knowledge admin queries", () => {
    expect(adminPageContent).toContain("Knowledge Base");
    expect(adminPageContent).toContain("trpc.knowledge.list.useQuery");
    expect(adminPageContent).toContain("trpc.knowledge.create.useMutation");
    expect(adminPageContent).toContain("trpc.knowledge.update.useMutation");
    expect(adminPageContent).toContain("trpc.knowledge.duplicate.useMutation");
  });

  it("provides uncovered-query action to create knowledge entry draft", () => {
    expect(adminPageContent).toContain("Create knowledge entry from query");
    expect(adminPageContent).toContain('setActiveTab("knowledge")');
  });
});
