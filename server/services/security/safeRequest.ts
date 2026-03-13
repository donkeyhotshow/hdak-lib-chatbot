import { SECURITY_CONFIG } from "../../config/security";

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

export function validateExternalUrl(
  rawUrl: string,
  options?: { allowPrivateHosts?: boolean }
): URL {
  const parsed = new URL(rawUrl);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http/https URLs are allowed");
  }
  if (!options?.allowPrivateHosts) {
    const hostname = parsed.hostname.trim();
    if (PRIVATE_HOST_PATTERNS.some(pattern => pattern.test(hostname))) {
      throw new Error("Private or loopback hosts are not allowed");
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

  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(validated.toString(), {
        ...init,
        signal: controller.signal,
      });
    } catch (error) {
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
