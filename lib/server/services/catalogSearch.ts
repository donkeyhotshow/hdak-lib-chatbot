/**
 * Catalog Search
 *
 * Encapsulates the Cheerio-based scraping of the HDAK library catalog
 * (https://library-service.com.ua:8443/khkhdak/DocumentSearchForm).
 *
 * Extracted from `app/api/catalog/route.ts` so that the AI tool can call the
 * search logic directly without an extra HTTP round-trip through the Next.js
 * route handler.
 */

import * as cheerio from "cheerio";
import { logger } from "../_core/logger";

export const CATALOG_BASE = "https://library-service.com.ua:8443/khkhdak";
const CATALOG_SEARCH_URL = `${CATALOG_BASE}/DocumentSearchForm`;

export interface CatalogSearchParams {
  author?: string;
  title?: string;
  topic?: string;
}

export interface CatalogBook {
  title: string;
  author: string;
  year: string;
  url: string;
}

export interface CatalogSearchResult {
  ok: boolean;
  results: CatalogBook[];
  search_url: string;
  fallback?: { label: string; url: string }[];
}

/**
 * Query the HDAK library catalog and return up to 8 matching books.
 *
 * On network or parse errors the function returns `{ ok: false, ... }` with
 * fallback links — it never throws, matching the behaviour expected by both
 * the tool executor and the HTTP route handler.
 */
export async function searchCatalogDirect(
  params: CatalogSearchParams
): Promise<CatalogSearchResult> {
  const { author = "", title = "", topic = "" } = params;
  const qs = new URLSearchParams();
  if (author) qs.set("author", author);
  if (title) qs.set("title", title);
  if (topic) qs.set("subject", topic);
  const searchUrl = `${CATALOG_SEARCH_URL}?${qs}`;

  try {
    const res = await fetch(searchUrl, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "HDACLibBot/1.0" },
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const $ = cheerio.load(await res.text());
    const books: CatalogBook[] = [];
    $("table tr").each((i, row) => {
      if (i === 0) return;
      const td = $(row).find("td");
      if (td.length < 2) return;
      const href = $(row).find("a").first().attr("href") ?? "";
      books.push({
        title: td.eq(0).text().trim(),
        author: td.eq(1).text().trim(),
        year: td.eq(2).text().trim(),
        url: href.startsWith("http") ? href : `${CATALOG_BASE}${href}`,
      });
    });
    return {
      ok: true,
      results: books.slice(0, 8),
      search_url: searchUrl,
    };
  } catch (err) {
    logger.warn("[catalogSearch] Catalog fetch failed", {
      error: err instanceof Error ? err.message : String(err),
      searchUrl,
    });
    return {
      ok: false,
      results: [],
      search_url: searchUrl,
      fallback: [
        { label: "Відкрити каталог", url: searchUrl },
        {
          label: "Viber бібліотеки",
          url: "viber://chat/?number=%2B380661458484",
        },
        {
          label: "Telegram бібліотеки",
          url: "https://t.me/+380661458484",
        },
      ],
    };
  }
}
