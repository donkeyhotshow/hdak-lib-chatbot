import { logger } from "../_core/logger";

export type ChatMode = "guest" | "auth";
export type ChatLatencyBucket = "instant" | "streamed";
export type ChatSourceBadge =
  | "quick"
  | "catalog"
  | "official-rule"
  | "generated"
  | "llm-fallback"
  | "unknown";

export type ChatAnalyticsEventName =
  | "instant_answer_hit"
  | "catalog_intent_hit"
  | "knowledge_fallback_hit"
  | "llm_fallback_used"
  | "llm_safe_fallback_used"
  | "cache_hit"
  | "cache_miss"
  | "feedback_submitted";

export type ChatAnalyticsEvent = {
  name: ChatAnalyticsEventName;
  timestamp: string;
  mode: ChatMode;
  sourceBadge?: ChatSourceBadge;
  latencyBucket?: ChatLatencyBucket;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

const MAX_EVENTS = 500;
const events: ChatAnalyticsEvent[] = [];

export function emitChatAnalyticsEvent(
  event: Omit<ChatAnalyticsEvent, "timestamp">
) {
  const nextEvent: ChatAnalyticsEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };
  events.push(nextEvent);
  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS);
  }
  logger.debug("[chatAnalytics] event", nextEvent);
}

export function listChatAnalyticsEvents(): ChatAnalyticsEvent[] {
  return [...events];
}

export function clearChatAnalyticsEvents() {
  events.length = 0;
}
