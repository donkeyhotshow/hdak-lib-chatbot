/**
 * Integration tests for the /api/chat Express route (server/_core/chat.ts).
 *
 * These tests exercise the full route handler by spinning up a real
 * (in-process) Express server and making fetch() requests to it.
 * External dependencies (AI SDK, SDK auth, DB) are all mocked so there are
 * no real network calls.
 *
 * Covered previously-uncovered functions in chat.ts:
 *   - createLLMProvider (lines 61-69)
 *   - buildSystemPrompt (lines 245-263)
 *   - registerChatRoutes + the POST handler (lines 264-394)
 *   - findLastUserMessage (lines 26-42)
 */

import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import express from "express";
import * as http from "node:http";
import { registerChatRoutes } from "./chat";

// ---------------------------------------------------------------------------
// Module mocks — must be declared before any module imports are consumed
// ---------------------------------------------------------------------------

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() => ({
    chat: vi.fn(() => "mock-model"),
  })),
}));

vi.mock("./patchedFetch", () => ({
  createPatchedFetch: vi.fn(() => fetch),
}));

vi.mock("./sdk", () => ({
  sdk: {
    authenticateRequest: vi.fn(),
  },
}));

vi.mock("../db", async importOriginal => {
  const actual = await importOriginal<typeof import("../db")>();
  return { ...actual };
});

vi.mock("ai", async importOriginal => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual,
    // Replace streamText so we don't make real LLM calls
    streamText: vi.fn(() => ({
      pipeUIMessageStreamToResponse: vi.fn(
        (res: import("express").Response) => {
          res.status(200).end("data: done\n\n");
        }
      ),
    })),
    // tool() must return its first arg for the tools object to be defined correctly
    tool: vi.fn((config: unknown) => config),
    stepCountIs: vi.fn(() => () => false),
  };
});

// ---------------------------------------------------------------------------
// Server lifecycle
// ---------------------------------------------------------------------------

let server: http.Server;
let baseUrl: string;

beforeAll(() => {
  const app = express();
  app.use(express.json());
  registerChatRoutes(app);

  server = app.listen(0);
  const addr = server.address() as { port: number };
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(() => {
  server.close();
});

afterEach(() => vi.restoreAllMocks());

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function post(body: unknown) {
  return fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("/api/chat — input validation", () => {
  it("returns 400 for a request with no messages array", async () => {
    const res = await post({ messages: [] });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("returns 400 for a message with an empty content string", async () => {
    const res = await post({ messages: [{ role: "user", content: "" }] });
    expect(res.status).toBe(400);
  });

  it("returns 400 for a message with an invalid role", async () => {
    const res = await post({ messages: [{ role: "system", content: "hi" }] });
    expect(res.status).toBe(400);
  });

  it("returns 413 when a message content exceeds MAX_CHAT_MESSAGE_LENGTH", async () => {
    const res = await post({
      messages: [{ role: "user", content: "x".repeat(10_001) }],
    });
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error).toContain("large");
  });
});

describe("/api/chat — successful streaming response", () => {
  it("returns 200 for a valid message", async () => {
    const res = await post({
      messages: [{ role: "user", content: "What databases does HDAK have?" }],
    });
    expect(res.status).toBe(200);
  });

  it("returns 200 with an explicit language override", async () => {
    const res = await post({
      messages: [{ role: "user", content: "Привіт" }],
      language: "uk",
    });
    expect(res.status).toBe(200);
  });

  it("auto-detects language from the last user message when no language is given", async () => {
    const res = await post({
      messages: [
        { role: "user", content: "Hello, what resources do you have?" },
      ],
    });
    expect(res.status).toBe(200);
  });
});

describe("/api/chat — conversationId access control", () => {
  it("returns 401 when conversationId is provided without authentication", async () => {
    const res = await post({
      messages: [{ role: "user", content: "Hello" }],
      conversationId: 42,
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 when conversation does not belong to authenticated user", async () => {
    const { sdk } = await import("./sdk");
    vi.mocked(sdk.authenticateRequest).mockResolvedValueOnce({
      id: 1,
    } as any);

    const dbModule = await import("../db");
    vi.spyOn(dbModule, "getConversation").mockResolvedValueOnce({
      id: 42,
      userId: 999,
      title: "Test",
      language: "uk",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await post({
      messages: [{ role: "user", content: "Hello" }],
      conversationId: 42,
    });
    expect(res.status).toBe(403);
  });

  it("accepts conversationId for authenticated owner", async () => {
    const { sdk } = await import("./sdk");
    vi.mocked(sdk.authenticateRequest).mockResolvedValueOnce({
      id: 1,
    } as any);

    const dbModule = await import("../db");
    vi.spyOn(dbModule, "getConversation").mockResolvedValueOnce({
      id: 42,
      userId: 1,
      title: "Test",
      language: "uk",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await post({
      messages: [{ role: "user", content: "Hello" }],
      conversationId: 42,
    });
    expect(res.status).toBe(200);
  });
});
