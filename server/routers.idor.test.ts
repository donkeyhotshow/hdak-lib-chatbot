import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual };
});

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createUserContext(userId: number, role: "user" | "admin" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `user-${userId}`,
    email: `user${userId}@example.com`,
    name: `User ${userId}`,
    loginMethod: "manus",
    role,
    language: "uk",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

const mockConversation = (userId: number, id = 42) => ({
  id,
  userId,
  title: "Test",
  language: "uk" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe("conversations.get — IDOR protection", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns the conversation when the caller owns it", async () => {
    const conv = mockConversation(1, 42);
    vi.spyOn(db, "getConversation").mockResolvedValueOnce(conv);

    const ctx = createUserContext(1);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.conversations.get({ id: 42 });
    expect(result).toEqual(conv);
  });

  it("returns null for a non-existent conversation", async () => {
    vi.spyOn(db, "getConversation").mockResolvedValueOnce(null);

    const ctx = createUserContext(1);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.conversations.get({ id: 999 });
    expect(result).toBeNull();
  });

  it("throws FORBIDDEN when a different user tries to read the conversation", async () => {
    const conv = mockConversation(1, 42); // owned by user 1
    vi.spyOn(db, "getConversation").mockResolvedValueOnce(conv);

    const ctx = createUserContext(2); // caller is user 2
    const caller = appRouter.createCaller(ctx);
    await expect(caller.conversations.get({ id: 42 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("conversations.getMessages — IDOR protection", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns messages when the caller owns the conversation", async () => {
    const conv = mockConversation(1, 42);
    vi.spyOn(db, "getConversation").mockResolvedValueOnce(conv);
    vi.spyOn(db, "getMessages").mockResolvedValueOnce([]);

    const ctx = createUserContext(1);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.conversations.getMessages({ conversationId: 42 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("throws FORBIDDEN when a different user tries to read messages", async () => {
    const conv = mockConversation(1, 42);
    vi.spyOn(db, "getConversation").mockResolvedValueOnce(conv);

    const ctx = createUserContext(2);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.conversations.getMessages({ conversationId: 42 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws NOT_FOUND when the conversation does not exist", async () => {
    vi.spyOn(db, "getConversation").mockResolvedValueOnce(null);

    const ctx = createUserContext(1);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.conversations.getMessages({ conversationId: 999 })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("conversations.delete — IDOR protection", () => {
  afterEach(() => vi.restoreAllMocks());

  it("deletes the conversation when the caller owns it", async () => {
    const conv = mockConversation(1, 42);
    vi.spyOn(db, "getConversation").mockResolvedValueOnce(conv);
    vi.spyOn(db, "deleteConversation").mockResolvedValueOnce(true);

    const ctx = createUserContext(1);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.conversations.delete({ id: 42 });
    expect(result).toEqual({ success: true });
  });

  it("throws FORBIDDEN when a different user tries to delete", async () => {
    const conv = mockConversation(1, 42); // owned by user 1
    vi.spyOn(db, "getConversation").mockResolvedValueOnce(conv);

    const ctx = createUserContext(2); // caller is user 2
    const caller = appRouter.createCaller(ctx);
    await expect(caller.conversations.delete({ id: 42 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("throws NOT_FOUND when the conversation does not exist", async () => {
    vi.spyOn(db, "getConversation").mockResolvedValueOnce(null);

    const ctx = createUserContext(1);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.conversations.delete({ id: 999 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
