/**
 * Shared catalog search module — used by chat/route.ts and catalog-search/route.ts.
 * Eliminates duplicated HTML parsing logic and provides a single robust parser.
 */

const CATALOG_URL = process.env.CATALOG_URL || 'https://library-service.com.ua:8443/khkhdak/DocumentSearchResult';
const CATALOG_FORM_URL = process.env.CATALOG_FORM_URL || 'https://library-service.com.ua:8443/khkhdak/DocumentSearchForm';

export interface BookResult {
  title: string;
  description: string;
  year: string;
  hasFile: boolean;
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
  /книг[уиі]\s+(.{3,60})(?:\s+є|\s+маєте|$)/i,
  // «X» є/маєте
  /[«"'](.+?)[»"']\s+(?:є|маєте|знайти|пошук)/i,
  /(?:є|маєте|є у вас)\s+[«"'](.+?)[»"']/i,
  // "шукаю X"
  /(?:шукаю|шукати)\s+[«"']?(.+?)[»"']?$/i,
  // "є книга з X" / "книга про X" / "книга на тему X"
  /книга\s+(?:з|про|на тему|по)\s+(.{3,60})(?:\?|$)/i,
  // "є щось про X" / "є матеріали з X"
  /є\s+(?:щось|матеріали|видання|книги)?\s*(?:про|з|по|на тему)\s+(.{3,60})(?:\?|$)/i,
  // "маєте X" (загальний)
  /маєте\s+(.{3,60})(?:\?|$)/i,
];

const AUTHOR_PATTERNS = [
  /(?:книги|твори|роботи|праці)\s+(?:автора\s+)?[«"']?([А-ЯҐЄІЇа-яґєії\w\s\-]{3,50})[»"']?$/i,
  /автор[аи]?\s+[«"']?([А-ЯҐЄІЇа-яґєії\w\s\-]{3,50})[»"']?/i,
  /(?:є|маєте)\s+(?:щось\s+)?(?:від|від автора)\s+([А-ЯҐЄІЇа-яґєії\w\s\-]{3,50})/i,
  // "книги Шевченка" / "твори Франка"
  /(?:книги|твори|роботи)\s+([А-ЯҐЄІЇ][а-яґєіїА-ЯҐЄІЇ\w\s\-]{2,30})(?:\?|$)/i,
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
  return text.includes('/') && /\d{4}\./.test(text) && text.length > 30;
}

function buildBook(text: string, rawHtml: string): BookResult {
  const yearMatch = text.match(/[,]\s*[^,]+,\s*(\d{4})\./);
  const year = yearMatch?.[1] ?? '';

  const titleMatch = text.match(/^([^/[\]]{3,80})/);
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
export function parseBooksFromHtml(html: string, maxBooks = 10): { books: BookResult[]; total: number } {
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

  return { books, total };
}

// ─── Catalog API call ───────────────────────────────────────────────────────

export async function searchCatalog(
  searchTerm: string,
  searchType: 'title' | 'author' | 'general',
  pageSize = 8,
): Promise<{ books: BookResult[]; total: number }> {
  try {
    const formData = new URLSearchParams();
    if (searchType === 'author') {
      formData.append('author', searchTerm);
      formData.append('author_cond', 'authorAnyWord');
    } else {
      formData.append('name_value', searchTerm);
      formData.append('name_cond', 'authorAnyWord');
    }
    formData.append('page_size', String(pageSize));
    formData.append('page_number', '1');
    formData.append('sorting1', 'author');
    formData.append('sorting_direction1', 'asc');
    formData.append('i_lang', 'ukr');

    const response = await fetch(CATALOG_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return { books: [], total: 0 };
    const html = await response.text();
    return parseBooksFromHtml(html, pageSize);
  } catch {
    return { books: [], total: 0 };
  }
}

// ─── Context builder for LLM prompt ─────────────────────────────────────────

export function buildCatalogContext(intent: SearchIntent, result: { books: BookResult[]; total: number }, catalogSearchUrl: string): string {
  const { searchTerm, searchType } = intent;
  const { books, total } = result;
  const typeLabel = searchType === 'author' ? 'автором' : 'назвою';

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
