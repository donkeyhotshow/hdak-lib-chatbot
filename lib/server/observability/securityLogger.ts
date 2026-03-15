import { logger } from "../_core/logger";

type SecurityEventType =
  | "prompt_injection"
  | "tool_execution"
  | "tool_rejected"
  | "tool_timeout"
  | "rate_limit_violation"
  | "token_limit_trim"
  | "auth_failure";

type SecurityEventPayload = {
  endpoint: string;
  eventType: SecurityEventType;
  userId?: number | null;
  ip?: string | null;
  details?: Record<string, unknown>;
};

export function logSecurityEvent(payload: SecurityEventPayload): void {
  logger.warn("[Security]", {
    timestamp: new Date().toISOString(),
    endpoint: payload.endpoint,
    eventType: payload.eventType,
    userId: payload.userId ?? null,
    ip: payload.ip ?? null,
    ...(payload.details ?? {}),
  });
}
