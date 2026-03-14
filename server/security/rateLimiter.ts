import { TRPCError } from "@trpc/server";
import type { Request } from "express";
import { SECURITY_CONFIG } from "../config/security";
import { logSecurityEvent } from "../observability/securityLogger";

type Bucket = { timestamps: number[] };

const ipBuckets = new Map<string, Bucket>();
const userBuckets = new Map<string, Bucket>();

function getBucket(map: Map<string, Bucket>, key: string): Bucket {
  const existing = map.get(key);
  if (existing) return existing;
  const bucket = { timestamps: [] };
  map.set(key, bucket);
  return bucket;
}

function consume(
  bucket: Bucket,
  now: number,
  windowMs: number,
  limit: number
): { allowed: boolean; retryAfterSeconds: number } {
  bucket.timestamps = bucket.timestamps.filter(ts => now - ts < windowMs);
  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((windowMs - (now - oldest)) / 1000)
    );
    return { allowed: false, retryAfterSeconds };
  }
  bucket.timestamps.push(now);
  return { allowed: true, retryAfterSeconds: 0 };
}

function getRedisRateLimitConfig():
  | { url: string; token: string }
  | null {
  const url = process.env.REDIS_REST_URL?.trim();
  const token = process.env.REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return { url, token };
}

async function consumeWithRedis(params: {
  bucketKey: string;
  now: number;
  windowMs: number;
  limit: number;
}): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const redis = getRedisRateLimitConfig();
  if (!redis) {
    throw new Error("Redis rate limiter is not configured");
  }

  const slot = Math.floor(params.now / params.windowMs);
  const redisKey = `rl:${params.bucketKey}:${slot}`;
  const ttlSeconds = Math.max(1, Math.ceil(params.windowMs / 1000));
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((params.windowMs - (params.now % params.windowMs)) / 1000)
  );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 500);
  try {
    const response = await fetch(`${redis.url}/pipeline`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${redis.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["EXPIRE", redisKey, String(ttlSeconds)],
      ]),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Redis rate-limit request failed with ${response.status}`);
    }
    const json = (await response.json()) as {
      result?: Array<{ result?: number }>;
    };
    const count = Number(json.result?.[0]?.result ?? 0);
    if (!Number.isFinite(count) || count <= 0) {
      throw new Error("Redis rate-limit response was invalid");
    }
    return {
      allowed: count <= params.limit,
      retryAfterSeconds: count <= params.limit ? 0 : retryAfterSeconds,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function getRequestIp(req: Pick<Request, "ip" | "headers">): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || "unknown";
}

export async function enforceSecurityRateLimit(params: {
  endpoint: string;
  ip: string;
  userId?: number | null;
}): Promise<void> {
  const now = Date.now();
  const { windowMs, ipRequestsPerMinute, userRequestsPerMinute } =
    SECURITY_CONFIG.rateLimit;

  const ipBucketKey = `${params.endpoint}:${params.ip}`;
  let ipResult: { allowed: boolean; retryAfterSeconds: number };
  try {
    ipResult = await consumeWithRedis({
      bucketKey: `ip:${ipBucketKey}`,
      now,
      windowMs,
      limit: ipRequestsPerMinute,
    });
  } catch {
    ipResult = consume(
      getBucket(ipBuckets, ipBucketKey),
      now,
      windowMs,
      ipRequestsPerMinute
    );
  }
  if (!ipResult.allowed) {
    logSecurityEvent({
      endpoint: params.endpoint,
      eventType: "rate_limit_violation",
      userId: params.userId ?? null,
      ip: params.ip,
      details: { scope: "ip", retryAfterSeconds: ipResult.retryAfterSeconds },
    });
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Rate limit exceeded",
    });
  }

  if (params.userId != null) {
    const userBucketKey = `${params.endpoint}:${params.userId}`;
    let userResult: { allowed: boolean; retryAfterSeconds: number };
    try {
      userResult = await consumeWithRedis({
        bucketKey: `user:${userBucketKey}`,
        now,
        windowMs,
        limit: userRequestsPerMinute,
      });
    } catch {
      userResult = consume(
        getBucket(userBuckets, userBucketKey),
        now,
        windowMs,
        userRequestsPerMinute
      );
    }
    if (!userResult.allowed) {
      logSecurityEvent({
        endpoint: params.endpoint,
        eventType: "rate_limit_violation",
        userId: params.userId,
        ip: params.ip,
        details: {
          scope: "user",
          retryAfterSeconds: userResult.retryAfterSeconds,
        },
      });
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Rate limit exceeded",
      });
    }
  }
}

export function clearSecurityRateLimitBuckets(): void {
  ipBuckets.clear();
  userBuckets.clear();
}
