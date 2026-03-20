import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("Mobile UX bug fixes — guard tests", () => {
  const homePagePath = path.join(process.cwd(), "lib/pages/Home.tsx");
  const homePageContent = readFileSync(homePagePath, "utf8");
  const layoutPath = path.join(process.cwd(), "app/layout.tsx");
  const layoutContent = readFileSync(layoutPath, "utf8");
  const globalsCssPath = path.join(process.cwd(), "app/globals.css");
  const globalsCssContent = readFileSync(globalsCssPath, "utf8");

  // BUG 1: Chips must not render twice in DOM
  it("chips are not duplicated — no inline-chip render inside input bar", () => {
    // The welcome-state chips render is the only chips.map() with className hdak-chip
    // The duplicate `inline-chip-${chip.text}` key must be removed
    expect(homePageContent).not.toContain("inline-chip-");
  });

  // BUG 2: Touch targets ≥ 44px on all interactive elements
  it("send button has 44px touch target", () => {
    expect(homePageContent).toContain("width: 44");
    expect(homePageContent).toContain("height: 44");
  });

  it("feedback buttons have min-height 44px and min-width 44px", () => {
    expect(homePageContent).toContain("min-height: 44px; min-width: 44px");
  });

  it("followup chips have min-height 44px", () => {
    expect(homePageContent).toContain(".hdak-followup-chip { min-height: 44px");
  });

  it("action buttons have min-height 44px", () => {
    expect(homePageContent).toContain(".hdak-action-btn { min-height: 44px");
  });

  it("context buttons have min-height 44px", () => {
    expect(homePageContent).toContain(".hdak-ctx-btn { min-height: 44px");
  });

  it("welcome-state chips have minHeight 44", () => {
    expect(homePageContent).toContain("minHeight: 44");
  });

  it("interactive elements use touch-action manipulation", () => {
    expect(homePageContent).toContain("touch-action: manipulation");
  });

  // BUG 3: iOS zoom — viewport does NOT disable user scaling (bad for a11y)
  it("viewport does not set maximum-scale or user-scalable=no", () => {
    expect(layoutContent).not.toContain("maximumScale");
    expect(layoutContent).not.toContain("userScalable");
  });

  it("textarea font-size is 16px to prevent iOS auto-zoom", () => {
    expect(homePageContent).toContain("font-size: 16px");
  });

  // BUG 4: Safe areas — input bar already uses env(safe-area-inset-bottom)
  it("input bar respects iOS safe-area-inset-bottom", () => {
    expect(homePageContent).toContain("env(safe-area-inset-bottom)");
  });

  it("globals.css includes safe-area-inset padding", () => {
    expect(globalsCssContent).toContain("env(safe-area-inset-top)");
    expect(globalsCssContent).toContain("env(safe-area-inset-bottom)");
  });

  // BUG 5: Keyboard hints hidden on pointer:coarse (touch) devices
  it("keyboard hint is hidden on touch devices with pointer:coarse media query", () => {
    expect(homePageContent).toContain("pointer: coarse");
    expect(homePageContent).toContain("hdak-input-hint");
  });

  // Accessibility: aria-live and aria-label on send
  it("messages container has aria-live polite for screen readers", () => {
    expect(homePageContent).toContain('aria-live="polite"');
  });

  it("send button has aria-label", () => {
    expect(homePageContent).toContain("aria-label={t.sendMessage}");
  });

  // PWA: manifest.json and SW exist
  it("manifest.json exists in public directory", () => {
    const manifestPath = path.join(process.cwd(), "public/manifest.json");
    expect(existsSync(manifestPath)).toBe(true);
  });

  it("manifest.json has correct PWA fields", () => {
    const manifestPath = path.join(process.cwd(), "public/manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      name: string;
      short_name: string;
      display: string;
      theme_color: string;
      icons: { src: string; sizes: string }[];
    };
    expect(manifest.name).toBe("HDAK Library Chatbot");
    expect(manifest.short_name).toBe("HDAK Chatbot");
    expect(manifest.display).toBe("standalone");
    expect(manifest.theme_color).toBe("#5c3a1e");
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
  });

  it("service worker file exists in public directory", () => {
    const swPath = path.join(process.cwd(), "public/sw.js");
    expect(existsSync(swPath)).toBe(true);
  });

  it("service worker is registered from Home.tsx", () => {
    expect(homePageContent).toContain("serviceWorker");
    expect(homePageContent).toContain('register("/sw.js")');
  });

  it("layout.tsx references PWA manifest", () => {
    expect(layoutContent).toContain("manifest");
  });
});
