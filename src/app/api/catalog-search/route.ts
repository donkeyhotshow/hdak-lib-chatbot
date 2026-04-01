import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, generateFingerprint } from '@/lib/rate-limit';
import { searchCatalog, CATALOG_FORM_URL } from '@/lib/catalog-search';
import { isForbiddenOrigin } from '@/lib/cors';

export async function GET(request: NextRequest) {
  // CORS check
  if (isForbiddenOrigin(request)) {
    return NextResponse.json({ error: 'Заборонене джерело' }, { status: 403 });
  }

  // Rate limiting
  const fingerprint = generateFingerprint(request);
  if (!(await checkRateLimit(fingerprint))) {
    return NextResponse.json({ error: 'Забагато запитів' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const query  = searchParams.get('q');
  const author = searchParams.get('author');
  const title  = searchParams.get('title');
  const page   = searchParams.get('page');

  if (!query && !author && !title) {
    return NextResponse.json({
      error: 'Вкажіть параметр пошуку: q (загальний), author (автор), або title (назва)',
      catalogUrl: CATALOG_FORM_URL,
    }, { status: 400 });
  }

  // Validate page number
  const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);

  try {
    const searchTerm = (query || author || title)!;
    const searchType = author ? 'author' : title ? 'title' : 'general';

    const result = await searchCatalog(searchTerm, searchType, 10, pageNum);
    const { books, total, unavailable } = result;

    // H14: distinguish catalog unavailable from empty results
    if (unavailable) {
      return NextResponse.json({
        success: false,
        error: 'Каталог тимчасово недоступний. Спробуйте пізніше або скористайтесь прямим посиланням.',
        catalogUrl: CATALOG_FORM_URL,
      }, { status: 503 });
    }

    return NextResponse.json({
      success: true,
      searchTerm,
      searchField: searchType,
      totalResults: total,
      currentPage: pageNum,
      books,
      catalogUrl: CATALOG_FORM_URL,
      message: books.length > 0
        ? `Знайдено ${total} документів. Показано ${books.length}.`
        : 'За вашим запитом нічого не знайдено в каталозі.',
    });
  } catch (error) {
    console.error('Помилка пошуку в каталозі:', error);
    return NextResponse.json({
      success: false,
      error: 'Помилка пошуку в каталозі',
      catalogUrl: CATALOG_FORM_URL,
    }, { status: 500 });
  }
}
