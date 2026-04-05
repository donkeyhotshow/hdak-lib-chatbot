export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { logger } from "@/lib/server/_core/logger";
import {
  enforceSecurityRateLimit,
  getRequestIp,
} from "@/lib/server/security/rateLimiter";

const CATALOG_BASE = "https://library-service.com.ua:8443/khkhdak";
const CATALOG = `${CATALOG_BASE}/DocumentSearchForm`;

export async function GET(req: NextRequest) {
  const requestIp = getRequestIp({
    ip: "unknown",
    headers: Object.fromEntries(req.headers.entries()),
  });

  try {
    await enforceSecurityRateLimit({ endpoint: "/api/catalog", ip: requestIp });
  } catch {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const sp = req.nextUrl.searchParams;
  const qs = new URLSearchParams();
  const author = sp.get("author") ?? "";
  const title = sp.get("title") ?? "";
  const topic = sp.get("topic") ?? "";
  if (author) qs.set("author", author);
  if (title) qs.set("title", title);
  if (topic) qs.set("subject", topic);
  const searchUrl = `${CATALOG}?${qs}`;

  try {
    const res = await fetch(searchUrl, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "HDACLibBot/1.0" },
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const $ = cheerio.load(await res.text());
    const books: {
      title: string;
      author: string;
      year: string;
      url: string;
    }[] = [];
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
    return NextResponse.json({
      ok: true,
      results: books.slice(0, 8),
      search_url: searchUrl,
    });
  } catch (err) {
    logger.warn("[api/catalog] Catalog fetch failed", {
      error: err instanceof Error ? err.message : String(err),
      searchUrl,
    });
    return NextResponse.json({
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
    });
  }
}
