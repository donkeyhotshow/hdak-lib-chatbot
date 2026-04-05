import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("Accessibility guard tests (ARIA, contrast, focus, skip link)", () => {
  const homePagePath = path.join(process.cwd(), "lib/pages/Home.tsx");
  const homeContent = readFileSync(homePagePath, "utf8");
  const layoutPath = path.join(process.cwd(), "app/layout.tsx");
  const layoutContent = readFileSync(layoutPath, "utf8");
  const skipLinkPath = path.join(process.cwd(), "components/SkipLink.tsx");
  const skipLinkContent = readFileSync(skipLinkPath, "utf8");
  const globalsCssPath = path.join(process.cwd(), "app/globals.css");
  const globalsCssContent = readFileSync(globalsCssPath, "utf8");

  // FIX 1: Textarea ARIA
  it("textarea has aria-label for screen readers", () => {
    expect(homeContent).toContain(
      'aria-label="Введіть запитання до бібліотеки"'
    );
  });

  it("textarea has aria-describedby pointing to keyboard-hints", () => {
    expect(homeContent).toContain('aria-describedby="keyboard-hints"');
  });

  it("textarea has id=chat-input for skip link target", () => {
    expect(homeContent).toContain('id="chat-input"');
  });

  it("textarea has inputMode and autoComplete", () => {
    expect(homeContent).toContain('inputMode="text"');
    expect(homeContent).toContain('autoComplete="off"');
  });

  it("visually-hidden SR description exists for keyboard hints", () => {
    expect(homeContent).toContain("Enter для надсилання");
    expect(homeContent).toContain("Shift+Enter для нового рядка");
  });

  // FIX 2: Message container ARIA
  it("message container has role=log and aria-live=polite", () => {
    expect(homeContent).toContain('role="log"');
    expect(homeContent).toContain('aria-live="polite"');
  });

  it("message container aria-label is in Ukrainian", () => {
    expect(homeContent).toContain('aria-label="Історія чату"');
  });

  // FIX 3: aria-busy during streaming
  it("message container has aria-busy bound to isStreaming", () => {
    expect(homeContent).toContain("aria-busy={isStreaming}");
  });

  // FIX 4: Icon-only buttons
  it("history button has descriptive aria-label", () => {
    expect(homeContent).toContain('aria-label="Переглянути історію чатів"');
  });

  it("resources button has descriptive aria-label", () => {
    expect(homeContent).toContain('aria-label="Відкрити ресурси бібліотеки"');
  });

  it("language button has descriptive aria-label", () => {
    expect(homeContent).toContain('aria-label="Змінити мову інтерфейсу"');
  });

  it("dropdown buttons expose aria-expanded state", () => {
    expect(homeContent).toContain("aria-expanded={openDropdown");
  });

  it("globe emoji is hidden from screen readers", () => {
    expect(homeContent).toContain('<span aria-hidden="true">🌐</span>');
  });

  it("feedback emoji buttons have aria-hidden on emoji spans", () => {
    expect(homeContent).toContain('<span aria-hidden="true">👍</span>');
    expect(homeContent).toContain('<span aria-hidden="true">👎</span>');
  });

  it("send button still has aria-label", () => {
    expect(homeContent).toContain("aria-label={t.sendMessage}");
  });

  // FIX 5: Contrast
  it("subtitle color is #64461d (passes 4.5:1 on parchment background)", () => {
    expect(homeContent).toContain('"#64461d"');
    expect(homeContent).not.toContain('"#9e8060"');
  });

  // FIX 6: Focus-visible ring in globals.css
  it("globals.css has focus-visible ring rule", () => {
    expect(globalsCssContent).toContain(":focus-visible");
    expect(globalsCssContent).toContain("outline: 2px solid #5c3a1e");
  });

  it("globals.css suppresses focus ring for mouse/pointer users", () => {
    expect(globalsCssContent).toContain(":focus:not(:focus-visible)");
  });

  // FIX 7: Skip link in SkipLink.tsx (client component used in layout.tsx)
  it("layout.tsx contains skip navigation link", () => {
    expect(layoutContent).toContain("SkipLink");
    expect(skipLinkContent).toContain('href="#chat-input"');
    expect(skipLinkContent).toContain("Перейти до поля вводу");
  });
});
