import { describe, expect, it } from "vitest";

import {
  clearChatAnalyticsEvents,
  emitChatAnalyticsEvent,
  listChatAnalyticsEvents,
} from "./chatAnalytics";

describe("chatAnalytics", () => {
  it("collects structured events in memory", () => {
    clearChatAnalyticsEvents();
    emitChatAnalyticsEvent({
      name: "instant_answer_hit",
      mode: "guest",
      sourceBadge: "quick",
      latencyBucket: "instant",
    });
    const events = listChatAnalyticsEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      name: "instant_answer_hit",
      mode: "guest",
      sourceBadge: "quick",
      latencyBucket: "instant",
    });
    expect(typeof events[0].timestamp).toBe("string");
  });
});
