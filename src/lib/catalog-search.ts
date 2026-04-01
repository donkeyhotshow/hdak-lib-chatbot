/**
 * Shared catalog search module — used by chat/route.ts and catalog-search/route.ts.
 * Eliminates duplicated HTML parsing logic and provides a single robust parser.
 */

const CATALOG_URL = process.env.CATALOG_URL || 'https://library-service.com.ua:8443/khkhdak/DocumentSearchResult';
const CATALOG_FORM_URL = process.env.CATALOG_FORM_URL || 'https://library-service.com.ua:8443/khkhdak/DocumentSearchForm';

if (!process.env.CATALOG_URL || !process.env.CATALOG_FORM_URL) {
  console.warn("⚠️ CATALOG_URL or CATALOG_FORM_URL not set — using hardcoded defaults.");
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
  searchType: 'title' | 'author' | 'general';
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
  return raw.replace(/[?!.,;:]+$/, '').trim();
}

export function detectSearchIntent(message: string): SearchIntent | null {
  for (const pattern of AUTHOR_PATTERNS) {
    const raw = message.match(pattern)?.[1]?.trim();
    const term = raw ? cleanTerm(raw) : '';
    if (term && term.length >= 3) return { searchTerm: term, searchType: 'author' };
  }
  for (const pattern of TITLE_PATTERNS) {
    const raw = message.match(pattern)?.[1]?.trim();
    const term = raw ? cleanTerm(raw) : '';
    if (term && term.length >= 3) return { searchTerm: term, searchType: 'title' };
  }
  // Quoted text with book-related context
  const quotedMatch = message.match(/[«"'](.{3,80})[»"']/);
  if (quotedMatch && /книг|каталог|бібліотек|є у вас|маєте|шукаю/i.test(message)) {
    return { searchTerm: quotedMatch[1].trim(), searchType: 'title' };
  }
  return null;
}


// ─── HTML parsing ───────────────────────────────────────────────────────────

/**
 * Strip HTML tags and decode common entities.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function isBookEntry(text: string): boolean {
  // Must have slash (bibliographic separator), year, and sufficient length
  // Exclude URL-like strings (http/https/ftp) and short fragments
  if (!text.includes('/') || !/\d{4}\./.test(text) || text.length <= 30) return false;
  if (/https?:\/\/|ftp:\/\//.test(text)) return false;
  // Must have at least one comma (author, title, publisher pattern)
  return text.includes(',');
}

function buildBook(text: string, rawHtml: string): BookResult {
  const yearMatch = text.match(/[,]\s*[^,]+,\s*(\d{4})\./);
  const year = yearMatch?.[1] ?? '';

  const titleMatch = text.match(/^([^/]{3,80}(?=\s*\/))/) || text.match(/^(.{3,80})/);
  const title = titleMatch?.[1]?.trim() ?? text.slice(0, 60);

  const hasFile =
    /електронн/i.test(text) ||
    rawHtml.includes('DocumentDownload') ||
    rawHtml.includes('.pdf');

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
  const total = countMatch ? parseInt(countMatch[2]) || books.length : books.length;

  // M48: if HTML is suspiciously short and no books found, it may be an error page
  // rather than a genuine empty result — mark as potentially unavailable
  const likelyErrorPage = books.length === 0 && html.length < 500 && !html.includes('DocumentSearch');
  if (likelyErrorPage) return { books: [], total: 0, unavailable: true };

  return { books, total };
}

// ─── Catalog API call ───────────────────────────────────────────────────────

export async function searchCatalog(
  searchTerm: string,
  searchType: 'title' | 'author' | 'general',
  pageSize = 8,
  page = 1,
): Promise<SearchResult> {
  try {
    // Validate and limit input length
    const safeTerm = searchTerm.substring(0, 200);
    const safePageSize = Math.min(Math.max(1, pageSize), 50);
    const safePage = Math.min(Math.max(1, page), 100);

    const formData = new URLSearchParams();
    if (searchType === 'author') {
      formData.append('author', safeTerm);
      formData.append('author_cond', 'authorAnyWord');
    } else {
      formData.append('name_value', safeTerm);
      formData.append('name_cond', 'nameAnyWord');
    }
    formData.append('page_size', String(safePageSize));
    formData.append('page_number', String(safePage));
    formData.append('sorting1', 'author');
    formData.append('sorting_direction1', 'asc');
    formData.append('i_lang', 'ukr');

    if (!CATALOG_URL) return { books: [], total: 0, unavailable: true };

    const response = await fetch(CATALOG_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
      signal: AbortSignal.timeout(8000),
    });

    // M17: distinguish HTTP errors from empty results
    if (!response.ok) return { books: [], total: 0, unavailable: true };
    const html = await response.text();
    return parseBooksFromHtml(html, safePageSize);
  } catch (err) {
    // Timeout or network error — catalog unavailable
    console.error('Catalog search failed:', err instanceof Error ? err.message : err);
    return { books: [], total: 0, unavailable: true };
  }
}

// ─── Context builder for LLM prompt ─────────────────────────────────────────

export function buildCatalogContext(intent: SearchIntent, result: SearchResult, catalogSearchUrl: string): string {
  const { searchTerm, searchType } = intent;
  const { books, total, unavailable } = result;
  const typeLabel = searchType === 'author' ? 'автором' : 'назвою';

  // M17: clearly distinguish unavailable service from empty results
  if (unavailable) {
    return `\n\n[РЕЗУЛЬТАТИ КАТАЛОГУ: Каталог тимчасово недоступний (помилка з'єднання). Запропонуйте користувачу скористатися прямим посиланням: ${catalogSearchUrl}]`;
  }

  if (books.length === 0) {
    return `\n\n[РЕЗУЛЬТАТИ КАТАЛОГУ: Пошук за ${typeLabel} "${searchTerm}" — нічого не знайдено. Посилання для ручного пошуку: ${catalogSearchUrl}]`;
  }

  const list = books.map((b, i) => {
    const fileNote = b.hasFile ? ' 📄 (є електронна версія)' : '';
    const yearNote = b.year ? ` (${b.year})` : '';
    return `${i + 1}. ${b.title}${yearNote}${fileNote}`;
  }).join('\n');

  const moreNote = total > books.length ? `\nВсього знайдено: ${total}. Показано перші ${books.length}.` : '';
  return `\n\n[РЕЗУЛЬТАТИ КАТАЛОГУ: Знайдено за ${typeLabel} "${searchTerm}" (${total} результатів):\n${list}${moreNote}\nПосилання для повного пошуку: ${catalogSearchUrl}]`;
}

export { CATALOG_URL, CATALOG_FORM_URL };
