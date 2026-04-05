import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("Home typing animation and brown palette guards", () => {
  const homePagePath = path.join(process.cwd(), "lib/pages/Home.tsx");
  const homePageContent = readFileSync(homePagePath, "utf8");
  const globalCssPath = path.join(process.cwd(), "app/globals.css");
  const globalCssContent = readFileSync(globalCssPath, "utf8");

  it("applies typing animation only for non-llm instant assistant answers", () => {
    expect(homePageContent).toContain(
      'if (sourceBadgeType === "llm-fallback") return;'
    );
    expect(homePageContent).toContain("typingMessageId === responseId");
    expect(homePageContent).toContain("typing-message");
  });

  it("keeps streamed/openrouter fallback answers out of instant typing path", () => {
    expect(homePageContent).toContain('"llm-fallback"');
    expect(homePageContent).toContain(
      'status === "submitted" || status === "streaming"'
    );
  });

  it("removes typing cursor after completion", () => {
    expect(homePageContent).toContain("setTypingMessageId(null);");
    expect(homePageContent).toContain("!completedTypingIds[responseId]");
  });

  it("uses required brown library palette values in Home styles", () => {
    expect(homePageContent).toContain("#795a39");
    expect(homePageContent).toContain("#d9b48c");
    expect(homePageContent).toContain("#bfae8d");
    expect(homePageContent).toContain("#5f4b3a");
    expect(homePageContent).toContain("#a85f2e");
    expect(homePageContent).toContain("#e8e0d5");
    expect(homePageContent).toContain("#f9f5ee");
  });

  it("defines matching global css variables for palette and contrast", () => {
    expect(globalCssContent).toContain("--primary-brown: #795a39;");
    expect(globalCssContent).toContain("--dark-brown: #5f4b3a;");
    expect(globalCssContent).toContain("--bg-parchment: #e8e0d5;");
    expect(globalCssContent).toContain("--card-bg: #f9f5ee;");
  });
});
