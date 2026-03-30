import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, generateFingerprint } from '@/lib/rate-limit';
import { searchCatalog, CATALOG_FORM_URL } from '@/lib/catalog-search';

export async function GET(request: NextRequest) {
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

    const { books, total } = await searchCatalog(searchTerm, searchType, 10);

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
        : 'Результати пошуку доступні в електронному каталозі',
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
