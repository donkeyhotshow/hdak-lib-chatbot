/**
 * Tests for server/_core/context.ts
 *
 * Verifies that createContext resolves the authenticated user from SDK and
 * gracefully falls back to `null` when no valid session is present.
 */

import { describe, expect, it, vi } from "vitest";
import { createContext } from "./context";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { sdk } from "./sdk";

vi.mock("./sdk", () => ({
  sdk: {
    authenticateRequest: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeOpts(): CreateExpressContextOptions {
  return {
    req: {
      protocol: "https",
      headers: {},
    } as CreateExpressContextOptions["req"],
    res: {} as CreateExpressContextOptions["res"],
    info: {
      calls: [],
      isBatchCall: false,
      accept: "application/json",
      type: "query",
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createContext", () => {
  it("returns authenticated user when session is valid", async () => {
    vi.mocked(sdk.authenticateRequest).mockResolvedValueOnce({
      id: 7,
      openId: "user-7",
      email: "user7@example.com",
      name: "User Seven",
      role: "user",
      language: "uk",
      loginMethod: "manus",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } as any);

    const opts = makeOpts();
    const ctx = await createContext(opts);

    expect(ctx.user).toMatchObject({
      id: 7,
      openId: "user-7",
      role: "user",
      language: "uk",
    });
  });

  it("always returns req and res", async () => {
    const opts = makeOpts();
    const ctx = await createContext(opts);

    expect(ctx.req).toBe(opts.req);
    expect(ctx.res).toBe(opts.res);
  });

  it("returns user=null when authentication fails", async () => {
    vi.mocked(sdk.authenticateRequest).mockRejectedValueOnce(
      new Error("Invalid session")
    );

    const opts = makeOpts();
    const ctx = await createContext(opts);

    expect(ctx.user).toBeNull();
  });
});
