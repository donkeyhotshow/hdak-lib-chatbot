import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("Admin performance dashboard UI guards", () => {
  const adminPagePath = path.join(process.cwd(), "lib/pages/Admin.tsx");
  const adminPageContent = readFileSync(adminPagePath, "utf8");

  it("renders performance metrics tab with OpenRouter usage section", () => {
    expect(adminPageContent).toContain("Performance Metrics");
    expect(adminPageContent).toContain("OpenRouter Usage & Cost");
    expect(adminPageContent).toContain("estimatedCostUsd");
    expect(adminPageContent).toContain(
      "OPENROUTER_INPUT_COST_USD_PER_1M_TOKENS"
    );
  });
});
