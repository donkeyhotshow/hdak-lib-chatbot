/**
 * Unit tests for database helper functions.
 *
 * This file focuses on functions that are NOT already covered by
 * chatbot.test.ts (resources/contacts/info mock-state paths) or
 * routers.idor.test.ts (router-level conversation/message paths).
 *
 * Conversation-related helpers (createConversation, getConversations,
 * deleteConversation, clearOldConversations) have no mock-state
 * implementation — they return sentinel values (null / false / 0 / [])
 * when DATABASE_URL is absent.  The transaction logic inside
 * deleteConversation and clearOldConversations is exercised at the
 * router/integration level via routers.idor.test.ts.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import * as db from "./db";

// ---------------------------------------------------------------------------
// Hoist the db module so vi.spyOn works on its exports.
// This mirrors the pattern used in routers.idor.test.ts.
// ---------------------------------------------------------------------------
vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual };
});

// ---------------------------------------------------------------------------
// deleteConversation — no-DB sentinel path
// ---------------------------------------------------------------------------

describe("deleteConversation — no-database path", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns false when no database is available (DATABASE_URL not set)", async () => {
    // In the test environment DATABASE_URL is not set, so getDb() returns null
    // and deleteConversation must return false without throwing.
    const result = await db.deleteConversation(999);
    expect(result).toBe(false);
  });

  it("returns false for any conversation id when the database is unavailable", async () => {
    const results = await Promise.all(
      [0, 1, -1, 99999].map(id => db.deleteConversation(id))
    );
    expect(results.every(r => r === false)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// clearOldConversations — no-DB sentinel path
// ---------------------------------------------------------------------------

describe("clearOldConversations — no-database path", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns 0 when no database is available", async () => {
    const result = await db.clearOldConversations(30);
    expect(result).toBe(0);
  });

  it("returns 0 for any days argument when the database is unavailable", async () => {
    const results = await Promise.all(
      [0, 1, 30, 365].map(d => db.clearOldConversations(d))
    );
    expect(results.every(r => r === 0)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// deleteConversation — router-level transaction test
// Tests that the router correctly calls deleteConversation and propagates the
// result, complementing the IDOR tests in routers.idor.test.ts.
// ---------------------------------------------------------------------------

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function makeCtx(userId: number): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `user-${userId}`,
      email: `u${userId}@example.com`,
      name: `User ${userId}`,
      loginMethod: "manus",
      role: "user",
      language: "uk",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("deleteConversation — router propagates result", () => {
  afterEach(() => vi.restoreAllMocks());

  it("reports success when deleteConversation returns true", async () => {
    const conv = {
      id: 7,
      userId: 1,
      title: "t",
      language: "uk" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.spyOn(db, "getConversation").mockResolvedValueOnce(conv);
    vi.spyOn(db, "deleteConversation").mockResolvedValueOnce(true);

    const caller = appRouter.createCaller(makeCtx(1));
    const result = await caller.conversations.delete({ id: 7 });
    expect(result).toEqual({ success: true });
  });

  it("reports failure when deleteConversation returns false (e.g. transaction error)", async () => {
    const conv = {
      id: 8,
      userId: 1,
      title: "t",
      language: "uk" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.spyOn(db, "getConversation").mockResolvedValueOnce(conv);
    vi.spyOn(db, "deleteConversation").mockResolvedValueOnce(false);

    const caller = appRouter.createCaller(makeCtx(1));
    // When the DB delete fails the router throws NOT_FOUND
    await expect(caller.conversations.delete({ id: 8 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
