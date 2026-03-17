import { describe, expect, it } from "vitest";

import type { ChatAnalyticsEvent } from "./chatAnalytics";
import { buildChatAnalyticsSummary } from "./chatAnalyticsSummary";

function event(
  partial: Omit<ChatAnalyticsEvent, "timestamp"> & { timestamp?: string }
): ChatAnalyticsEvent {
  return {
    timestamp: partial.timestamp ?? "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("chatAnalyticsSummary", () => {
  it("aggregates intent, cache, feedback, and uncovered query stats", () => {
    const summary = buildChatAnalyticsSummary([
      event({
        name: "instant_answer_hit",
        mode: "guest",
        sourceBadge: "quick",
        metadata: { query: "де каталог" },
      }),
      event({
        name: "catalog_intent_hit",
        mode: "guest",
        sourceBadge: "catalog",
        metadata: { query: "де каталог" },
      }),
      event({
        name: "knowledge_fallback_hit",
        mode: "auth",
        sourceBadge: "generated",
        metadata: { query: "правила бібліотеки" },
      }),
      event({
        name: "llm_fallback_used",
        mode: "auth",
        sourceBadge: "llm-fallback",
        metadata: { query: "рідкісний запит" },
      }),
      event({
        name: "llm_safe_fallback_used",
        mode: "guest",
        sourceBadge: "llm-fallback",
        metadata: { query: "рідкісний запит" },
      }),
      event({
        name: "cache_hit",
        mode: "guest",
        metadata: { query: "де каталог" },
      }),
      event({
        name: "cache_miss",
        mode: "guest",
        metadata: { query: "правила бібліотеки" },
      }),
      event({
        name: "feedback_submitted",
        mode: "guest",
        sourceBadge: "catalog",
        metadata: {
          query: "де каталог",
          responseId: "r1",
          feedbackValue: "up",
        },
      }),
      event({
        name: "feedback_submitted",
        mode: "auth",
        sourceBadge: "llm-fallback",
        metadata: {
          query: "рідкісний запит",
          responseId: "r2",
          feedbackValue: "down",
        },
      }),
    ]);

    expect(summary.totalEvents).toBe(9);
    expect(summary.intents.instantAnswers).toBe(1);
    expect(summary.intents.catalogIntent).toBe(1);
    expect(summary.intents.knowledgeFallback).toBe(1);
    expect(summary.intents.llmFallback).toBe(1);
    expect(summary.intents.safeFallback).toBe(1);
    expect(summary.cache).toMatchObject({
      hit: 1,
      miss: 1,
      hitRatePercent: 50,
    });
    expect(summary.feedback).toMatchObject({
      useful: 1,
      notUseful: 1,
    });
    expect(summary.feedback.bySourceBadge.catalog.useful).toBe(1);
    expect(summary.feedback.bySourceBadge["llm-fallback"].notUseful).toBe(1);
    expect(summary.feedback.negativeResponses[0]).toMatchObject({
      responseId: "r2",
      query: "рідкісний запит",
    });
    expect(summary.uncoveredTopQueries[0]).toMatchObject({
      query: "рідкісний запит",
      count: 1,
    });
    expect(summary.topQueries[0]).toMatchObject({
      query: "де каталог",
      count: 4,
    });
  });
});
