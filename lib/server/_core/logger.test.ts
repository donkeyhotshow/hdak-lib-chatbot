/**
 * Tests for server/_core/logger.ts
 *
 * Verifies that every log method emits correctly-shaped JSON to stdout/stderr
 * and that the `milestone` banner writes a visible text block to stdout.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "./logger";

describe("logger — structured JSON output", () => {
  let stdoutLines: string[] = [];
  let stderrLines: string[] = [];

  beforeEach(() => {
    stdoutLines = [];
    stderrLines = [];
    vi.spyOn(console, "log").mockImplementation((line: string) => {
      stdoutLines.push(line);
    });
    vi.spyOn(console, "error").mockImplementation((line: string) => {
      stderrLines.push(line);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── info ──────────────────────────────────────────────────────────────────

  it("logger.info writes JSON to stdout with level=info", () => {
    logger.info("Hello info");
    expect(stdoutLines).toHaveLength(1);
    const parsed = JSON.parse(stdoutLines[0]);
    expect(parsed.level).toBe("info");
    expect(parsed.msg).toBe("Hello info");
    expect(typeof parsed.time).toBe("string");
  });

  it("logger.info includes arbitrary meta fields", () => {
    logger.info("With meta", { userId: 42, action: "login" });
    const parsed = JSON.parse(stdoutLines[0]);
    expect(parsed.userId).toBe(42);
    expect(parsed.action).toBe("login");
  });

  // ── debug ─────────────────────────────────────────────────────────────────

  it("logger.debug writes JSON to stdout with level=debug", () => {
    logger.debug("Debug message");
    const parsed = JSON.parse(stdoutLines[0]);
    expect(parsed.level).toBe("debug");
    expect(parsed.msg).toBe("Debug message");
  });

  // ── warn ──────────────────────────────────────────────────────────────────

  it("logger.warn writes JSON to stderr with level=warn", () => {
    logger.warn("Watch out");
    expect(stderrLines).toHaveLength(1);
    expect(stdoutLines).toHaveLength(0);
    const parsed = JSON.parse(stderrLines[0]);
    expect(parsed.level).toBe("warn");
    expect(parsed.msg).toBe("Watch out");
  });

  // ── error ─────────────────────────────────────────────────────────────────

  it("logger.error writes JSON to stderr with level=error", () => {
    logger.error("Something broke", { error: "timeout" });
    expect(stderrLines).toHaveLength(1);
    expect(stdoutLines).toHaveLength(0);
    const parsed = JSON.parse(stderrLines[0]);
    expect(parsed.level).toBe("error");
    expect(parsed.msg).toBe("Something broke");
    expect(parsed.error).toBe("timeout");
  });

  // ── time ──────────────────────────────────────────────────────────────────

  it("every entry carries a valid ISO-8601 timestamp", () => {
    logger.info("ts check");
    const parsed = JSON.parse(stdoutLines[0]);
    expect(() => new Date(parsed.time)).not.toThrow();
    expect(isNaN(new Date(parsed.time).getTime())).toBe(false);
  });
});

// ── milestone ─────────────────────────────────────────────────────────────────

describe("logger.milestone — banner output", () => {
  let stdoutLines: string[] = [];

  beforeEach(() => {
    stdoutLines = [];
    vi.spyOn(console, "log").mockImplementation((line: string) => {
      stdoutLines.push(line);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prints multiple lines to stdout (not stderr)", () => {
    logger.milestone("Server started");
    // Milestone emits at least 4 lines: blank, top bar, star line, message, bottom bar, blank
    expect(stdoutLines.length).toBeGreaterThanOrEqual(4);
  });

  it("contains the message text", () => {
    logger.milestone("Cache cleared");
    const combined = stdoutLines.join("\n");
    expect(combined).toContain("Cache cleared");
  });

  it("contains a box-drawing border", () => {
    logger.milestone("Some event");
    const combined = stdoutLines.join("\n");
    expect(combined).toContain("═");
  });

  it("includes meta JSON when supplied", () => {
    logger.milestone("Sync complete", { synced: 5 });
    const combined = stdoutLines.join("\n");
    expect(combined).toContain("synced");
    expect(combined).toContain("5");
  });
});
