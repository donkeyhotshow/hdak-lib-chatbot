import { describe, expect, it } from "vitest";
import { chatRequestSchema, MAX_CHAT_MESSAGE_LENGTH } from "./chatController";

describe("chatRequestSchema", () => {
  it("accepts valid chat payload", () => {
    const result = chatRequestSchema.safeParse({
      messages: [{ role: "user", content: "Привіт!" }],
      language: "uk",
      conversationId: 1,
      model: "openrouter/free",
    });

    expect(result.success).toBe(true);
  });

  it("rejects oversized messages", () => {
    const result = chatRequestSchema.safeParse({
      messages: [
        { role: "user", content: "a".repeat(MAX_CHAT_MESSAGE_LENGTH + 1) },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty message arrays", () => {
    const result = chatRequestSchema.safeParse({ messages: [] });
    expect(result.success).toBe(false);
  });
});
