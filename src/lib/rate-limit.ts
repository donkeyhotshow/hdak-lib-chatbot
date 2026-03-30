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

// Purge expired entries every 5 minutes to prevent memory leak
let _lastPurge = Date.now();
function maybePurge(windowMs: number) {
  const now = Date.now();
  if (now - _lastPurge < 5 * 60_000) return;
  _lastPurge = now;
  for (const [key, info] of rateLimits.entries()) {
    if (now - info.lastReset > windowMs) rateLimits.delete(key);
  }
}

function checkRateLimitMemory(key: string, limit: number, windowMs: number): boolean {
  maybePurge(windowMs);
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
  const ip = (req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
  const ua = req.headers.get("user-agent") || "";
  const lang = req.headers.get("accept-language") || "";
  const enc = req.headers.get("accept-encoding") || "";
  // Combine multiple signals for stronger fingerprint
  return `${ip}|${ua.substring(0, 80)}|${lang.substring(0, 20)}|${enc.substring(0, 20)}`;
}
