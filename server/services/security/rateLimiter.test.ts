import { TRPCError } from "@trpc/server";
import { afterEach, describe, expect, it } from "vitest";
import {
  clearSecurityRateLimitBuckets,
  enforceSecurityRateLimit,
  getRequestIp,
} from "./rateLimiter";

describe("security rate limiter", () => {
  afterEach(() => {
    clearSecurityRateLimitBuckets();
  });

  it("extracts request IP from x-forwarded-for", () => {
    const ip = getRequestIp({
      ip: "::1",
      headers: { "x-forwarded-for": "8.8.8.8, 1.1.1.1" },
    } as any);
    expect(ip).toBe("8.8.8.8");
  });

  it("allows requests under limits", async () => {
    for (let i = 0; i < 10; i++) {
      await enforceSecurityRateLimit({
        endpoint: "trpc.conversations",
        ip: "2.2.2.2",
        userId: 1,
      });
    }
  });

  it("throws when per-user limit is exceeded", async () => {
    for (let i = 0; i < 20; i++) {
      await enforceSecurityRateLimit({
        endpoint: "trpc.conversations",
        ip: "3.3.3.3",
        userId: 42,
      });
    }
    await expect(() =>
      enforceSecurityRateLimit({
        endpoint: "trpc.conversations",
        ip: "3.3.3.3",
        userId: 42,
      })
    ).rejects.toThrow(TRPCError);
  });
});
