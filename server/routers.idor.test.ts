import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";
import * as aiPipeline from "./services/aiPipeline";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual };
});

vi.mock("./services/aiPipeline", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./services/aiPipeline")>();
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

describe("conversations.sendMessage — history deduplication", () => {
  afterEach(() => vi.restoreAllMocks());

  it("does not include the current user message in the history passed to the AI", async () => {
    const conv = mockConversation(1, 10);
    const existingMessages = [
      { id: 1, conversationId: 10, role: "user" as const, content: "hi", createdAt: new Date() },
      { id: 2, conversationId: 10, role: "assistant" as const, content: "hello", createdAt: new Date() },
    ];

    vi.spyOn(db, "getConversation").mockResolvedValueOnce(conv);
    // getMessages is called BEFORE createMessage — returns only prior messages
    vi.spyOn(db, "getMessages").mockResolvedValueOnce(existingMessages);
    vi.spyOn(db, "createMessage")
      .mockResolvedValueOnce({ id: 3, conversationId: 10, role: "user", content: "new msg", createdAt: new Date() })
      .mockResolvedValueOnce({ id: 4, conversationId: 10, role: "assistant", content: "reply", createdAt: new Date() });

    // Spy on generateConversationReply so we can inspect what history it received
    const replySpy = vi.spyOn(aiPipeline, "generateConversationReply").mockResolvedValueOnce({
      text: "reply",
      source: "general",
    });

    const ctx = createUserContext(1);
    const caller = appRouter.createCaller(ctx);
    await caller.conversations.sendMessage({ conversationId: 10, content: "new msg" });

    expect(replySpy).toHaveBeenCalledOnce();
    const callArgs = replySpy.mock.calls[0]![0];

    // history must NOT contain the current user message ("new msg")
    const historyContainsCurrentMsg = callArgs.history.some(
      (m: { role: string; content: string }) => m.content === "new msg"
    );
    expect(historyContainsCurrentMsg).toBe(false);

    // history must contain only the prior messages
    expect(callArgs.history).toHaveLength(2);
    expect(callArgs.prompt).toBe("new msg");
  });
});
