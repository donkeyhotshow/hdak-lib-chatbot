import https from "node:https";
import { load as cheerioLoad } from "cheerio";

export interface CatalogResult {
  title: string;
  author?: string;
  year?: string;
  type?: string;
  shelfMark?: string;
  available?: boolean;
  link?: string;
}

export interface CatalogResponse {
  results: CatalogResult[];
  total: number;
  source: string;
  query: string;
}

const CATALOG_BASE = "library-service.com.ua";
const CATALOG_PORT = 8443;
const CATALOG_PATH = "/khkhdak/DocumentSearchForm";
const SEARCH_TIMEOUT_MS = 12000;

/* Bypass self-signed certificates used by Ukrainian library systems */
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function fetchWithTimeout(url: string, options: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function buildSearchUrl(query: string, author?: string): string {
  const base = `https://${CATALOG_BASE}:${CATALOG_PORT}${CATALOG_PATH}`;
  const params = new URLSearchParams();
  if (author) {
    params.set("ZT", "a");
    params.set("SS", author);
  } else {
    params.set("ZT", "q");
    params.set("SS", query);
  }
  return `${base}?${params.toString()}`;
}

function parseResults(html: string, query: string): CatalogResult[] {
  const $ = cheerioLoad(html);
  const results: CatalogResult[] = [];

  /* ── Try common АБІС UFD / Liber table patterns ── */
  $("table tr").each((_, row) => {
    const cells = $(row).find("td");
    if (cells.length < 2) return;

    const firstCell = $(cells[0]).text().trim();
    const secondCell = $(cells[1]).text().trim();

    /* Skip header rows */
    if (!firstCell || firstCell.toLowerCase().includes("назва") || firstCell.toLowerCase().includes("автор")) return;
    if (firstCell.match(/^\d+$/)) {
      /* Row with index number */
      const titleCell = $(cells[1]);
      const authorCell = cells.length > 2 ? $(cells[2]) : null;
      const yearCell = cells.length > 3 ? $(cells[3]) : null;

      const result: CatalogResult = {
        title: titleCell.text().trim(),
        author: authorCell?.text().trim() || undefined,
        year: yearCell?.text().trim() || undefined,
        link: titleCell.find("a").attr("href") || undefined,
      };
      if (result.title) results.push(result);
    } else if (secondCell && firstCell) {
      /* Two-column layout with title / author */
      results.push({ title: firstCell, author: secondCell });
    }
  });

  /* ── Fallback: look for any anchor links that look like document titles ── */
  if (results.length === 0) {
    $("a").each((_, a) => {
      const href = $(a).attr("href") || "";
      const text = $(a).text().trim();
      if (text.length > 10 && (href.includes("Document") || href.includes("document") || href.includes("record"))) {
        results.push({ title: text, link: href });
      }
    });
  }

  return results.slice(0, 20);
}

export async function searchCatalog(
  query: string,
  author?: string
): Promise<CatalogResponse> {
  const url = buildSearchUrl(query, author);

  let html: string;
  try {
    const res = await fetchWithTimeout(
      url,
      {
        method: "GET",
        headers: {
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "uk,en;q=0.5",
          "User-Agent": "Mozilla/5.0 (compatible; HDAK-LibBot/1.0)",
          "Connection": "keep-alive",
        },
        /* @ts-ignore — Node 18+ fetch doesn't type the agent option, use global undici dispatcher workaround */
        dispatcher: undefined,
      },
      SEARCH_TIMEOUT_MS
    );

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    /* Force Cyrillic encoding — many older UA library sites use cp1251 */
    const buffer = await res.arrayBuffer();
    try {
      html = new TextDecoder("windows-1251").decode(buffer);
      /* If it decodes fine as UTF-8, prefer that */
      const utf8 = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
      if (utf8.includes("html") || utf8.includes("HTML")) html = utf8;
    } catch {
      html = new TextDecoder("windows-1251").decode(buffer);
    }
  } catch (err: any) {
    const msg = err?.name === "AbortError"
      ? "Перевищено час очікування відповіді від каталогу"
      : `Помилка з'єднання з каталогом: ${err?.message ?? "невідома помилка"}`;
    throw new Error(msg);
  }

  const results = parseResults(html, query);

  return {
    results,
    total: results.length,
    source: `https://${CATALOG_BASE}:${CATALOG_PORT}${CATALOG_PATH}`,
    query: author ? `автор: ${author}` : query,
  };
}
