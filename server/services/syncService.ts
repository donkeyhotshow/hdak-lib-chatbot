/**
 * Catalog Sync Service
 *
 * Periodically fetches the HDAK library catalog page, parses resource
 * metadata from HTML, and upserts entries into the DB.
 *
 * Scheduling is done with a plain setInterval so we avoid an external
 * dependency (e.g. node-cron).  For production use, replace the
 * startSyncScheduler call with a proper job queue or a cloud scheduler.
 */

import * as cheerio from "cheerio";
import { logger } from "../_core/logger";
import * as db from "../db";
import { clearReplyCache } from "./aiPipeline";

/** Public catalog/resource endpoint. Exported for testing. */
export const CATALOG_URL =
  "https://library-service.com.ua:8443/khkhdak/DocumentSearchForm";

/** How often (ms) to re-sync.  Default: every 6 hours. */
const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** Timeout (ms) for the catalog HTTP fetch. */
const FETCH_TIMEOUT_MS = 15_000;

export interface ParsedResource {
  nameUk: string;
  nameEn: string;
  nameRu: string;
  type: "catalog" | "repository" | "electronic_library" | "database" | "other";
  url: string;
  descriptionUk?: string;
}

/**
 * Parse resource links from an HTML string using cheerio.
 * Looks for anchor tags that reference known library resource domains,
 * then extracts the href and visible text as the resource name.
 *
 * Exported for unit testing.
 */
