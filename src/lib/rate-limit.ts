import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ---------------------------------------------------------------------------
// Upstash Redis rate limiter (production)
// ---------------------------------------------------------------------------
let upstashLimiter: Ratelimit | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  upstashLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(15, "60 s"),
    analytics: true,
    prefix: "hdak-chatbot",
  });
}

// ---------------------------------------------------------------------------
// In-memory fallback (development / when Upstash is not configured)
// ---------------------------------------------------------------------------
interface RateLimitInfo {
  count: number;
  lastReset: number;
}

const rateLimits = new Map<string, RateLimitInfo>();

function checkRateLimitMemory(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const info = rateLimits.get(key);

  if (!info) {
    rateLimits.set(key, { count: 1, lastReset: now });
    return true;
  }

  if (now - info.lastReset > windowMs) {
    rateLimits.set(key, { count: 1, lastReset: now });
    return true;
  }

  if (info.count >= limit) {
    return false;
  }

  info.count += 1;
  return true;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check if the request should be rate-limited.
 * Uses Upstash Redis in production, falls back to in-memory in development.
 * @returns `true` if the request is allowed, `false` if rate-limited.
 */
export async function checkRateLimit(key: string): Promise<boolean> {
  if (upstashLimiter) {
    const { success } = await upstashLimiter.limit(key);
    return success;
  }

  // Fallback: 15 requests per 60 seconds
  return checkRateLimitMemory(key, 15, 60_000);
}

/**
 * Generate a fingerprint from the request for rate limiting.
 */
export function generateFingerprint(req: Request): string {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const ua = req.headers.get("user-agent") || "unknown";
  return `${ip}-${ua}`;
}
