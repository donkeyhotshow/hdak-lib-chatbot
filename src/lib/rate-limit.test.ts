import { describe, expect, it } from "vitest";
import {
  applySharedRateLimit,
  getRateLimitPrefix,
  getRedisRateLimitConfig,
  rateLimitResponse,
} from "@/lib/rate-limit";

describe("shared rate limiting", () => {
  it("isolates shared limiter keys by Vercel environment", () => {
    expect(
      getRateLimitPrefix({ VERCEL_ENV: "production" } as NodeJS.ProcessEnv)
    ).toBe("hdak-chatbot:production");
    expect(
      getRateLimitPrefix({ VERCEL_ENV: "preview" } as NodeJS.ProcessEnv)
    ).toBe("hdak-chatbot:preview");
    expect(
      getRateLimitPrefix({ NODE_ENV: "development" } as NodeJS.ProcessEnv)
    ).toBe("hdak-chatbot:development");
  });

  it("supports Upstash and Vercel KV REST environment names", () => {
    expect(
      getRedisRateLimitConfig({
        UPSTASH_REDIS_REST_URL: "https://upstash.example",
        UPSTASH_REDIS_REST_TOKEN: "upstash-token",
        KV_REST_API_URL: "https://kv.example",
        KV_REST_API_TOKEN: "kv-token",
      } as NodeJS.ProcessEnv)
    ).toEqual({ url: "https://upstash.example", token: "upstash-token" });
    expect(
      getRedisRateLimitConfig({
        KV_REST_API_URL: "https://kv.example",
        KV_REST_API_TOKEN: "kv-token",
      } as NodeJS.ProcessEnv)
    ).toEqual({ url: "https://kv.example", token: "kv-token" });
    expect(getRedisRateLimitConfig({} as NodeJS.ProcessEnv)).toBeNull();
  });

  it("denies requests when the shared store fails", async () => {
    const limiter = { limit: async () => Promise.reject(new Error("offline")) };
    await expect(applySharedRateLimit(limiter, "fingerprint")).resolves.toBe(
      false
    );
  });

  it("returns Retry-After on rate-limit responses", async () => {
    const response = rateLimitResponse("rate limited");
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    await expect(response.json()).resolves.toEqual({ error: "rate limited" });
  });
});
