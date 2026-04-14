/**
 * Shared catalog search module — used by chat/route.ts and catalog-search/route.ts.
 * Eliminates duplicated HTML parsing logic and provides a single robust parser.
 */

import { stripHtml } from "@/lib/sanitize";

// stripHtml is imported from @/lib/sanitize — do NOT duplicate here.

const CATALOG_URL =
  process.env.CATALOG_URL ||
  "https://library-service.com.ua:8443/khkhdak/DocumentSearchResult";
const CATALOG_FORM_URL =
  process.env.CATALOG_FORM_URL ||
  "https://library-service.com.ua:8443/khkhdak/DocumentSearchForm";

if (!process.env.CATALOG_URL || !process.env.CATALOG_FORM_URL) {
  console.warn(
    "⚠️ CATALOG_URL or CATALOG_FORM_URL not set — using hardcoded defaults."
  );
}

export interface BookResult {
  title: string;
  description: string;
  year: string;
  hasFile: boolean;
}

export interface SearchResult {
  books: BookResult[];
  total: number;
  /** true when catalog service is unreachable (timeout/5xx) — distinct from "no results" */
  unavailable?: boolean;
}

export interface SearchIntent {
  searchTerm: string;
  searchType: "title" | "author" | "general" | "udc" | "subject" | "keyword";
}

// ─── Intent detection patterns ──────────────────────────────────────────────

