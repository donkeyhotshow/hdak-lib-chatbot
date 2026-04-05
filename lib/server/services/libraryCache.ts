/**
 * Library Data Cache
 *
 * Provides a NodeCache-backed caching layer over the most frequently read
 * library DB queries (resources, contacts, library info).  Cached entries
 * are automatically expired after their respective TTLs, and explicit
 * invalidation helpers are exported so that mutation paths (create / update /
 * delete) can purge stale data immediately.
 *
 * TTLs are intentionally short enough to keep data reasonably fresh while
 * still reducing the DB round-trip count for high-traffic read paths:
 *   resources  — 10 minutes (updated infrequently, queried on every chat turn)
 *   contacts   — 30 minutes (very static)
 *   libraryInfo — 30 minutes (very static)
 *
 * To swap this implementation for Redis or Memcached in the future:
 *   1. Replace NodeCache with an ioredis / memjs client.
 *   2. Serialise / deserialise values with JSON.stringify / JSON.parse.
 *   3. Keep the public API identical so callers need no changes.
 */

import NodeCache from "node-cache";
import type {
  LibraryResource,
  LibraryContact,
  LibraryInfo,
} from "../../../drizzle/schema";
import * as db from "../db";
import { logger } from "../_core/logger";

/** TTL (seconds) for resource entries (all-resources list and search results). */
const RESOURCE_TTL_SECONDS = 10 * 60;

/** TTL (seconds) for contact entries. */
const CONTACT_TTL_SECONDS = 30 * 60;

/** TTL (seconds) for library info entries. */
const INFO_TTL_SECONDS = 30 * 60;

const resourceCache = new NodeCache({
  stdTTL: RESOURCE_TTL_SECONDS,
  checkperiod: 60,
});

const contactCache = new NodeCache({
  stdTTL: CONTACT_TTL_SECONDS,
  checkperiod: 5 * 60,
});

const infoCache = new NodeCache({
  stdTTL: INFO_TTL_SECONDS,
  checkperiod: 5 * 60,
});

// ─── Resources ───────────────────────────────────────────────────────────────

/**
 * Return all library resources, serving from cache when available.
 * The cache entry is keyed as `"all"` and has a 10-minute TTL.
 */
export async function getCachedAllResources(): Promise<LibraryResource[]> {
  const cached = resourceCache.get<LibraryResource[]>("all");
  if (cached !== undefined) {
    logger.debug("[libraryCache] cache hit: getAllResources");
    return cached;
  }
  const resources = await db.getAllResources();
  resourceCache.set("all", resources);
  return resources;
}

/**
 * Search library resources, caching results per unique query string.
 * Cache entries have a 10-minute TTL (inherited from resourceCache default).
 */
export async function getCachedSearchResources(
  query: string
): Promise<LibraryResource[]> {
  const key = `search:${query}`;
  const cached = resourceCache.get<LibraryResource[]>(key);
  if (cached !== undefined) {
    logger.debug("[libraryCache] cache hit: searchResources", { query });
    return cached;
  }
  const results = await db.searchResources(query);
  resourceCache.set(key, results);
  return results;
}

// ─── Contacts ────────────────────────────────────────────────────────────────

/**
 * Return all library contacts, serving from cache when available.
 * Cache entry is keyed as `"all"` with a 30-minute TTL.
 */
export async function getCachedAllContacts(): Promise<LibraryContact[]> {
  const cached = contactCache.get<LibraryContact[]>("all");
  if (cached !== undefined) {
    logger.debug("[libraryCache] cache hit: getAllContacts");
    return cached;
  }
  const contacts = await db.getAllContacts();
  contactCache.set("all", contacts);
  return contacts;
}

// ─── Library Info ─────────────────────────────────────────────────────────────

/**
 * Return library info for a given key, serving from cache when available.
 * Cache entry is keyed as `info:<key>` with a 30-minute TTL.
 */
export async function getCachedLibraryInfo(
  key: string
): Promise<LibraryInfo | null> {
  const cacheKey = `info:${key}`;
  const hit = infoCache.get<LibraryInfo | null>(cacheKey);
  if (hit !== undefined) {
    logger.debug("[libraryCache] cache hit: getLibraryInfo", { key });
    return hit;
  }
  const info = await db.getLibraryInfo(key);
  infoCache.set(cacheKey, info);
  return info;
}

/**
 * Return all library info entries, serving from cache when available.
 * Cache entry is keyed as `"all"` with a 30-minute TTL.
 */
export async function getCachedAllLibraryInfo(): Promise<LibraryInfo[]> {
  const cached = infoCache.get<LibraryInfo[]>("all");
  if (cached !== undefined) {
    logger.debug("[libraryCache] cache hit: getAllLibraryInfo");
    return cached;
  }
  const info = await db.getAllLibraryInfo();
  infoCache.set("all", info);
  return info;
}

// ─── Invalidation ─────────────────────────────────────────────────────────────

/**
 * Invalidate all resource cache entries.
 * Must be called after any create / update / delete on library resources.
 */
export function invalidateResourceCache(): void {
  resourceCache.flushAll();
  logger.info("[libraryCache] Resource cache invalidated");
}

/**
 * Invalidate all contact cache entries.
 * Must be called after any create / update / delete on library contacts.
 */
export function invalidateContactCache(): void {
  contactCache.flushAll();
  logger.info("[libraryCache] Contact cache invalidated");
}

/**
 * Invalidate all library info cache entries.
 * Must be called after any set / delete on library info.
 */
export function invalidateInfoCache(): void {
  infoCache.flushAll();
  logger.info("[libraryCache] Library info cache invalidated");
}

/**
 * Flush all library caches.
 * Used by the catalog sync service and in tests.
 */
export function clearAllLibraryCaches(): void {
  resourceCache.flushAll();
  contactCache.flushAll();
  infoCache.flushAll();
}
