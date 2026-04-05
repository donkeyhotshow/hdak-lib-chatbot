export type ChatFeedbackValue = "up" | "down";

export type ChatFeedbackPayload = {
  responseId: string;
  sourceBadge:
    | "quick"
    | "catalog"
    | "official-rule"
    | "generated"
    | "llm-fallback"
    | "unknown";
  userQuery: string;
  feedbackValue: ChatFeedbackValue;
  timestamp: string;
  conversationId?: number | null;
  guestId?: string | null;
};

export type ChatTelemetryEvent = {
  name:
    | "feedback_submitted"
    | "instant_answer_hit"
    | "catalog_intent_hit"
    | "llm_fallback_used";
  timestamp: string;
  mode: "guest" | "auth";
  sourceBadge?: ChatFeedbackPayload["sourceBadge"];
  responseLatency: "instant" | "streamed";
};

export const FEEDBACK_STORAGE_KEY = "hdak-feedback-v1";
export const CHAT_TELEMETRY_STORAGE_KEY = "hdak-chat-events-v1";

export function createFeedbackPayload(
  input: Omit<ChatFeedbackPayload, "timestamp">
): ChatFeedbackPayload {
  return {
    ...input,
    timestamp: new Date().toISOString(),
  };
}

export function appendFeedbackPayload(
  existing: ChatFeedbackPayload[],
  payload: ChatFeedbackPayload,
  maxEntries = 500
): ChatFeedbackPayload[] {
  const filtered = existing.filter(
    item => item.responseId !== payload.responseId
  );
  const next = [...filtered, payload];
  if (next.length <= maxEntries) return next;
  return next.slice(next.length - maxEntries);
}

export function appendTelemetryEvent(
  existing: ChatTelemetryEvent[],
  event: ChatTelemetryEvent,
  maxEntries = 800
): ChatTelemetryEvent[] {
  const next = [...existing, event];
  if (next.length <= maxEntries) return next;
  return next.slice(next.length - maxEntries);
}
