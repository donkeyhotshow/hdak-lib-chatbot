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

import { logger } from "../_core/logger";
import * as db from "../db";

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
 * Parse resource links from an HTML string.
 * Looks for anchor tags that reference known library resource domains,
 * then extracts the href and visible text as the resource name.
 *
 * This is intentionally simple so it works without a full DOM parser
 * dependency.  Exported for unit testing.
 */
export function parseResourcesFromHtml(html: string): ParsedResource[] {
  const results: ParsedResource[] = [];

  // Match every <a href="…">…</a> in the page.
  const anchorRe = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = anchorRe.exec(html)) !== null) {
    const href = match[1].trim();
    const text = match[2].replace(/\s+/g, " ").trim();

    if (!href.startsWith("http") || !text) continue;

    // Infer resource type from URL patterns
    let type: ParsedResource["type"] = "other";
    if (href.includes("DocumentSearchForm") || href.includes("catalog")) {
      type = "catalog";
    } else if (href.includes("repository") || href.includes("репозитор")) {
      type = "repository";
    } else if (href.includes("scopus") || href.includes("webofscience") || href.includes("doaj")) {
      type = "database";
    } else if (href.includes("elib") || href.includes("e-library")) {
      type = "electronic_library";
    }

    if (type === "other") continue; // skip unrelated links

    results.push({
      nameUk: text,
      nameEn: text,
      nameRu: text,
      type,
      url: href,
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
    throw new Error(`Catalog fetch failed: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

/**
 * Run a single synchronisation cycle.
 * Exported so it can be called manually (e.g. from the admin panel).
 */
export async function runSync(): Promise<{ synced: number; errors: string[] }> {
  const errors: string[] = [];
  let synced = 0;

  logger.info("[syncService] Starting catalog sync");

  let html: string;
  try {
    html = await fetchCatalogHtml();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("[syncService] Failed to fetch catalog HTML", { error: msg });
    return { synced: 0, errors: [msg] };
  }

  const parsed = parseResourcesFromHtml(html);
  logger.info(`[syncService] Parsed ${parsed.length} resources from catalog`);

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
        logger.info(`[syncService] Synced resource: ${resource.nameUk}`, { url: resource.url });
      }
    } catch (err) {
      const msg = `Failed to sync "${resource.nameUk}": ${err instanceof Error ? err.message : String(err)}`;
      logger.warn("[syncService] " + msg);
      errors.push(msg);
    }
  }

  logger.info(`[syncService] Sync complete. synced=${synced} errors=${errors.length}`);
  return { synced, errors };
}

let _syncTimer: ReturnType<typeof setInterval> | null = null;

/** Start the periodic background synchronisation scheduler. */
export function startSyncScheduler(intervalMs: number = DEFAULT_INTERVAL_MS): void {
  if (_syncTimer) return; // already running

  // Run once at startup (fire-and-forget; do not crash the server on error).
  runSync().catch(err =>
    logger.error("[syncService] Initial sync failed", { error: String(err) })
  );

  _syncTimer = setInterval(() => {
    runSync().catch(err =>
      logger.error("[syncService] Scheduled sync failed", { error: String(err) })
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
}
