/**
 * Tests for server/_core/context.ts
 *
 * Verifies that createContext correctly authenticates users via the SDK and
 * falls back to user=null on authentication errors.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { createContext } from "./context";
import { sdk } from "./sdk";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

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

function makeUser() {
  return {
    id: 1,
    openId: "test-open-id",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus" as const,
    role: "user" as const,
    language: "uk",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
}

afterEach(() => vi.restoreAllMocks());

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createContext — authenticated user", () => {
  it("returns the user when SDK authentication succeeds", async () => {
    const user = makeUser();
    vi.mocked(sdk.authenticateRequest).mockResolvedValueOnce(user as any);

    const opts = makeOpts();
    const ctx = await createContext(opts);

    expect(ctx.user).toMatchObject({ id: 1, email: "test@example.com" });
    expect(ctx.req).toBe(opts.req);
    expect(ctx.res).toBe(opts.res);
  });

  it("passes the request to sdk.authenticateRequest", async () => {
    vi.mocked(sdk.authenticateRequest).mockResolvedValueOnce(makeUser() as any);

    const opts = makeOpts();
    await createContext(opts);

    expect(sdk.authenticateRequest).toHaveBeenCalledWith(opts.req);
  });
});

describe("createContext — unauthenticated / error paths", () => {
  it("returns user=null when SDK throws an error", async () => {
    vi.mocked(sdk.authenticateRequest).mockRejectedValueOnce(
      new Error("invalid token")
    );

    const ctx = await createContext(makeOpts());
    expect(ctx.user).toBeNull();
  });

  it("returns user=null when SDK returns null", async () => {
    vi.mocked(sdk.authenticateRequest).mockResolvedValueOnce(null as any);

    const ctx = await createContext(makeOpts());
    expect(ctx.user).toBeNull();
  });

  it("still returns req and res even when authentication fails", async () => {
    vi.mocked(sdk.authenticateRequest).mockRejectedValueOnce(
      new Error("auth failure")
    );

    const opts = makeOpts();
    const ctx = await createContext(opts);

    expect(ctx.req).toBe(opts.req);
    expect(ctx.res).toBe(opts.res);
  });

  it("returns user=null when SDK throws a non-Error value", async () => {
    vi.mocked(sdk.authenticateRequest).mockRejectedValueOnce("string error");

    const ctx = await createContext(makeOpts());
    expect(ctx.user).toBeNull();
  });
});
