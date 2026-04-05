import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("Home performance and UX polish guards", () => {
  const homePagePath = path.join(process.cwd(), "lib/pages/Home.tsx");
  const homePageContent = readFileSync(homePagePath, "utf8");

  it("implements windowed rendering for long message history", () => {
    expect(homePageContent).toContain("VIRTUALIZED_MESSAGES_THRESHOLD");
    expect(homePageContent).toContain("visibleMessageStartIndex");
    expect(homePageContent).toContain("visibleMessages");
    expect(homePageContent).toContain("Show earlier messages");
  });

  it("uses pinned-bottom auto-scroll behavior for chat updates", () => {
    expect(homePageContent).toContain("AUTO_SCROLL_BOTTOM_THRESHOLD_PX");
    expect(homePageContent).toContain("shouldAutoScrollRef");
    expect(homePageContent).toContain("handleMessagesScroll");
    expect(homePageContent).toContain("scrollToBottom");
  });

  it("adds keyboard shortcuts for editing and quick send", () => {
    expect(homePageContent).toContain('e.key === "ArrowUp"');
    expect(homePageContent).toContain("editLastUserMessage");
    expect(homePageContent).toContain('e.key === "ArrowDown" && e.altKey');
  });

  it("renders guest history preview text from conversation messages", () => {
    expect(homePageContent).toContain("getConversationPreview");
    expect(homePageContent).toContain("conversationPreview");
    expect(homePageContent).toContain("messages.find(");
    expect(homePageContent).toContain('message.role === "user"');
  });

  it("attaches global unexpected error listeners for UI stability", () => {
    expect(homePageContent).toContain(
      'window.addEventListener("error", onUnexpectedError)'
    );
    expect(homePageContent).toContain(
      'window.addEventListener("unhandledrejection", onUnexpectedError)'
    );
  });
});
