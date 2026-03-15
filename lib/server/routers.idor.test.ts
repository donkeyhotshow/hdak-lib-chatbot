import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";
import * as aiPipeline from "./services/aiPipeline";
import { clearSecurityRateLimitBuckets } from "./services/security/rateLimiter";

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual };
});

vi.mock("./services/aiPipeline", async importOriginal => {
  const actual = await importOriginal<typeof import("./services/aiPipeline")>();
  return { ...actual };
});

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createUserContext(
  userId: number,
  role: "user" | "admin" = "user"
): TrpcContext {
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

afterEach(() => {
  clearSecurityRateLimitBuckets();
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
    const result = await caller.conversations.getMessages({
      conversationId: 42,
    });
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
    await expect(caller.conversations.delete({ id: 42 })).rejects.toMatchObject(
      {
        code: "FORBIDDEN",
      }
    );
  });

  it("throws NOT_FOUND when the conversation does not exist", async () => {
    vi.spyOn(db, "getConversation").mockResolvedValueOnce(null);

    const ctx = createUserContext(1);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.conversations.delete({ id: 999 })
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("conversations.sendMessage — history deduplication", () => {
  afterEach(() => vi.restoreAllMocks());

  it("does not include the current user message in the history passed to the AI", async () => {
    const conv = mockConversation(1, 10);
    const existingMessages = [
      {
        id: 1,
        conversationId: 10,
        role: "user" as const,
        content: "hi",
        createdAt: new Date(),
      },
      {
        id: 2,
        conversationId: 10,
        role: "assistant" as const,
        content: "hello",
        createdAt: new Date(),
      },
    ];

    vi.spyOn(db, "getConversation").mockResolvedValueOnce(conv);
    // getMessages is called BEFORE createMessage — returns only prior messages
    vi.spyOn(db, "getMessages").mockResolvedValueOnce(existingMessages);
    vi.spyOn(db, "createMessage")
      .mockResolvedValueOnce({
        id: 3,
        conversationId: 10,
        role: "user",
        content: "new msg",
        createdAt: new Date(),
      })
      .mockResolvedValueOnce({
        id: 4,
        conversationId: 10,
        role: "assistant",
        content: "reply",
        createdAt: new Date(),
      });

    // Spy on generateConversationReply so we can inspect what history it received
    const replySpy = vi
      .spyOn(aiPipeline, "generateConversationReply")
      .mockResolvedValueOnce({
        text: "reply",
        source: "general",
      });

    const ctx = createUserContext(1);
    const caller = appRouter.createCaller(ctx);
    await caller.conversations.sendMessage({
      conversationId: 10,
      content: "new msg",
    });

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

describe("conversations.create — input validation", () => {
  afterEach(() => vi.restoreAllMocks());

  it("rejects a conversation title that exceeds 500 characters", async () => {
    const ctx = createUserContext(1);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.conversations.create({ title: "a".repeat(501) })
    ).rejects.toThrow();
  });

  it("accepts a conversation title of exactly 500 characters", async () => {
    const conv = {
      id: 1,
      userId: 1,
      title: "a".repeat(500),
      language: "uk" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.spyOn(db, "createConversation").mockResolvedValueOnce(conv);

    const ctx = createUserContext(1);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.conversations.create({
      title: "a".repeat(500),
    });
    expect(result).toEqual(conv);
  });
});

describe("contacts.create — input validation", () => {
  afterEach(() => vi.restoreAllMocks());

  it("rejects an empty contact value", async () => {
    const ctx = createUserContext(1, "admin");
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.contacts.create({ type: "email", value: "" })
    ).rejects.toThrow();
  });

  it("rejects a contact value that exceeds 1000 characters", async () => {
    const ctx = createUserContext(1, "admin");
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.contacts.create({ type: "email", value: "a".repeat(1001) })
    ).rejects.toThrow();
  });
});

describe("contacts.update — input validation", () => {
  afterEach(() => vi.restoreAllMocks());

  it("rejects an empty string when updating contact value", async () => {
    const ctx = createUserContext(1, "admin");
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.contacts.update({ id: 1, value: "" })
    ).rejects.toThrow();
  });
});

describe("libraryInfo.set — input validation", () => {
  afterEach(() => vi.restoreAllMocks());

  it("rejects an empty key", async () => {
    const ctx = createUserContext(1, "admin");
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.libraryInfo.set({
        key: "",
        valueEn: "v",
        valueUk: "v",
        valueRu: "v",
      })
    ).rejects.toThrow();
  });

  it("rejects a key that exceeds 200 characters", async () => {
    const ctx = createUserContext(1, "admin");
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.libraryInfo.set({
        key: "k".repeat(201),
        valueEn: "v",
        valueUk: "v",
        valueRu: "v",
      })
    ).rejects.toThrow();
  });
});

describe("resources.delete — NOT_FOUND when resource does not exist", () => {
  afterEach(() => vi.restoreAllMocks());

  it("throws NOT_FOUND when deleteResource returns false (non-existent ID)", async () => {
    vi.spyOn(db, "deleteResource").mockResolvedValueOnce(false);

    const ctx = createUserContext(1, "admin");
    const caller = appRouter.createCaller(ctx);

    await expect(caller.resources.delete({ id: 9999 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("returns { success: true } when deleteResource returns true", async () => {
    vi.spyOn(db, "deleteResource").mockResolvedValueOnce(true);

    const ctx = createUserContext(1, "admin");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.resources.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });
});

describe("contacts.delete — NOT_FOUND when contact does not exist", () => {
  afterEach(() => vi.restoreAllMocks());

  it("throws NOT_FOUND when deleteContact returns false (non-existent ID)", async () => {
    vi.spyOn(db, "deleteContact").mockResolvedValueOnce(false);

    const ctx = createUserContext(1, "admin");
    const caller = appRouter.createCaller(ctx);

    await expect(caller.contacts.delete({ id: 9999 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("resources.getByType — rejects invalid type strings", () => {
  it("throws on an unknown resource type", async () => {
    // getByType now uses z.enum; arbitrary strings should be rejected by tRPC input validation
    const ctx = createUserContext(1, "user");
    const caller = appRouter.createCaller(ctx);

    await expect(
      (caller.resources.getByType as any)({
        type: "'; DROP TABLE library_resources; --",
      })
    ).rejects.toThrow();
  });

  it("accepts a valid resource type", async () => {
    vi.spyOn(db, "getResourcesByType").mockResolvedValueOnce([]);
    const ctx = createUserContext(1, "user");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.resources.getByType({ type: "catalog" });
    expect(result).toEqual([]);
  });
});

describe("resources.create — rejects unbounded name/description/url inputs", () => {
  afterEach(() => vi.restoreAllMocks());

  it("rejects a nameEn longer than 500 characters", async () => {
    const ctx = createUserContext(1, "admin");
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.resources.create({
        nameEn: "a".repeat(501),
        nameUk: "назва",
        nameRu: "название",
        type: "catalog",
      })
    ).rejects.toThrow();
  });

  it("rejects a descriptionUk longer than 10 000 characters", async () => {
    const ctx = createUserContext(1, "admin");
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.resources.create({
        nameEn: "Resource",
        nameUk: "Ресурс",
        nameRu: "Ресурс",
        type: "database",
        descriptionUk: "d".repeat(10_001),
      })
    ).rejects.toThrow();
  });

  it("rejects a url longer than 2048 characters", async () => {
    const ctx = createUserContext(1, "admin");
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.resources.create({
        nameEn: "Resource",
        nameUk: "Ресурс",
        nameRu: "Ресурс",
        type: "database",
        url: "https://example.com/" + "x".repeat(2040),
      })
    ).rejects.toThrow();
  });

  it("rejects a keywords array with more than 100 items", async () => {
    const ctx = createUserContext(1, "admin");
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.resources.create({
        nameEn: "Resource",
        nameUk: "Ресурс",
        nameRu: "Ресурс",
        type: "database",
        keywords: Array.from({ length: 101 }, (_, i) => `keyword${i}`),
      })
    ).rejects.toThrow();
  });
});
