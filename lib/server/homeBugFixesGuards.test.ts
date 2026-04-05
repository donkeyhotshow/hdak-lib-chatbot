/**
 * Guard tests for the two bug fixes:
 *  BUG 1 – /api/chat 503 on Vercel (route hardening)
 *  BUG 2 – React removeChild / hydration crash (stable keys, ErrorBoundary reset)
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const routeContent = readFileSync(
  path.join(ROOT, "app/api/chat/route.ts"),
  "utf8"
);
const healthContent = readFileSync(
  path.join(ROOT, "app/api/chat/health/route.ts"),
  "utf8"
);
const homeContent = readFileSync(path.join(ROOT, "lib/pages/Home.tsx"), "utf8");
const ebContent = readFileSync(
  path.join(ROOT, "components/ErrorBoundary.tsx"),
  "utf8"
);

// ─── BUG 1: route.ts hardening ──────────────────────────────────────────────

describe("BUG 1 — /api/chat route hardening", () => {
  it("exports maxDuration = 30 for Vercel hobby plan (STEP 1.3)", () => {
    expect(routeContent).toContain("export const maxDuration = 30");
  });

  it("has comment listing required env vars (STEP 1.4)", () => {
    expect(routeContent).toContain("REQUIRED env vars");
    expect(routeContent).toContain("FORGE_API_KEY");
    expect(routeContent).toContain("OPENAI_API_KEY");
  });

  it("logs error when env vars are missing (STEP 1.1)", () => {
    expect(routeContent).toContain(
      'logger.error("[api/chat] Required environment variable(s) missing"'
    );
  });

  it("returns 500 (not 503) when API key is missing (STEP 1.1)", () => {
    // The env-missing guard must now return 500
    expect(routeContent).toContain('"API key not configured"');
    expect(routeContent).toContain("{ status: 500 }");
    // Must NOT return 503 anywhere
    expect(routeContent).not.toContain("status: 503");
  });

  it("wraps ALL logic in one outer try/catch so Vercel never sees uncaught throws (STEP 1.2)", () => {
    // The env-check *call* (not the import) must be inside the outer try block.
    // We find the first occurrence of the actual invocation pattern.
    const tryIdx = routeContent.indexOf("try {");
    // The call in the handler body uses the options object
    const envCallIdx = routeContent.indexOf(
      "getMissingCriticalEnvVars({ forProductionBoot"
    );
    expect(envCallIdx).toBeGreaterThan(tryIdx);
  });

  it("catch block logs with [api/chat] prefix (STEP 1.2)", () => {
    expect(routeContent).toContain('logger.error("[api/chat] Unhandled error"');
  });

  it("catch block returns internal_error JSON (STEP 1.2)", () => {
    expect(routeContent).toContain('"internal_error"');
  });
});

// ─── BUG 1: health endpoint ──────────────────────────────────────────────────

describe("BUG 1 — /api/chat/health endpoint (STEP 1.5)", () => {
  it("exports a GET handler", () => {
    expect(healthContent).toContain("export async function GET");
  });

  it("returns ok: true", () => {
    expect(healthContent).toContain("ok: true");
  });

  it("checks the correct API key env vars", () => {
    expect(healthContent).toContain("BUILT_IN_FORGE_API_KEY");
    expect(healthContent).toContain("FORGE_API_KEY");
    expect(healthContent).toContain("OPENAI_API_KEY");
  });

  it("returns hasKey and timestamp fields", () => {
    expect(healthContent).toContain("hasKey");
    expect(healthContent).toContain("timestamp");
  });
});

// ─── BUG 2: React removeChild – stable keys ───────────────────────────────

describe("BUG 2 — stable React keys (FIX 2.1)", () => {
  it("chips use chip.text as key instead of array index", () => {
    expect(homeContent).toContain("key={chip.text}");
    // The old pattern should be gone
    expect(homeContent).not.toMatch(/chips\.map\(\(chip,\s*i\)/);
  });

  it("message div key fallback is a compound string (not bare index)", () => {
    // Should contain the compound fallback pattern
    expect(homeContent).toContain("`msg-${messageIndex}-${msg.role}`");
    // Should NOT have the bare number fallback
    expect(homeContent).not.toMatch(/:\s*messageIndex\s*\}/);
  });
});

// ─── BUG 2: ErrorBoundary resetKeys ─────────────────────────────────────────

describe("BUG 2 — ErrorBoundary resetKeys (FIX 2.5)", () => {
  it("Props interface has resetKeys?: unknown[]", () => {
    expect(ebContent).toContain("resetKeys?: unknown[]");
  });

  it("componentDidUpdate checks resetKeys and resets state", () => {
    expect(ebContent).toContain("componentDidUpdate");
    expect(ebContent).toContain("resetKeys");
    expect(ebContent).toContain("setState({ hasError: false, error: null })");
  });
});
