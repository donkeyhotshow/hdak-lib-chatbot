export const SECURITY_CONFIG = {
  promptInjection: {
    patterns: [
      /ignore\s+(previous|all|prior)\s+(instructions?|prompts?|rules?|context)/i,
      /disregard\s+(previous|all|prior|everything|the\s+above)/i,
      /forget\s+(everything|all|the\s+above|your\s+instructions)/i,
      /reveal\s+(the\s+)?(system|hidden)\s+prompt/i,
      /call\s+tool/i,
      /execute\s+command/i,
      /override\s+(system|instructions?)/i,
      /\[SYSTEM\]/i,
      /\[INST\]/i,
      /###\s*(instruction|system|prompt)/i,
    ],
    safeFallbackResponse:
      "I can help with library questions, but I can’t follow unsafe meta-instructions.",
  },
  toolSandbox: {
    allowedTools: [
      "searchLibraryResources",
      "getCatalogSearchLink",
      "findUpcomingLibraryEvents",
      "imageGeneration",
      "voiceTranscription",
    ] as const,
    executionTimeoutMs: 5_000,
    maxOutputChars: 100_000,
    maxCallsPerRequest: 5,
  },
  tokenLimits: {
    maxPromptTokens: 8_000,
    maxResponseTokens: 2_000,
    maxHistoryMessages: 50,
    maxMessageChars: 10_000,
    conversationContextHistory: 10,
  },
  rateLimit: {
    userRequestsPerMinute: 20,
    ipRequestsPerMinute: 60,
    windowMs: 60_000,
  },
  responseLimits: {
    maxResponseLength: 50_000,
  },
  externalRequests: {
    timeoutMs: 5_000,
    maxRetries: 2,
  },
  chat: {
    timeoutMs: 30_000,
  },
} as const;

export type AllowedToolName =
  (typeof SECURITY_CONFIG.toolSandbox.allowedTools)[number];
