/**
 * Catalog Search — shared server-side scraping service
 *
 * Centralises the Cheerio-based scraping of the HDAK external library catalog.
 * Both the /api/catalog route and the catalogTool use this module directly,
 * which avoids HTTP self-calls (SSRF risk) and keeps resilience logic in one place.
 *
 * Resilience features:
 *  - One automatic retry with a 1 s delay on network/HTTP errors
 *  - Empty-title row filtering (skips header rows and junk table cells)
 *  - Distinct `error_type` field so callers can differentiate "no results"
 *    from "catalog service unavailable"
 *  - Max 8 results returned to keep responses concise
 */

import * as cheerio from "cheerio";
import { logger } from "../_core/logger";

const CATALOG_BASE = "https://library-service.com.ua:8443/khkhdak";
const CATALOG_SEARCH_URL = `${CATALOG_BASE}/DocumentSearchForm`;
const CATALOG_FETCH_TIMEOUT_MS = 8_000;
const CATALOG_RETRY_DELAY_MS = 1_000;
const CATALOG_MAX_RESULTS = 8;

export type CatalogBook = {
  title: string;
  author: string;
  year: string;
  url: string;
};

export type CatalogFallbackLink = {
  label: string;
  url: string;
};

export type CatalogSearchResult =
  | {
      ok: true;
      results: CatalogBook[];
      search_url: string;
    }
  | {
      ok: false;
      results: [];
      search_url: string;
      /** Distinguishes a transport failure from an empty result set. */
      error_type: "unavailable" | "parse_error";
      fallback: CatalogFallbackLink[];
    };

export type CatalogSearchParams = {
  author?: string;
  title?: string;
  topic?: string;
};

function buildSearchUrl(params: CatalogSearchParams): string {
  const qs = new URLSearchParams();
  if (params.author) qs.set("author", params.author);
  if (params.title) qs.set("title", params.title);
  if (params.topic) qs.set("subject", params.topic);
  return `${CATALOG_SEARCH_URL}?${qs}`;
}

function parseBooks(html: string, searchUrl: string): CatalogBook[] {
  const $ = cheerio.load(html);
  const books: CatalogBook[] = [];

  $("table tr").each((i, row) => {
    if (i === 0) return; // skip header row
    const td = $(row).find("td");
    if (td.length < 2) return; // skip rows without enough cells

    const title = td.eq(0).text().trim();
    const author = td.eq(1).text().trim();

    // Skip rows where both title and author are empty (junk/spacer rows)
    if (!title && !author) return;
    // Skip rows that are clearly not books (e.g. empty title)
    if (!title) return;

    const href = $(row).find("a").first().attr("href") ?? "";
    const url = href.startsWith("http") ? href : href ? `${CATALOG_BASE}${href}` : searchUrl;

    books.push({
      title,
      author,
      year: td.eq(2).text().trim(),
      url,
    });
  });

  return books;
}

function buildFallback(searchUrl: string): CatalogFallbackLink[] {
  return [
    { label: "Відкрити каталог", url: searchUrl },
    { label: "Viber бібліотеки", url: "viber://chat/?number=%2B380661458484" },
    { label: "Telegram бібліотеки", url: "https://t.me/+380661458484" },
  ];
}

async function fetchWithTimeout(url: string): Promise<Response> {
  return fetch(url, {
    signal: AbortSignal.timeout(CATALOG_FETCH_TIMEOUT_MS),
    headers: { "User-Agent": "HDACLibBot/1.0" },
  });
}

/**
 * Search the HDAK library catalog directly (no HTTP self-call).
 *
 * Retries once on failure after a short delay. Distinguishes between
 * "catalog unavailable" (transport/HTTP error) and "parse error"
 * (unexpected page structure) via the `error_type` field.
 */
export async function searchCatalogDirect(
  params: CatalogSearchParams
): Promise<CatalogSearchResult> {
  const searchUrl = buildSearchUrl(params);

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetchWithTimeout(searchUrl);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const html = await res.text();
      const books = parseBooks(html, searchUrl);

      return {
        ok: true,
        results: books.slice(0, CATALOG_MAX_RESULTS),
        search_url: searchUrl,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (attempt === 1) {
        logger.warn("[catalogSearch] Attempt 1 failed, retrying…", {
          error: message,
          searchUrl,
        });
        await new Promise(resolve => setTimeout(resolve, CATALOG_RETRY_DELAY_MS));
        continue;
      }
      // Both attempts failed
      logger.warn("[catalogSearch] Both attempts failed — catalog unavailable", {
        error: message,
        searchUrl,
      });
      return {
        ok: false,
        results: [],
        search_url: searchUrl,
        error_type: "unavailable",
        fallback: buildFallback(searchUrl),
      };
    }
  }

  // Should never reach here, but TypeScript requires a return
  /* istanbul ignore next */
  return {
    ok: false,
    results: [],
    search_url: searchUrl,
    error_type: "unavailable",
    fallback: buildFallback(searchUrl),
  };
}
