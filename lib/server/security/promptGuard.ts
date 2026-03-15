import { SECURITY_CONFIG } from "../config/security";
import { logSecurityEvent } from "../observability/securityLogger";

const MAX_REASON_PREVIEW_CHARS = 120;
const MAX_HTML_STRIP_PASSES = 5;

export type PromptGuardResult = {
  flagged: boolean;
  sanitizedPrompt: string;
  reasons: string[];
  fallbackResponse?: string;
};

export function guardPrompt(
  prompt: string,
  context: { endpoint: string; userId?: number | null; ip?: string | null }
): PromptGuardResult {
  let sanitized = prompt;
  let previous: string;
  let pass = 0;
  do {
    previous = sanitized;
    sanitized = sanitized.replace(/<[^>]*>/g, "");
    pass++;
  } while (sanitized !== previous && pass < MAX_HTML_STRIP_PASSES);

  const reasons: string[] = [];
  const filtered = sanitized.split("\n").filter(line => {
    const matched = SECURITY_CONFIG.promptInjection.patterns.some(pattern =>
      pattern.test(line)
    );
    if (matched) {
      reasons.push(line.slice(0, MAX_REASON_PREVIEW_CHARS));
    }
    return !matched;
  });

  sanitized = filtered.join("\n").trim();
  const flagged = reasons.length > 0;

  if (flagged) {
    logSecurityEvent({
      endpoint: context.endpoint,
      eventType: "prompt_injection",
      userId: context.userId ?? null,
      ip: context.ip ?? null,
      details: { reasons },
    });
  }

  return {
    flagged,
    sanitizedPrompt: sanitized,
    reasons,
    fallbackResponse: flagged
      ? SECURITY_CONFIG.promptInjection.safeFallbackResponse
      : undefined,
  };
}
