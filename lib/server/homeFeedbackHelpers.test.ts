import { describe, expect, it } from "vitest";

import {
  appendFeedbackPayload,
  appendTelemetryEvent,
  createFeedbackPayload,
} from "../pages/homeFeedback";

describe("homeFeedback helpers", () => {
  it("creates feedback payload with required shape", () => {
    const payload = createFeedbackPayload({
      responseId: "resp-1",
      sourceBadge: "catalog",
      userQuery: "де каталог",
      feedbackValue: "up",
      guestId: "guest-1",
      conversationId: null,
    });
    expect(payload).toMatchObject({
      responseId: "resp-1",
      sourceBadge: "catalog",
      feedbackValue: "up",
      userQuery: "де каталог",
      guestId: "guest-1",
      conversationId: null,
    });
    expect(typeof payload.timestamp).toBe("string");
  });

  it("replaces feedback by response id and appends telemetry event", () => {
    const first = createFeedbackPayload({
      responseId: "resp-1",
      sourceBadge: "quick",
      userQuery: "q",
      feedbackValue: "up",
    });
    const second = createFeedbackPayload({
      responseId: "resp-1",
      sourceBadge: "quick",
      userQuery: "q",
      feedbackValue: "down",
    });
    const feedback = appendFeedbackPayload([first], second);
    expect(feedback).toHaveLength(1);
    expect(feedback[0].feedbackValue).toBe("down");

    const events = appendTelemetryEvent([], {
      name: "feedback_submitted",
      timestamp: new Date().toISOString(),
      mode: "guest",
      sourceBadge: "quick",
      responseLatency: "instant",
    });
    expect(events).toHaveLength(1);
    expect(events[0].name).toBe("feedback_submitted");
  });
});
