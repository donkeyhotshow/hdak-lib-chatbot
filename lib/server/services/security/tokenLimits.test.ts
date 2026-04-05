import { describe, expect, it } from "vitest";
import {
  estimateTokens,
  trimHistoryMessages,
  trimPromptToTokenLimit,
  trimResponseLength,
} from "./tokenLimits";

describe("tokenLimits", () => {
  it("estimates tokens from content length", () => {
    expect(estimateTokens("1234")).toBe(1);
    expect(estimateTokens("12345")).toBe(2);
  });

  it("trims prompt over token limit", () => {
    const longPrompt = "x".repeat(40_000);
    const trimmed = trimPromptToTokenLimit(longPrompt, {
      endpoint: "test",
      userId: 1,
      ip: "1.1.1.1",
    });
    expect(trimmed.length).toBeLessThan(longPrompt.length);
  });

  it("trims history to max message count", () => {
    const history = Array.from({ length: 70 }, (_, i) => ({
      role: (i % 2 ? "assistant" : "user") as const,
      content: `message-${i}`,
    }));
    const trimmed = trimHistoryMessages(history, {
      endpoint: "test",
      userId: 1,
      ip: "1.1.1.1",
    });
    expect(trimmed.length).toBe(30);
    expect(trimmed[0]?.content).toBe("message-40");
  });

  it("trims oversized responses", () => {
    const oversized = "A".repeat(50_100);
    const trimmed = trimResponseLength(oversized, {
      endpoint: "test",
      userId: 1,
      ip: "1.1.1.1",
    });
    expect(trimmed.length).toBeLessThan(oversized.length);
  });
});