const TITLE_PATTERNS = [
  // "знайди/шукаю/є книгу X"
  /(?:знайди|знайти|пошук|шукаю|шукати|є|маєте|чи є|чи маєте|є у вас|маєте у каталозі)\s+книг[уиі]?\s+[«"']?(.+?)[»"']?$/i,
  // "книгу «X»" або "книгу X є"
  /книг[уиі]\s+[«"'](.+?)[»"']/i,
  /книг[уиі]\s+(.{3,60}?)(?:\s+є|\s+маєте|$)/i,
  // «X» є/маєте
  /[«"'](.+?)[»"']\s+(?:є|маєте|знайти|пошук)/i,
  /(?:є|маєте|є у вас)\s+[«"'](.+?)[»"']/i,
  // "шукаю X"
  /(?:шукаю|шукати)\s+[«"']?(.+?)[»"']?$/i,
  // "є книга/книги з X" / "книга про X" / "книга на тему X"
  /книг[иа]\s+(?:з|про|на тему|по)\s+(.{3,60}?)(?:\?|$)/i,
  // "є щось про X" / "є матеріали з X"
  /є\s+(?:щось|матеріали|видання|книги)?\s*(?:про|з|по|на тему)\s+(.{3,60}?)(?:\?|$)/i,
  // "маєте X" (загальний)
  /маєте\s+(.{3,60}?)(?:\?|$)/i,
];

const AUTHOR_PATTERNS = [
  /(?:книги|твори|роботи|праці)\s+(?:автора\s+)?[«"']?([А-ЯҐЄІЇа-яґєії\w\s\-]{3,50})[»"']?$/i,
  /автор[аи]?\s+[«"']?([А-ЯҐЄІЇа-яґєії\w\s\-]{3,50})[»"']?/i,
  /(?:є|маєте)\s+(?:щось\s+)?(?:від|від автора)\s+([А-ЯҐЄІЇа-яґєії\w\s\-]{3,50})/i,
  // "книги Шевченка" / "твори Франка"  NOT "книги про/з/по/на тему X"
  /(?:книги|твори|роботи)\s+(?!про\s|з\s|по\s|на\s|від\s|для\s)([А-ЯҐЄІЇА-ЯҐЄІЇ][а-яґєіїА-ЯҐЄІЇA-Za-z\w\s\-]{2,30})(?:\?|$)/i,
];

function cleanTerm(raw: string): string {
  return raw.replace(/[?!.,;:]+$/, "").trim();
}

// ─── Extended search patterns ────────────────────────────────────────────────

const UDC_PATTERNS = [
  /УДК\s*([\d.]+(?:\.\d+)*)/i,
  /(?:за\s+)?УДК[:\s]+([\d.]+(?:\.\d+)*)/i,
];

const SUBJECT_PATTERNS = [
  /(?:книги|матеріали|видання|є щось)\s+на\s+тему[:\s]+(.{3,60}?)(?:\?|$)/i,
  /(?:тема|по темі|на тему)[:\s]+(.{3,60}?)(?:\?|$)/i,
  /(?:знайди|пошук|шукаю)\s+(?:книги\s+)?(?:про|по|на тему)\s+(.{3,60}?)(?:\?|$)/i,
];

const KEYWORD_PATTERNS = [
  /ключов[іе]\s+слов[аи][:\s]+(.{3,120}?)(?:\?|$)/i,
  /за\s+ключовими\s+словами[:\s]+(.{3,120}?)(?:\?|$)/i,
];

export function detectSearchIntent(message: string): SearchIntent | null {
  // УДК — highest priority (very specific pattern)
  for (const pattern of UDC_PATTERNS) {
    const raw = message.match(pattern)?.[1]?.trim();
    const term = raw ? cleanTerm(raw) : "";
    if (term && /^[\d.]+$/.test(term))
      return { searchTerm: term, searchType: "udc" };
  }
  // Ключові слова
  for (const pattern of KEYWORD_PATTERNS) {
    const raw = message.match(pattern)?.[1]?.trim();
    const term = raw ? cleanTerm(raw) : "";
    if (term && term.length >= 3)
      return { searchTerm: term, searchType: "keyword" };
  }
  // Тема
  for (const pattern of SUBJECT_PATTERNS) {
    const raw = message.match(pattern)?.[1]?.trim();
    const term = raw ? cleanTerm(raw) : "";
    if (term && term.length >= 3)
      return { searchTerm: term, searchType: "subject" };
  }
  for (const pattern of AUTHOR_PATTERNS) {
    const raw = message.match(pattern)?.[1]?.trim();
    const term = raw ? cleanTerm(raw) : "";
    if (term && term.length >= 3)
      return { searchTerm: term, searchType: "author" };
  }
  for (const pattern of TITLE_PATTERNS) {
    const raw = message.match(pattern)?.[1]?.trim();
    const term = raw ? cleanTerm(raw) : "";
    if (term && term.length >= 3)
      return { searchTerm: term, searchType: "title" };
  }
  // Quoted text with book-related context
  const quotedMatch = message.match(/[«"'](.{3,80})[»"']/);
  if (
    quotedMatch &&
    /книг|каталог|бібліотек|є у вас|маєте|шукаю/i.test(message)
  ) {
    return { searchTerm: quotedMatch[1].trim(), searchType: "title" };
  }
  return null;
}

// ─── HTML parsing ───────────────────────────────────────────────────────────

function isBookEntry(text: string): boolean {
  // Must have slash (bibliographic separator), year, and sufficient length
  // Exclude URL-like strings (http/https/ftp) and short fragments
  if (!text.includes("/") || !/\d{4}\./.test(text) || text.length <= 30)
    return false;
  if (/https?:\/\/|ftp:\/\//.test(text)) return false;
  // Must have at least one comma (author, title, publisher pattern)
  return text.includes(",");
}

function buildBook(text: string, rawHtml: string): BookResult {
  const yearMatch = text.match(/[,]\s*[^,]+,\s*(\d{4})\./);
  const year = yearMatch?.[1] ?? "";

  const titleMatch =
    text.match(/^([^/]{3,80}(?=\s*\/))/) || text.match(/^(.{3,80})/);
  const title = titleMatch?.[1]?.trim() ?? text.slice(0, 60);

  const hasFile =
    /електронн/i.test(text) ||
    rawHtml.includes("DocumentDownload") ||
    rawHtml.includes(".pdf");

  return { title, description: text, year, hasFile };
}

/**
 * Parse books from catalog HTML response.
 * Uses multiple strategies so a layout change degrades gracefully.
 */
export function parseBooksFromHtml(html: string, maxBooks = 10): SearchResult {
  const books: BookResult[] = [];

  // Strategy 1: cells with explicit width:80% (original catalog layout)
  const cellPattern = /<td[^>]*width[^>]*80%[^>]*>([\s\S]*?)<\/td>/gi;
  let match: RegExpExecArray | null;
  while ((match = cellPattern.exec(html)) !== null && books.length < maxBooks) {
    const text = stripHtml(match[1]);
    if (isBookEntry(text)) {
      books.push(buildBook(text, match[1]));
    }
  }

  // Strategy 2: fallback — any <td> with book-like content
  if (books.length === 0) {
    const tdPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    while ((match = tdPattern.exec(html)) !== null && books.length < maxBooks) {
      const text = stripHtml(match[1]);
      if (text.length > 40 && isBookEntry(text)) {
        books.push(buildBook(text, match[1]));
      }
    }
  }

  // Total count from pagination line "X - Y з Z"
  const countMatch = html.match(/(\d+)\s*[-–]\s*\d+\s+[зз]\s+(\d+)/i);
  const total = countMatch
    ? parseInt(countMatch[2], 10) || books.length
    : books.length;

  // M48: if HTML is suspiciously short and no books found, it may be an error page
  // rather than a genuine empty result — mark as potentially unavailable
  const likelyErrorPage =
    books.length === 0 && html.length < 500 && !html.includes("DocumentSearch");
  if (likelyErrorPage) return { books: [], total: 0, unavailable: true };

  return { books, total, unavailable: false as const };
}

// ─── Catalog API call ───────────────────────────────────────────────────────

/** One retry (with 600 ms back-off) on transient network / 5xx errors. */
async function fetchCatalog(
  url: string,
  body: string,
  attempt = 0
): Promise<Response> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok && res.status >= 500 && attempt === 0) {
    // Retry once on server-side errors
    await new Promise(r => setTimeout(r, 600));
    return fetchCatalog(url, body, 1);
  }
  return res;
}

/**
 * Check if the catalog service is reachable.
 * Performs a lightweight HEAD or GET request to the form URL.
 */
export async function checkCatalogAvailability(): Promise<boolean> {
  try {
    const res = await fetch(CATALOG_FORM_URL, {
      method: "HEAD",
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch (e) {
    // Fallback to GET if HEAD is not supported
    try {
      const res = await fetch(CATALOG_FORM_URL, {
        method: "GET",
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export async function searchCatalog(
  searchTerm: string,
  searchType: "title" | "author" | "general" | "udc" | "subject" | "keyword",
  pageSize = 8,
  page = 1
): Promise<SearchResult> {
  try {
    const safeTerm = searchTerm.substring(0, 200);
    const safePageSize = Math.min(Math.max(1, pageSize), 50);
    const safePage = Math.min(Math.max(1, page), 100);

    const formData = new URLSearchParams();

    if (searchType === "author") {
      formData.append("author", safeTerm);
      formData.append("author_cond", "authorAnyWord");
    } else if (searchType === "udc") {
      // УДК — only digits and dots allowed (validated before call)
      formData.append("udc", safeTerm);
    } else if (searchType === "subject") {
      formData.append("subject", safeTerm);
      formData.append("subject_cond", "subjectAnyWord");
    } else if (searchType === "keyword") {
      formData.append("keywords", safeTerm);
      formData.append("keywords_cond", "keywordsAnyWord");
    } else {
      // title | general
      formData.append("name_value", safeTerm);
      formData.append("name_cond", "nameAnyWord");
    }

    formData.append("page_size", String(safePageSize));
    formData.append("page_number", String(safePage));
    formData.append("sorting1", "author");
    formData.append("sorting_direction1", "asc");
    formData.append("i_lang", "ukr");

    if (!CATALOG_URL) return { books: [], total: 0, unavailable: true };

    let response: Response;
    try {
      response = await fetchCatalog(CATALOG_URL, formData.toString());
    } catch (networkErr) {
      // Network error on first attempt — retry once
      try {
        await new Promise(r => setTimeout(r, 600));
        response = await fetchCatalog(CATALOG_URL, formData.toString(), 1);
      } catch {
        throw networkErr;
      }
    }

    if (!response.ok) return { books: [], total: 0, unavailable: true };
    const html = await response.text();
    return parseBooksFromHtml(html, safePageSize);
  } catch (err) {
    console.error(
      "Catalog search failed:",
      err instanceof Error ? err.message : err
    );
    return { books: [], total: 0, unavailable: true };
  }
}

// ─── Context builder for LLM prompt ─────────────────────────────────────────

export function buildCatalogContext(
  intent: SearchIntent,
  result: SearchResult,
  catalogSearchUrl: string
): string {
  const { searchTerm, searchType } = intent;
  const { books, total, unavailable } = result;

  const typeLabel: Record<SearchIntent["searchType"], string> = {
    author: "автором",
    title: "назвою",
    general: "запитом",
    udc: "УДК",
    subject: "темою",
    keyword: "ключовими словами",
  };
  const label = typeLabel[searchType] ?? "запитом";

  if (unavailable) {
    return `\n\n[РЕЗУЛЬТАТИ КАТАЛОГУ: Каталог тимчасово недоступний (помилка з'єднання). Запропонуйте користувачу скористатися прямим посиланням: ${catalogSearchUrl}. Також повідомте, що вони можуть залишити запит через контакти в меню, якщо каталог не запрацює найближчим часом.]`;
  }

  if (books.length === 0) {
    return `\n\n[РЕЗУЛЬТАТИ КАТАЛОГУ: Пошук за ${label} "${searchTerm}" — нічого не знайдено. Посилання для ручного пошуку: ${catalogSearchUrl}]`;
  }

  const list = books
    .map((b, i) => {
      const fileNote = b.hasFile ? " 📄 (є електронна версія)" : "";
      const yearNote = b.year ? ` (${b.year})` : "";
      return `${i + 1}. ${b.title}${yearNote}${fileNote}`;
    })
    .join("\n");

  const moreNote =
    total > books.length
      ? `\nВсього знайдено: ${total}. Показано перші ${books.length}.`
      : "";
  return `\n\n[РЕЗУЛЬТАТИ КАТАЛОГУ: Знайдено за ${label} "${searchTerm}" (${total} результатів):\n${list}${moreNote}\nПосилання для повного пошуку: ${catalogSearchUrl}]`;
}

export { CATALOG_URL, CATALOG_FORM_URL };
