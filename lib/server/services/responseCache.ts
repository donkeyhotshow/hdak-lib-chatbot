import { normalizeLibraryKnowledgeQuery } from "./libraryKnowledge";

export type CacheableResponseType =
  | "instant"
  | "catalog"
  | "knowledge-fallback";

export type CachedResponse = {
  text: string;
  sourceBadge: "quick" | "catalog" | "official-rule" | "generated";
  responseType: CacheableResponseType;
  createdAt: number;
  expiresAt: number;
};

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, CachedResponse>();

export function normalizeResponseCacheQuery(query: string): string {
  return normalizeLibraryKnowledgeQuery(query);
}

export function buildResponseCacheKey(params: {
  query: string;
  language: "uk" | "en" | "ru";
  responseType: CacheableResponseType;
}): string {
  return `${params.language}:${params.responseType}:${normalizeResponseCacheQuery(params.query)}`;
}

export function isSafeCacheableResponseType(
  responseType: string
): responseType is CacheableResponseType {
  return (
    responseType === "instant" ||
    responseType === "catalog" ||
    responseType === "knowledge-fallback"
  );
}

export function getCachedResponse(
  key: string,
  now = Date.now()
): CachedResponse | null {
  const cached = cache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= now) {
    cache.delete(key);
    return null;
  }
  return cached;
}

export function setCachedResponse(
  key: string,
  response: Omit<CachedResponse, "createdAt" | "expiresAt">,
  ttlMs = DEFAULT_TTL_MS,
  now = Date.now()
) {
  cache.set(key, {
    ...response,
    createdAt: now,
    expiresAt: now + ttlMs,
  });
}

export function clearResponseCache() {
  cache.clear();
}
