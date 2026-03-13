import { SECURITY_CONFIG } from "../../config/security";
import { logSecurityEvent } from "../observability/securityLogger";

export type ChatHistoryMessage = {
  role: "assistant" | "user";
  content: string;
};

export function estimateTokens(text: string): number {
  // Approximation only: real tokenizers vary by model/language; 4 chars/token
  // is used as a conservative lightweight estimator for guardrail enforcement.
  return Math.ceil(text.length / 4);
}

export function trimPromptToTokenLimit(
  prompt: string,
  context: { endpoint: string; userId?: number | null; ip?: string | null }
): string {
  if (estimateTokens(prompt) <= SECURITY_CONFIG.tokenLimits.maxPromptTokens) {
    return prompt;
  }
  const maxChars = SECURITY_CONFIG.tokenLimits.maxPromptTokens * 4;
  const trimmed = prompt.slice(0, maxChars);
  logSecurityEvent({
    endpoint: context.endpoint,
    eventType: "token_limit_trim",
    userId: context.userId ?? null,
    ip: context.ip ?? null,
    details: {
      target: "prompt",
      originalLength: prompt.length,
      trimmedLength: trimmed.length,
    },
  });
  return trimmed;
}

export function trimHistoryMessages(
  history: ChatHistoryMessage[],
  context: { endpoint: string; userId?: number | null; ip?: string | null }
): ChatHistoryMessage[] {
  if (history.length <= SECURITY_CONFIG.tokenLimits.maxHistoryMessages) {
    return history;
  }
  const trimmed = history.slice(
    -SECURITY_CONFIG.tokenLimits.maxHistoryMessages
  );
  logSecurityEvent({
    endpoint: context.endpoint,
    eventType: "token_limit_trim",
    userId: context.userId ?? null,
    ip: context.ip ?? null,
    details: {
      target: "history",
      originalMessages: history.length,
      trimmedMessages: trimmed.length,
    },
  });
  return trimmed;
}

export function trimResponseLength(
  text: string,
  context: { endpoint: string; userId?: number | null; ip?: string | null }
): string {
  const max = SECURITY_CONFIG.responseLimits.maxResponseLength;
  if (text.length <= max) return text;
  const truncated = `${text.slice(0, max)}…`;
  logSecurityEvent({
    endpoint: context.endpoint,
    eventType: "token_limit_trim",
    userId: context.userId ?? null,
    ip: context.ip ?? null,
    details: {
      target: "response",
      originalLength: text.length,
      trimmedLength: truncated.length,
    },
  });
  return truncated;
}
