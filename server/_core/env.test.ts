/**
 * Tests for server/_core/env.ts — validateStartupEnv()
 *
 * Verifies that:
 *  - In development / mock mode (no DATABASE_URL), friendly info messages are
 *    emitted and process.exit is never called.
 *  - In production, an error is logged and process.exit(1) is called for each
 *    missing required variable.
 */

import { describe, expect, it, vi } from "vitest";
import { validateStartupEnv } from "./env";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDeps() {
  return {
    info: vi.fn<[string], void>(),
    error: vi.fn<[string], void>(),
    exit: vi.fn<[number], void>(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("validateStartupEnv", () => {
  it("mock mode logs info, not error when vars missing", () => {
    const deps = makeDeps();

    validateStartupEnv(
      { databaseUrl: "", oAuthServerUrl: "", isProduction: false },
      deps
    );

    // Should emit two friendly info messages
    expect(deps.info).toHaveBeenCalledTimes(2);
    expect(deps.info).toHaveBeenCalledWith(
      "[INFO] Running with in-memory mock DB (no DATABASE_URL set)"
    );
    expect(deps.info).toHaveBeenCalledWith(
      "[INFO] OAuth disabled, running in public mode (no OAUTH_SERVER_URL set)"
    );

    // Must NOT log errors or terminate the process
    expect(deps.error).not.toHaveBeenCalled();
    expect(deps.exit).not.toHaveBeenCalled();
  });

  it("production exits with error when vars missing", () => {
    const deps = makeDeps();

    validateStartupEnv(
      { databaseUrl: "", oAuthServerUrl: "", isProduction: true },
      deps
    );

    // Should log an error about DATABASE_URL and immediately exit
    expect(deps.error).toHaveBeenCalledWith(
      expect.stringContaining("DATABASE_URL")
    );
    expect(deps.exit).toHaveBeenCalledWith(1);

    // After exit, OAUTH_SERVER_URL check should be skipped (early return)
    expect(deps.info).not.toHaveBeenCalled();
  });

  it("no messages when both vars are present", () => {
    const deps = makeDeps();

    validateStartupEnv(
      {
        databaseUrl: "postgres://localhost/db",
        oAuthServerUrl: "https://auth.example.com",
        isProduction: false,
      },
      deps
    );

    expect(deps.info).not.toHaveBeenCalled();
    expect(deps.error).not.toHaveBeenCalled();
    expect(deps.exit).not.toHaveBeenCalled();
  });

  it("production exits with error for missing OAUTH_SERVER_URL when DATABASE_URL is present", () => {
    const deps = makeDeps();

    validateStartupEnv(
      {
        databaseUrl: "postgres://localhost/db",
        oAuthServerUrl: "",
        isProduction: true,
      },
      deps
    );

    expect(deps.error).toHaveBeenCalledWith(
      expect.stringContaining("OAUTH_SERVER_URL")
    );
    expect(deps.exit).toHaveBeenCalledWith(1);
    expect(deps.info).not.toHaveBeenCalled();
  });
});
