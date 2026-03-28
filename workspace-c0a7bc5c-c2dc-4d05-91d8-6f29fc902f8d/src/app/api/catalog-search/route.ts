import { NextRequest, NextResponse } from 'next/server';

interface BookResult {
  title: string;
  fullDescription: string;
  year: string;
  hasFile: boolean;
}

// Parse book info from catalog HTML
function parseBooksFromHtml(html: string): { books: BookResult[]; total: number } {
  const books: BookResult[] = [];
  
  // Find all td cells that contain book descriptions (width: 80%)
  const tdRegex = /<td[^>]*width:\s*80%[^>]*>([\s\S]*?)<\/td>/gi;
  let match;
  
  while ((match = tdRegex.exec(html)) !== null) {
    const cellContent = match[1];
    
    // Clean up HTML tags and whitespace
    const text = cellContent
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Check if this looks like a book description
    if (text.length > 30 && text.includes('/') && /\d{4}\./.test(text)) {
      // Extract year
      const yearMatch = text.match(/—\s*[^,]+,\s*(\d{4})\./);
      const year = yearMatch?.[1] || '';
      
      // Extract title (before the first /)
      const titleMatch = text.match(/^([^/\[]+)/);
      const title = titleMatch?.[1]?.trim() || '';
      
      // Check for electronic version
      const hasFile = text.includes('Електронний') || cellContent.includes('DocumentDownload');
      
      books.push({
        title,
        fullDescription: text,
        year,
        hasFile
      });
    }
    
    if (books.length >= 10) break;
  }
  
  // Get total count
  const countMatch = html.match(/(\d+)\s*-\s*(\d+)\s+з\s+(\d+)/);
  const total = countMatch ? parseInt(countMatch[3]) : books.length;
  
  return { books, total };
}

// GET /api/catalog-search - Search in catalog
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const author = searchParams.get('author');
  const title = searchParams.get('title');
  const page = searchParams.get('page') || '1';
  
  if (!query && !author && !title) {
    return NextResponse.json({ 
      error: 'Вкажіть параметр пошуку: q (загальний), author (автор), або title (назва)',
      catalogUrl: 'https://library-service.com.ua:8443/khkhdak/DocumentSearchForm'
    }, { status: 400 });
  }

  try {
    const searchTerm = query || author || title || '';
    const searchType = author ? 'author' : title ? 'title' : 'general';
    
    // Build form data for POST request
    const searchField = searchType === 'author' ? 'author' : 'name_value';
    const condField = searchType === 'author' ? 'author_cond' : 'name_cond';
    
    const formData = new URLSearchParams();
    formData.append(searchField, searchTerm);
    formData.append(condField, 'authorAnyWord');
    formData.append('page_size', '10');
    formData.append('page_number', page);
    formData.append('sorting1', 'author');
    formData.append('sorting2', 'name');
    formData.append('sorting_direction1', 'asc');
    formData.append('sorting_direction2', 'asc');
    formData.append('i_lang', 'ukr');
    
    // Make request to catalog
    const response = await fetch('https://library-service.com.ua:8443/khkhdak/DocumentSearchResult', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });
    
    const html = await response.text();
    
    // Parse results
    const { books, total } = parseBooksFromHtml(html);
    
    return NextResponse.json({
      success: true,
      searchTerm,
      searchField: searchType,
      totalResults: total,
      currentPage: parseInt(page),
      books: books,
      catalogUrl: 'https://library-service.com.ua:8443/khkhdak/DocumentSearchForm',
      message: books.length > 0 
        ? `Знайдено ${total} документів. Показано ${books.length}.`
        : 'Результати пошуку доступні в електронному каталозі'
    });
    
  } catch (error) {
    console.error('Catalog search error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Помилка пошуку в каталозі',
      catalogUrl: 'https://library-service.com.ua:8443/khkhdak/DocumentSearchForm'
    }, { status: 500 });
  }
}
