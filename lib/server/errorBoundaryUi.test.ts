import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("Error boundary UI wiring", () => {
  const layoutPath = path.join(process.cwd(), "app/layout.tsx");
  const boundaryPath = path.join(process.cwd(), "components/ErrorBoundary.tsx");
  const layoutContent = readFileSync(layoutPath, "utf8");
  const boundaryContent = readFileSync(boundaryPath, "utf8");

  it("wraps app content with ErrorBoundary", () => {
    expect(layoutContent).toContain("<ErrorBoundary>");
    expect(layoutContent).toContain("</ErrorBoundary>");
  });

  it("implements client-side error handling in ErrorBoundary", () => {
    expect(boundaryContent).toContain('"use client"');
    expect(boundaryContent).toContain("componentDidCatch");
  });
});
