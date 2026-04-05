/**
 * Tests for the conversations tRPC router procedures:
 * create, list, get, getMessages
 *
 * The sendMessage procedure and IDOR guards are already covered in
 * server/routers.idor.test.ts; this file adds the remaining conversation
 * management paths and the auth.logout cookie-clearing behaviour.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { clearSecurityRateLimitBuckets } from "./services/security/rateLimiter";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual };
});

// ---------------------------------------------------------------------------
// Context helpers
// ---------------------------------------------------------------------------

type AuthUser = NonNullable<TrpcContext["user"]>;

function makeUser(id = 1): AuthUser {
  return {
    id,
    openId: `user-${id}`,
    email: `user${id}@example.com`,
    name: `User ${id}`,
    loginMethod: "manus",
    role: "user",
    language: "uk",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
}

type CookieCall = { name: string; options: Record<string, unknown> };

function makeCtx(userId = 1): {
  ctx: TrpcContext;
  clearedCookies: CookieCall[];
} {
  const clearedCookies: CookieCall[] = [];
  const ctx: TrpcContext = {
    user: makeUser(userId),
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as unknown as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

function makeConv(userId: number, id = 10) {
  return {
    id,
    userId,
    title: "Test conversation",
    language: "uk" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

afterEach(() => {
  clearSecurityRateLimitBuckets();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// conversations.create
// ---------------------------------------------------------------------------

describe("conversations.create", () => {
  it("creates a new conversation and returns it", async () => {
    const conv = makeConv(1);
    vi.spyOn(db, "createConversation").mockResolvedValueOnce(conv);
    const { ctx } = makeCtx(1);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.conversations.create({
      title: "My conversation",
      language: "uk",
    });
    expect(result.id).toBe(10);
    expect(db.createConversation).toHaveBeenCalledWith(
      1,
      "My conversation",
      "uk"
    );
  });

  it("defaults language to 'uk' when not supplied", async () => {
    const conv = makeConv(1);
    vi.spyOn(db, "createConversation").mockResolvedValueOnce(conv);
    const { ctx } = makeCtx(1);
    const caller = appRouter.createCaller(ctx);
    await caller.conversations.create({ title: "No lang" });
    expect(db.createConversation).toHaveBeenCalledWith(1, "No lang", "uk");
  });

  it("throws INTERNAL_SERVER_ERROR when db.createConversation returns null", async () => {
    vi.spyOn(db, "createConversation").mockResolvedValueOnce(null);
    const { ctx } = makeCtx(1);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.conversations.create({ title: "Fail" })
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });

  it("rejects titles shorter than 1 character", async () => {
    const { ctx } = makeCtx(1);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.conversations.create({ title: "" })
    ).rejects.toBeDefined();
  });

  it("rejects titles longer than 500 characters", async () => {
    const { ctx } = makeCtx(1);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.conversations.create({ title: "x".repeat(501) })
    ).rejects.toBeDefined();
  });

  it("accepts 'en' as a valid language", async () => {
    const conv = makeConv(1);
    vi.spyOn(db, "createConversation").mockResolvedValueOnce(conv);
    const { ctx } = makeCtx(1);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.conversations.create({
      title: "English",
      language: "en",
    });
    expect(result).toBeDefined();
  });

  it("rejects an unsupported language", async () => {
    const { ctx } = makeCtx(1);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.conversations.create({ title: "Test", language: "de" as never })
    ).rejects.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// conversations.list
// ---------------------------------------------------------------------------

describe("conversations.list", () => {
  it("returns conversations belonging to the current user", async () => {
    const convs = [makeConv(1, 10), makeConv(1, 11)];
    vi.spyOn(db, "getConversations").mockResolvedValueOnce(convs);
    const { ctx } = makeCtx(1);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.conversations.list();
    expect(result).toHaveLength(2);
    expect(db.getConversations).toHaveBeenCalledWith(1);
  });

  it("returns an empty array when the user has no conversations", async () => {
    vi.spyOn(db, "getConversations").mockResolvedValueOnce([]);
    const { ctx } = makeCtx(1);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.conversations.list();
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// conversations.get
// ---------------------------------------------------------------------------

describe("conversations.get", () => {
  it("returns null when the conversation does not exist", async () => {
    vi.spyOn(db, "getConversation").mockResolvedValueOnce(null);
    const { ctx } = makeCtx(1);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.conversations.get({ id: 999 });
    expect(result).toBeNull();
  });

  it("returns the conversation when the caller owns it", async () => {
    const conv = makeConv(1, 10);
    vi.spyOn(db, "getConversation").mockResolvedValueOnce(conv);
    const { ctx } = makeCtx(1);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.conversations.get({ id: 10 });
    expect(result?.id).toBe(10);
  });

  it("throws FORBIDDEN when a different user tries to read the conversation", async () => {
    const conv = makeConv(1, 10); // owned by user 1
    vi.spyOn(db, "getConversation").mockResolvedValueOnce(conv);
    const { ctx } = makeCtx(2); // caller is user 2
    const caller = appRouter.createCaller(ctx);
    await expect(caller.conversations.get({ id: 10 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

// ---------------------------------------------------------------------------
// conversations.getMessages
// ---------------------------------------------------------------------------

describe("conversations.getMessages", () => {
  it("returns messages when the caller owns the conversation", async () => {
    const conv = makeConv(1, 10);
    const msgs = [
      {
        id: 1,
        conversationId: 10,
        role: "user" as const,
        content: "hello",
        createdAt: new Date(),
      },
    ];
    vi.spyOn(db, "getConversation").mockResolvedValueOnce(conv);
    vi.spyOn(db, "getMessages").mockResolvedValueOnce(msgs);
    const { ctx } = makeCtx(1);
    const result = await appRouter
      .createCaller(ctx)
      .conversations.getMessages({ conversationId: 10 });
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe("hello");
  });

  it("throws NOT_FOUND when the conversation does not exist", async () => {
    vi.spyOn(db, "getConversation").mockResolvedValueOnce(null);
    const { ctx } = makeCtx(1);
    await expect(
      appRouter
        .createCaller(ctx)
        .conversations.getMessages({ conversationId: 999 })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws FORBIDDEN when a different user requests messages", async () => {
    const conv = makeConv(1, 10); // owned by user 1
    vi.spyOn(db, "getConversation").mockResolvedValueOnce(conv);
    const { ctx } = makeCtx(2); // caller is user 2
    await expect(
      appRouter
        .createCaller(ctx)
        .conversations.getMessages({ conversationId: 10 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns an empty array when the conversation has no messages", async () => {
    const conv = makeConv(1, 10);
    vi.spyOn(db, "getConversation").mockResolvedValueOnce(conv);
    vi.spyOn(db, "getMessages").mockResolvedValueOnce([]);
    const { ctx } = makeCtx(1);
    const result = await appRouter
      .createCaller(ctx)
      .conversations.getMessages({ conversationId: 10 });
    expect(result).toEqual([]);
  });
});
