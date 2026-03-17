import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("Home UI language and guest auth guards", () => {
  const homePagePath = path.join(process.cwd(), "lib/pages/Home.tsx");
  const providersPath = path.join(process.cwd(), "app/providers.tsx");
  const homePageContent = readFileSync(homePagePath, "utf8");
  const providersContent = readFileSync(providersPath, "utf8");

  it("limits interface language options to Ukrainian and English", () => {
    expect(homePageContent).toContain('type Language = "en" | "uk";');
    expect(homePageContent).not.toContain('(["uk", "ru", "en"] as Language[])');
    expect(homePageContent).toContain('(["uk", "en"] as Language[])');
    expect(homePageContent).not.toContain("🇷🇺 Русский");
  });

  it("prevents retry/refetch spam for protected conversation queries", () => {
    expect(homePageContent).toContain("enabled: isAuthenticated,");
    expect(homePageContent).toContain("retry: false,");
    expect(homePageContent).toContain("refetchOnWindowFocus: false,");
    expect(homePageContent).toContain("refetchOnReconnect: false,");
  });

  it("skips noisy unauthorized query errors in global client logging", () => {
    expect(providersContent).toContain(
      'queryError?.data?.code === "UNAUTHORIZED"'
    );
    expect(providersContent).toContain(
      'queryError?.message === "Authentication required"'
    );
  });
});