export function parseResourcesFromHtml(html: string): ParsedResource[] {
  const results: ParsedResource[] = [];

  try {
    const $ = cheerio.load(html);

    $("a[href]").each((_index, el) => {
      const href = ($(el).attr("href") ?? "").trim();
      const text = $(el).text().replace(/\s+/g, " ").trim();

      if (!href.startsWith("http") || !text) return;

      // Infer resource type from URL patterns
      let type: ParsedResource["type"] = "other";
      if (href.includes("DocumentSearchForm") || href.includes("catalog")) {
        type = "catalog";
      } else if (href.includes("repository") || href.includes("репозитор")) {
        type = "repository";
      } else if (
        href.includes("scopus") ||
        href.includes("webofscience") ||
        href.includes("doaj")
      ) {
        type = "database";
      } else if (href.includes("elib") || href.includes("e-library")) {
        type = "electronic_library";
      }

      if (type === "other") return; // skip unrelated links

      results.push({
        nameUk: text,
        nameEn: text,
        nameRu: text,
        type,
        url: href,
      });
    });
  } catch (err) {
    logger.error("[syncService] Failed to parse catalog HTML", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return results;
}

/** Fetch the catalog HTML page and return its body text. */
async function fetchCatalogHtml(): Promise<string> {
  const response = await fetch(CATALOG_URL, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { "User-Agent": "HDAK-LibBot-Sync/1.0" },
  });
  if (!response.ok) {
    throw new Error(
      `Catalog fetch failed: ${response.status} ${response.statusText}`
    );
  }
  return response.text();
}

/**
 * Run a single synchronisation cycle.
 *
 * Fetches the HDAK catalog HTML, parses resource links with cheerio, and
 * upserts any new resources into the database.  Applies a "sanity check":
 * if the remote page yields 0 resources but the database already contains
 * resources, the result is treated as a parse/network error rather than a
 * legitimate empty catalog — protecting against accidental data loss or
 * stale-cache events caused by temporary site outages.
 *
 * On success with new resources, the AI reply cache is automatically
 * invalidated so users receive answers reflecting the updated catalog.
 *
 * Exported so it can be triggered manually from the admin panel.
 *
 * @returns Promise resolving to `{ synced, errors }` where `synced` is the
 *   number of newly inserted resources and `errors` is a list of per-resource
 *   failure messages.
 */
export async function runSync(): Promise<{ synced: number; errors: string[] }> {
  if (_isSyncing) {
    logger.warn("[syncService] Sync already in progress, skipping");
    return { synced: 0, errors: ["Sync already in progress"] };
  }

  _isSyncing = true;
  const errors: string[] = [];
  let synced = 0;

  logger.info("[syncService] Starting catalog sync");

  try {
    let html: string;
    try {
      html = await fetchCatalogHtml();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("[syncService] Failed to fetch catalog HTML", {
        error: msg,
      });
      _lastSyncStatus = {
        success: false,
        timestamp: new Date(),
        synced: 0,
        errors: [msg],
      };
      return { synced: 0, errors: [msg] };
    }

    const parsed = parseResourcesFromHtml(html);
    logger.info(`[SYNC] Catalog parsed: ${parsed.length} resources found`);

    // Sanity check: if the parser found nothing but the DB already has resources,
    // treat this as a parsing/network error rather than a legitimate empty catalog.
    // This prevents stale-cache evictions and misleading "sync succeeded" statuses
    // caused by temporary site outages or HTML-structure changes.
    if (parsed.length === 0) {
      const existing = await db.getAllResources();
      if (existing.length > 0) {
        const msg = `[SYNC] Sanity check failed: catalog page returned 0 resources but DB has ${existing.length}. Possible parse error or site outage. Skipping sync.`;
        logger.warn(msg);
        _lastSyncStatus = {
          success: false,
          timestamp: new Date(),
          synced: 0,
          errors: [msg],
        };
        return { synced: 0, errors: [msg] };
      }
    }

    for (const resource of parsed) {
      try {
        // Check if a resource with this URL already exists to avoid duplicates.
        const alreadyExists = !!(await db.getResourceByUrl(resource.url));

        if (!alreadyExists) {
          await db.createResource({
            nameEn: resource.nameEn,
            nameUk: resource.nameUk,
            nameRu: resource.nameRu,
            descriptionUk: resource.descriptionUk,
            type: resource.type,
            url: resource.url,
          });
          synced++;
          logger.info(`[syncService] Synced resource: ${resource.nameUk}`, {
            url: resource.url,
          });
        }
      } catch (err) {
        const msg = `Failed to sync "${resource.nameUk}": ${err instanceof Error ? err.message : String(err)}`;
        logger.warn("[syncService] " + msg);
        errors.push(msg);
      }
    }

    const success = errors.length === 0;
    _lastSyncStatus = { success, timestamp: new Date(), synced, errors };

    if (success && synced > 0) {
      // New data was added — invalidate the AI reply cache so responses reflect
      // the updated catalog rather than returning stale cached answers.
      clearReplyCache();
      logger.milestone(
        `[SYNC] Catalog sync complete: ${synced} new resources added — reply cache cleared`
      );
    } else {
      logger.info(
        `[SYNC] Catalog sync complete. synced=${synced} errors=${errors.length}`
      );
    }

    return { synced, errors };
  } finally {
    // Always clear the flag, even on unexpected errors, so the scheduler
    // can attempt the next sync rather than being permanently locked.
    _isSyncing = false;
  }
}

let _syncTimer: ReturnType<typeof setInterval> | null = null;
/** True while a sync cycle is in progress; prevents concurrent runs. */
let _isSyncing = false;

/** Last sync result, for admin status display. */
let _lastSyncStatus: {
  success: boolean;
  timestamp: Date;
  synced: number;
  errors: string[];
} | null = null;

/** Returns true if a sync is currently in progress. */
export function isSyncing(): boolean {
  return _isSyncing;
}

/** Returns the result of the most recent completed sync, or null if never synced. */
export function getLastSyncStatus(): {
  success: boolean;
  timestamp: Date;
  synced: number;
  errors: string[];
} | null {
  return _lastSyncStatus;
}

/** Start the periodic background synchronisation scheduler. */
export function startSyncScheduler(
  intervalMs: number = DEFAULT_INTERVAL_MS
): void {
  if (_syncTimer) return; // already running

  // Run once at startup (fire-and-forget; do not crash the server on error).
  runSync().catch(err =>
    logger.error("[syncService] Initial sync failed", { error: String(err) })
  );

  _syncTimer = setInterval(() => {
    runSync().catch(err =>
      logger.error("[syncService] Scheduled sync failed", {
        error: String(err),
      })
    );
  }, intervalMs);

  logger.info(`[syncService] Scheduler started (interval=${intervalMs}ms)`);
}

/** Stop the periodic scheduler (useful for tests). */
export function stopSyncScheduler(): void {
  if (_syncTimer) {
    clearInterval(_syncTimer);
    _syncTimer = null;
    logger.info("[syncService] Scheduler stopped");
  }
  _isSyncing = false;
}
