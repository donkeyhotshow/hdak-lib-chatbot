import { describe, expect, it } from "vitest";

import {
  buildResponseCacheKey,
  clearResponseCache,
  getCachedResponse,
  isSafeCacheableResponseType,
  normalizeResponseCacheQuery,
  setCachedResponse,
} from "./responseCache";

describe("responseCache", () => {
  it("normalizes cache keys consistently", () => {
    expect(normalizeResponseCacheQuery("  Де   ЕЛЕКТРОННИЙ-каталог?!  ")).toBe(
      "де електронний каталог"
    );
  });

  it("returns miss then hit for cached response", () => {
    clearResponseCache();
    const key = buildResponseCacheKey({
      query: "де електронний каталог",
      language: "uk",
      responseType: "catalog",
    });
    expect(getCachedResponse(key)).toBeNull();
    setCachedResponse(key, {
      text: "ok",
      sourceBadge: "catalog",
      responseType: "catalog",
    });
    expect(getCachedResponse(key)?.text).toBe("ok");
  });

  it("caches only allowed response types", () => {
    expect(isSafeCacheableResponseType("instant")).toBe(true);
    expect(isSafeCacheableResponseType("catalog")).toBe(true);
    expect(isSafeCacheableResponseType("knowledge-fallback")).toBe(true);
    expect(isSafeCacheableResponseType("llm")).toBe(false);
  });

  it("keeps at most 30 cache entries", () => {
    clearResponseCache();
    for (let i = 0; i < 31; i++) {
      const key = buildResponseCacheKey({
        query: `q-${i}`,
        language: "uk",
        responseType: "instant",
      });
      setCachedResponse(key, {
        text: `response-${i}`,
        sourceBadge: "quick",
        responseType: "instant",
      });
    }
    const oldestKey = buildResponseCacheKey({
      query: "q-0",
      language: "uk",
      responseType: "instant",
    });
    const newestKey = buildResponseCacheKey({
      query: "q-30",
      language: "uk",
      responseType: "instant",
    });
    expect(getCachedResponse(oldestKey)).toBeNull();
    expect(getCachedResponse(newestKey)?.text).toBe("response-30");
  });
});
