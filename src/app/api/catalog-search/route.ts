import { NextRequest, NextResponse } from 'next/server';

const CATALOG_URL = 'https://library-service.com.ua:8443/khkhdak/DocumentSearchResult';
const CATALOG_FORM_URL = 'https://library-service.com.ua:8443/khkhdak/DocumentSearchForm';

interface BookResult {
  title: string;
  fullDescription: string;
  year: string;
  hasFile: boolean;
}

/**
 * Extract text content from an HTML string, stripping all tags.
 */
function stripHtml(html: string): string {
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

/**
 * Parse books from catalog HTML response.
 * Strategy: look for table rows/cells that contain book-like content.
 * Multiple selector strategies tried in order, so a layout change degrades
 * gracefully rather than returning nothing.
 */
function parseBooksFromHtml(html: string): { books: BookResult[]; total: number } {
  const books: BookResult[] = [];

  // Strategy 1: cells with explicit width:80% (original catalog layout)
  const cellPattern = /<td[^>]*width[^>]*80%[^>]*>([\s\S]*?)<\/td>/gi;
  let match: RegExpExecArray | null;
  while ((match = cellPattern.exec(html)) !== null && books.length < 10) {
    const text = stripHtml(match[1]);
    if (isBookEntry(text)) {
      books.push(buildBook(text, match[1]));
    }
  }

  // Strategy 2: fallback  any <td> with book-like content (year + slash pattern)
  if (books.length === 0) {
    const tdPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    while ((match = tdPattern.exec(html)) !== null && books.length < 10) {
      const text = stripHtml(match[1]);
      if (text.length > 40 && isBookEntry(text)) {
        books.push(buildBook(text, match[1]));
      }
    }
  }

  // Total count from pagination line "X - Y з Z"
  const countMatch = html.match(/(\d+)\s*[-]\s*\d+\s+[зз]\s+(\d+)/i);
  const total = countMatch ? parseInt(countMatch[2]) : books.length;

  return { books, total };
}

function isBookEntry(text: string): boolean {
  // Must have a year (4 digits followed by a dot) and a slash (author/title separator)
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

  return { title, fullDescription: text, year, hasFile };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query  = searchParams.get('q');
  const author = searchParams.get('author');
  const title  = searchParams.get('title');
  const page   = searchParams.get('page') || '1';

  if (!query && !author && !title) {
    return NextResponse.json({
      error: 'Вкажіть параметр пошуку: q (загальний), author (автор), або title (назва)',
      catalogUrl: CATALOG_FORM_URL,
    }, { status: 400 });
  }

  try {
    const searchTerm = (query || author || title)!;
    const searchType = author ? 'author' : title ? 'title' : 'general';
    const searchField = searchType === 'author' ? 'author' : 'name_value';
    const condField   = searchType === 'author' ? 'author_cond' : 'name_cond';

    const formData = new URLSearchParams({
      [searchField]: searchTerm,
      [condField]: 'authorAnyWord',
      page_size: '10',
      page_number: page,
      sorting1: 'author',
      sorting2: 'name',
      sorting_direction1: 'asc',
      sorting_direction2: 'asc',
      i_lang: 'ukr',
    });

    const response = await fetch(CATALOG_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
      // 8s timeout via AbortSignal
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`Catalog responded with ${response.status}`);
    }

    const html = await response.text();
    const { books, total } = parseBooksFromHtml(html);

    return NextResponse.json({
      success: true,
      searchTerm,
      searchField: searchType,
      totalResults: total,
      currentPage: parseInt(page),
      books,
      catalogUrl: CATALOG_FORM_URL,
      message: books.length > 0
        ? `Знайдено ${total} документів. Показано ${books.length}.`
        : 'Результати пошуку доступні в електронному каталозі',
    });
  } catch (error) {
    console.error('Catalog search error:', error);
    // Always return a usable response with the direct catalog link
    return NextResponse.json({
      success: false,
      error: 'Помилка пошуку в каталозі',
      catalogUrl: CATALOG_FORM_URL,
    }, { status: 500 });
  }
}