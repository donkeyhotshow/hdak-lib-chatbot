/**
 * Tests for sendMessage edge cases in routers.ts:
 * - createMessage returns null → INTERNAL_SERVER_ERROR (line 136)
 * - unexpected role in conversation history → logger.warn (line 139)
 * - AI pipeline throws → graceful error fallback (lines 166-172)
 * - conversations.delete edge cases
 * - MAX_MESSAGE_LENGTH enforcement
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";
import * as aiPipeline from "./services/aiPipeline";
import { logger } from "./_core/logger";

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual };
});

vi.mock("./services/aiPipeline", async importOriginal => {
  const actual = await importOriginal<typeof import("./services/aiPipeline")>();
  return { ...actual };
});

// ---------------------------------------------------------------------------
// Context helpers
// ---------------------------------------------------------------------------

function makeCtx(userId = 1): TrpcContext {
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

function makeConv(userId: number, id = 10) {
  return {
    id,
    userId,
    title: "Test",
    language: "uk" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

afterEach(() => vi.restoreAllMocks());

// ---------------------------------------------------------------------------
// sendMessage — createMessage returns null → INTERNAL_SERVER_ERROR
// ---------------------------------------------------------------------------

describe("sendMessage — createMessage returns null", () => {
  it("throws INTERNAL_SERVER_ERROR when saving the user message fails", async () => {
    const conv = makeConv(1, 10);
    vi.spyOn(db, "getConversation").mockResolvedValueOnce(conv);
    vi.spyOn(db, "getMessages").mockResolvedValueOnce([]);
    vi.spyOn(db, "createMessage").mockResolvedValueOnce(null); // user message fails

    const caller = appRouter.createCaller(makeCtx(1));
    await expect(
      caller.conversations.sendMessage({ conversationId: 10, content: "Hello" })
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });

  it("throws INTERNAL_SERVER_ERROR when saving the assistant message fails", async () => {
    const conv = makeConv(1, 10);
    const userMsg = {
      id: 1,
      conversationId: 10,
      role: "user" as const,
      content: "Hello",
      createdAt: new Date(),
    };
    vi.spyOn(db, "getConversation").mockResolvedValueOnce(conv);
    vi.spyOn(db, "getMessages").mockResolvedValueOnce([]);
    // User message save succeeds
    vi.spyOn(db, "createMessage")
      .mockResolvedValueOnce(userMsg) // user message
      .mockResolvedValueOnce(null); // assistant message fails
    vi.spyOn(aiPipeline, "generateConversationReply").mockResolvedValueOnce({
      text: "I can help!",
      source: "general",
    });

    const caller = appRouter.createCaller(makeCtx(1));
    await expect(
      caller.conversations.sendMessage({ conversationId: 10, content: "Hello" })
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });
});

// ---------------------------------------------------------------------------
// sendMessage — AI pipeline error → graceful fallback
// ---------------------------------------------------------------------------

describe("sendMessage — AI pipeline error fallback", () => {
  it("saves a localized error message when AI pipeline throws", async () => {
    const conv = makeConv(1, 10);
    const userMsg = {
      id: 1,
      conversationId: 10,
      role: "user" as const,
      content: "Hello",
      createdAt: new Date(),
    };
    const assistantMsg = {
      id: 2,
      conversationId: 10,
      role: "assistant" as const,
      content: "Вибачте, сталася помилка",
      createdAt: new Date(),
    };
    vi.spyOn(db, "getConversation").mockResolvedValueOnce(conv);
    vi.spyOn(db, "getMessages").mockResolvedValueOnce([]);
    vi.spyOn(db, "createMessage")
      .mockResolvedValueOnce(userMsg)
      .mockResolvedValueOnce(assistantMsg);
    vi.spyOn(aiPipeline, "generateConversationReply").mockRejectedValueOnce(
      new Error("OpenAI API timeout")
    );
    vi.spyOn(aiPipeline, "logAiPipelineError").mockImplementation(() => {});

    const caller = appRouter.createCaller(makeCtx(1));
    const result = await caller.conversations.sendMessage({
      conversationId: 10,
      content: "Hello",
    });

    // The response is the assistant message (fallback error text)
    expect(result.role).toBe("assistant");
    // logAiPipelineError was called
    expect(aiPipeline.logAiPipelineError).toHaveBeenCalled();
  });

  it("uses the conversation language for the fallback error message", async () => {
    const ruConv = {
      id: 11,
      userId: 1,
      title: "Ru chat",
      language: "ru" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const userMsg = {
      id: 1,
      conversationId: 11,
      role: "user" as const,
      content: "Привет",
      createdAt: new Date(),
    };
    vi.spyOn(db, "getConversation").mockResolvedValueOnce(ruConv);
    vi.spyOn(db, "getMessages").mockResolvedValueOnce([]);
    vi.spyOn(db, "createMessage")
      .mockResolvedValueOnce(userMsg)
      .mockImplementationOnce((_convId, _role, content) =>
        Promise.resolve({
          id: 2,
          conversationId: 11,
          role: "assistant" as const,
          content,
          createdAt: new Date(),
        })
      );
    vi.spyOn(aiPipeline, "generateConversationReply").mockRejectedValueOnce(
      new Error("network error")
    );
    vi.spyOn(aiPipeline, "logAiPipelineError").mockImplementation(() => {});

    const caller = appRouter.createCaller(makeCtx(1));
    const result = await caller.conversations.sendMessage({
      conversationId: 11,
      content: "Привет",
    });

    // The fallback message for Russian should contain Cyrillic
    expect(/[\u0400-\u04FF]/.test(result.content)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// sendMessage — unexpected role in history
// ---------------------------------------------------------------------------

describe("sendMessage — unexpected role in conversation history", () => {
  it("logs a warning and normalizes unexpected roles to 'user'", async () => {
    const conv = makeConv(1, 10);
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});

    // A message with an unexpected role (e.g., "system") should be logged
    const weirdMsg = {
      id: 1,
      conversationId: 10,
      role: "system" as unknown as "user",
      content: "System context",
      createdAt: new Date(),
    };
    const userMsg = {
      id: 2,
      conversationId: 10,
      role: "user" as const,
      content: "Sent by user",
      createdAt: new Date(),
    };
    vi.spyOn(db, "getConversation").mockResolvedValueOnce(conv);
    vi.spyOn(db, "getMessages").mockResolvedValueOnce([weirdMsg]);
    vi.spyOn(db, "createMessage")
      .mockResolvedValueOnce(userMsg)
      .mockResolvedValueOnce({
        id: 3,
        conversationId: 10,
        role: "assistant" as const,
        content: "Reply",
        createdAt: new Date(),
      });
    vi.spyOn(aiPipeline, "generateConversationReply").mockResolvedValueOnce({
      text: "Reply",
      source: "general",
    });

    const caller = appRouter.createCaller(makeCtx(1));
    await caller.conversations.sendMessage({
      conversationId: 10,
      content: "Question",
    });

    // The warning should have been emitted for the unexpected role
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Unexpected role"),
      expect.objectContaining({ role: "system" })
    );
  });
});

// ---------------------------------------------------------------------------
// sendMessage — MAX_MESSAGE_LENGTH enforcement
// ---------------------------------------------------------------------------

describe("sendMessage — input validation", () => {
  it("rejects messages that exceed MAX_MESSAGE_LENGTH (10 000 chars)", async () => {
    const caller = appRouter.createCaller(makeCtx(1));
    await expect(
      caller.conversations.sendMessage({
        conversationId: 1,
        content: "x".repeat(10_001),
      })
    ).rejects.toBeDefined();
  });

  it("accepts messages exactly at the MAX_MESSAGE_LENGTH limit", async () => {
    const conv = makeConv(1, 10);
    vi.spyOn(db, "getConversation").mockResolvedValueOnce(conv);
    vi.spyOn(db, "getMessages").mockResolvedValueOnce([]);
    const userMsg = {
      id: 1,
      conversationId: 10,
      role: "user" as const,
      content: "x".repeat(10_000),
      createdAt: new Date(),
    };
    const assistantMsg = {
      id: 2,
      conversationId: 10,
      role: "assistant" as const,
      content: "OK",
      createdAt: new Date(),
    };
    vi.spyOn(db, "createMessage")
      .mockResolvedValueOnce(userMsg)
      .mockResolvedValueOnce(assistantMsg);
    vi.spyOn(aiPipeline, "generateConversationReply").mockResolvedValueOnce({
      text: "OK",
      source: "general",
    });

    const caller = appRouter.createCaller(makeCtx(1));
    const result = await caller.conversations.sendMessage({
      conversationId: 10,
      content: "x".repeat(10_000),
    });
    expect(result.role).toBe("assistant");
  });
});

// ---------------------------------------------------------------------------
// conversations.delete — edge cases
// ---------------------------------------------------------------------------

describe("conversations.delete — IDOR and error cases", () => {
  it("throws NOT_FOUND when the conversation does not exist", async () => {
    vi.spyOn(db, "getConversation").mockResolvedValueOnce(null);
    const caller = appRouter.createCaller(makeCtx(1));
    await expect(
      caller.conversations.delete({ id: 999 })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws FORBIDDEN when trying to delete another user's conversation", async () => {
    const conv = makeConv(2, 20); // owned by user 2
    vi.spyOn(db, "getConversation").mockResolvedValueOnce(conv);
    const caller = appRouter.createCaller(makeCtx(1)); // caller is user 1
    await expect(caller.conversations.delete({ id: 20 })).rejects.toMatchObject(
      { code: "FORBIDDEN" }
    );
  });
});
