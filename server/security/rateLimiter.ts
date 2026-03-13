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

export function getRequestIp(req: Pick<Request, "ip" | "headers">): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || "unknown";
}

export function enforceSecurityRateLimit(params: {
  endpoint: string;
  ip: string;
  userId?: number | null;
}): void {
  const now = Date.now();
  const { windowMs, ipRequestsPerMinute, userRequestsPerMinute } =
    SECURITY_CONFIG.rateLimit;

  const ipResult = consume(
    getBucket(ipBuckets, `${params.endpoint}:${params.ip}`),
    now,
    windowMs,
    ipRequestsPerMinute
  );
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
    const userResult = consume(
      getBucket(userBuckets, `${params.endpoint}:${params.userId}`),
      now,
      windowMs,
      userRequestsPerMinute
    );
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
