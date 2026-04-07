import { createHash } from "crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ---------------------------------------------------------------------------
// Upstash Redis rate limiter (production)
// ---------------------------------------------------------------------------
let upstashLimiter: Ratelimit | null = null;

if (
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
) {
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
// Uses sliding window to match Upstash behavior.
// ---------------------------------------------------------------------------
interface RateLimitInfo {
  timestamps: number[]; // request timestamps within the current window
}

const rateLimits = new Map<string, RateLimitInfo>();

// Purge expired entries every 5 minutes to prevent memory leak
let _lastPurge = Date.now();
function maybePurge(windowMs: number) {
  const now = Date.now();
  if (now - _lastPurge < 5 * 60_000) return;
  _lastPurge = now;
  for (const [key, info] of rateLimits.entries()) {
    const cutoff = now - windowMs;
    // Remove entries with no recent timestamps
    if (
      info.timestamps.length === 0 ||
      info.timestamps[info.timestamps.length - 1] < cutoff
    ) {
      rateLimits.delete(key);
    }
  }
}

const MAX_RATE_LIMIT_ENTRIES = 10_000;

function checkRateLimitMemory(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;

  // M4: always purge expired entries (respects 5-min cooldown internally)
  maybePurge(windowMs);

  // Guard against unbounded map growth — purge first, then check capacity
  if (rateLimits.size >= MAX_RATE_LIMIT_ENTRIES) {
    // Force purge of expired entries before rejecting
    for (const [k, info] of rateLimits.entries()) {
      if (
        info.timestamps.length === 0 ||
        info.timestamps[info.timestamps.length - 1] < cutoff
      ) {
        rateLimits.delete(k);
      }
    }
    // If still at capacity after purge, reject
    if (!rateLimits.has(key) && rateLimits.size >= MAX_RATE_LIMIT_ENTRIES) {
      return false;
    }
  }

  const info = rateLimits.get(key);

  if (!info) {
    rateLimits.set(key, { timestamps: [now] });
    return true;
  }

  // Sliding window: remove timestamps outside the window
  info.timestamps = info.timestamps.filter(ts => ts > cutoff);

  if (info.timestamps.length >= limit) {
    return false;
  }

  info.timestamps.push(now);
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
  const forwarded = req.headers.get("x-forwarded-for");
  // Use first IP from x-forwarded-for (added by trusted proxy), fall back to other headers
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "nogroup";
  const ua = req.headers.get("user-agent") || "";
  const lang = req.headers.get("accept-language") || "";
  const enc = req.headers.get("accept-encoding") || "";
  // Hash the fingerprint to keep key short and avoid storing raw IP/UA in Redis
  const raw = `${ip}|${ua.substring(0, 80)}|${lang.substring(0, 20)}|${enc.substring(0, 20)}`;
  return createHash("sha256").update(raw).digest("hex").substring(0, 32);
}
