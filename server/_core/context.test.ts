/**
 * Tests for server/_core/context.ts
 *
 * Verifies that createContext always returns a mock user without any SDK calls.
 */

import { describe, expect, it } from "vitest";
import { createContext } from "./context";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";

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

describe("createContext — always returns mock user", () => {
  it("returns a valid mock user without any SDK calls", async () => {
    const opts = makeOpts();
    const ctx = await createContext(opts);

    expect(ctx.user).toMatchObject({
      id: 1,
      openId: "public",
      name: "Guest",
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

  it("user is never null", async () => {
    const opts = makeOpts();
    const ctx = await createContext(opts);

    expect(ctx.user).not.toBeNull();
    expect(ctx.user).not.toBeUndefined();
  });

  it("returns consistent mock user across multiple calls", async () => {
    const ctx1 = await createContext(makeOpts());
    const ctx2 = await createContext(makeOpts());

    expect(ctx1.user).toMatchObject(ctx2.user);
  });
});
