import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("Home catalog action button guards", () => {
  const homePagePath = path.join(process.cwd(), "lib/pages/Home.tsx");
  const homePageContent = readFileSync(homePagePath, "utf8");

  it("derives catalog action from previous user message", () => {
    expect(homePageContent).toContain("getCatalogIntentAction");
    expect(homePageContent).toContain("previousUserMessage");
    expect(homePageContent).toContain(
      "catalogAction?.url ?? OFFICIAL_CATALOG_URL"
    );
  });

  it("uses emphasized catalog CTA style when catalog intent is detected", () => {
    expect(homePageContent).toContain("hdak-action-btn--catalog");
    expect(homePageContent).toContain("catalogAction?.buttonLabel");
    expect(homePageContent).toContain("t.actionFindCatalog");
    expect(homePageContent).toContain("<CatalogActionButton");
    expect(homePageContent).toContain("t.actionOrderBook");
  });
});
