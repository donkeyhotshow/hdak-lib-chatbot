import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RedisRateLimitConfig = { url: string; token: string };

export function getRateLimitPrefix(
  env: NodeJS.ProcessEnv = process.env
): string {
  return `hdak-chatbot:${env.VERCEL_ENV || env.NODE_ENV || "development"}`;
}

export function getRedisRateLimitConfig(
  env: NodeJS.ProcessEnv = process.env
): RedisRateLimitConfig | null {
  const url = env.UPSTASH_REDIS_REST_URL?.trim() || env.KV_REST_API_URL?.trim();
  const token =
    env.UPSTASH_REDIS_REST_TOKEN?.trim() || env.KV_REST_API_TOKEN?.trim();

  return url && token ? { url, token } : null;
}

const redisConfig = getRedisRateLimitConfig();
const sharedRedis = redisConfig ? new Redis(redisConfig) : null;
const upstashLimiter = sharedRedis
  ? new Ratelimit({
      redis: sharedRedis,
      limiter: Ratelimit.slidingWindow(15, "60 s"),
      analytics: true,
      prefix: getRateLimitPrefix(),
    })
  : null;

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
export async function applySharedRateLimit(
  limiter: { limit: (key: string) => Promise<{ success: boolean }> },
  key: string
): Promise<boolean> {
  try {
    const { success } = await limiter.limit(key);
    return success;
  } catch {
    // Fail closed: a shared-store outage must never disable production limits.
    return false;
  }
}

export async function checkRateLimitStore(): Promise<boolean> {
  if (!sharedRedis) return false;

  try {
    return (await sharedRedis.ping()) === "PONG";
  } catch {
    return false;
  }
}

export async function checkRateLimit(key: string): Promise<boolean> {
  if (upstashLimiter) return applySharedRateLimit(upstashLimiter, key);

  // Production must never fall back to per-instance state or allow unbounded use.
  if (process.env.NODE_ENV === "production") return false;

  return checkRateLimitMemory(key, 15, 60_000);
}

export function rateLimitResponse(message: string): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 429, headers: { "Retry-After": "60" } }
  );
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
