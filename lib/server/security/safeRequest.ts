import { SECURITY_CONFIG } from "../config/security";

const PRIVATE_HOST_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^\[?::1\]?$/i,
  /^0\.0\.0\.0$/,
];

type CircuitBreakerState = {
  failures: number;
  openedUntil: number | null;
};

const circuitBreakerStateByHost = new Map<string, CircuitBreakerState>();

function getCircuitBreakerState(hostname: string): CircuitBreakerState {
  const existing = circuitBreakerStateByHost.get(hostname);
  if (existing) return existing;
  const next = { failures: 0, openedUntil: null };
  circuitBreakerStateByHost.set(hostname, next);
  return next;
}

function assertCircuitBreakerClosed(hostname: string, now: number) {
  const state = getCircuitBreakerState(hostname);
  if (state.openedUntil !== null && state.openedUntil > now) {
    throw new Error("External request circuit breaker is open");
  }
  if (state.openedUntil !== null && state.openedUntil <= now) {
    state.openedUntil = null;
    state.failures = 0;
  }
}

function registerCircuitBreakerSuccess(hostname: string) {
  const state = getCircuitBreakerState(hostname);
  state.failures = 0;
  state.openedUntil = null;
}

function registerCircuitBreakerFailure(hostname: string, now: number) {
  const state = getCircuitBreakerState(hostname);
  state.failures += 1;
  if (state.failures >= SECURITY_CONFIG.circuitBreaker.failureThreshold) {
    state.openedUntil = now + SECURITY_CONFIG.circuitBreaker.resetTimeoutMs;
  }
}

export function validateExternalUrl(
  rawUrl: string,
  options?: { allowPrivateHosts?: boolean }
): URL {
  if (/[\u0000-\u001F\u007F]/.test(rawUrl)) {
    throw new Error("URL contains control characters");
  }
  const parsed = new URL(rawUrl);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http/https URLs are allowed");
  }
  if (parsed.username || parsed.password) {
    throw new Error("Credentials in URL are not allowed");
  }
  if (/%0d|%0a|%00/i.test(parsed.pathname + parsed.search + parsed.hash)) {
    throw new Error("URL contains forbidden encoded characters");
  }
  if (!options?.allowPrivateHosts) {
    const hostname = parsed.hostname.trim();
    if (PRIVATE_HOST_PATTERNS.some(pattern => pattern.test(hostname))) {
      throw new Error("Private or loopback hosts are not allowed");
    }
    if (
      hostname.length > 253 ||
      hostname
        .split(".")
        .some(
          label =>
            !label ||
            label.length > 63 ||
            label.startsWith("-") ||
            label.endsWith("-")
        )
    ) {
      throw new Error("Invalid hostname");
    }
  }
  return parsed;
}

export async function fetchWithSecurity(
  rawUrl: string,
  init?: RequestInit,
  options?: {
    allowPrivateHosts?: boolean;
    timeoutMs?: number;
    retries?: number;
  }
): Promise<Response> {
  const validated = validateExternalUrl(rawUrl, {
    allowPrivateHosts: options?.allowPrivateHosts,
  });

  const maxAttempts = Math.max(
    1,
    options?.retries ?? SECURITY_CONFIG.externalRequests.maxRetries
  );
  const timeoutMs =
    options?.timeoutMs ?? SECURITY_CONFIG.externalRequests.timeoutMs;
  const targetHost = validated.hostname.toLowerCase();

  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const now = Date.now();
    assertCircuitBreakerClosed(targetHost, now);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(validated.toString(), {
        ...init,
        signal: controller.signal,
      });
      if (!response.ok && response.status >= 500) {
        registerCircuitBreakerFailure(targetHost, now);
      } else if (response.ok) {
        registerCircuitBreakerSuccess(targetHost);
      }
      return response;
    } catch (error) {
      registerCircuitBreakerFailure(targetHost, now);
      lastError = error;
      if (attempt === maxAttempts - 1) break;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("External request failed");
}
