import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

// Constants
const MAX_MESSAGE_LENGTH = 2000;
const REQUEST_TIMEOUT_MS = 30000;

// Simplified system prompt - full version should be loaded from file/DB
const SYSTEM_PROMPT = `Ви - інтелектуальний асистент бібліотеки ХДАК. Відповідайте українською мовою, ввічливо та професійно. 
Допомагайте з пошуком книг, графіком роботи, ресурсами бібліотеки.
Каталог: https://library-service.com.ua:8443/khkhdak/DocumentSearchForm
Email: bibliohdak@gmail.com`;

// ZAI singleton with connection management
let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;
let zaiLastError: number = 0;

async function getZAI() {
  const now = Date.now();
  
  // Reset instance if last error was recent (circuit breaker)
  if (zaiLastError && now - zaiLastError < 60000) {
    zaiInstance = null;
  }
  
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

function resetZAI() {
  zaiInstance = null;
  zaiLastError = Date.now();
}

// Input validation
function validateMessage(message: unknown): { valid: boolean; error?: string } {
  if (typeof message !== 'string') {
    return { valid: false, error: 'Message must be a string' };
  }
  if (!message.trim()) {
    return { valid: false, error: 'Message cannot be empty' };
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return { valid: false, error: `Message exceeds ${MAX_MESSAGE_LENGTH} characters` };
  }
  // Basic XSS prevention - strip HTML tags (LLM should handle the rest)
  if (/<script|<iframe|<object|<embed|javascript:/i.test(message)) {
    return { valid: false, error: 'Invalid message content' };
  }
  return { valid: true };
}

// Sanitize user input for display
function sanitizeForDisplay(text: string): string {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Search patterns for book search
const SEARCH_PATTERNS = [
  { pattern: /знайди\s+книг[уи]\s+(.+)/i, type: 'title' as const },
  { pattern: /пошук\s+книг[иі]\s+(.+)/i, type: 'title' as const },
  { pattern: /знайти\s+книг[уи]\s+(.+)/i, type: 'title' as const },
  { pattern: /шукай\s+книг[уи]\s+(.+)/i, type: 'title' as const },
  { pattern: /знайди\s+(.+)\s+в\s+каталозі/i, type: 'title' as const },
  { pattern: /пошук\s+за\s+автор[оа]м\s+(.+)/i, type: 'author' as const },
  { pattern: /книги\s+автор[а]\s+(.+)/i, type: 'author' as const },
  { pattern: /знайди\s+(.+)\s+автора/i, type: 'author' as const },
  { pattern: /знайди\s+книгу\s+(.+)/i, type: 'title' as const },
  { pattern: /шукати\s+(.+)\s+в\s+каталозі/i, type: 'title' as const },
  { pattern: /пошук\s+(.+)\s+в\s+каталозі/i, type: 'title' as const },
  { pattern: /знайди\s+в\s+каталозі\s+(.+)/i, type: 'title' as const },
  { pattern: /є\s+книга\s+(.+)\?/i, type: 'title' as const },
  { pattern: /чи\s+є\s+книга\s+(.+)/i, type: 'title' as const },
];

function isBookSearchRequest(message: string): { isSearch: boolean; searchTerm: string; searchType: 'author' | 'title' | 'general' } | null {
  for (const { pattern, type } of SEARCH_PATTERNS) {
    const match = message.match(pattern);
    if (match?.[1]?.trim()) {
      return { isSearch: true, searchTerm: match[1].trim(), searchType: type };
    }
  }
  return null;
}

// Catalog search with timeout
async function searchCatalog(searchTerm: string, searchType: 'author' | 'title' | 'general'): Promise<{ books: string[]; total: number }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  
  try {
    const searchField = searchType === 'author' ? 'author' : 'name_value';
    const condField = searchType === 'author' ? 'author_cond' : 'name_cond';
    
    const formData = new URLSearchParams();
    formData.append(searchField, searchTerm);
    formData.append(condField, 'authorAnyWord');
    formData.append('page_size', '10');
    formData.append('page_number', '1');
    formData.append('sorting1', 'author');
    formData.append('sorting_direction1', 'asc');
    formData.append('i_lang', 'ukr');
    
    const response = await fetch('https://library-service.com.ua:8443/khkhdak/DocumentSearchResult', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return { books: [], total: 0 };
    }
    
    const html = await response.text();
    const books: string[] = [];
    
    const tdRegex = /<td[^>]*width:\s*80%[^>]*>([\s\S]*?)<\/td>/gi;
    let match;
    
    while ((match = tdRegex.exec(html)) !== null && books.length < 5) {
      const text = match[1]
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (text.length > 30 && text.includes('/') && /\d{4}\./.test(text)) {
        books.push(text);
      }
    }
    
    const countMatch = html.match(/(\d+)\s*-\s*(\d+)\s+з\s+(\d+)/);
    const total = countMatch ? parseInt(countMatch[3], 10) : books.length;
    
    return { books, total };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name !== 'AbortError') {
      console.error('Catalog search error:', error);
    }
    return { books: [], total: 0 };
  }
}

// POST handler
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, message } = body;

    // Validate input
    const validation = validateMessage(message);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Check for book search
    const searchRequest = isBookSearchRequest(message);
    let catalogContext = '';
    let searchResults = null;
    
    if (searchRequest) {
      const results = await searchCatalog(searchRequest.searchTerm, searchRequest.searchType);
      
      if (results.books.length > 0) {
        searchResults = results;
        catalogContext = `\n\n[РЕЗУЛЬТАТИ ПОШУКУ: Знайдено ${results.total} документів за запитом "${searchRequest.searchTerm}".
${results.books.map((b, i) => `${i + 1}. ${b}`).join('\n')}
Посилання: https://library-service.com.ua:8443/khkhdak/DocumentSearchForm]`;
      } else {
        catalogContext = `\n\n[ПОШУК "${searchRequest.searchTerm}" не дав результатів. Запропонуйте інший запит або зв'яжіться з бібліотекарем.]`;
      }
    }

    // Get or create conversation
    let conversation;
    if (conversationId && typeof conversationId === 'string') {
      conversation = await db.conversation.findUnique({
        where: { id: conversationId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
    }

    if (!conversation) {
      const title = message.length > 50 ? message.substring(0, 50) + '...' : message;
      conversation = await db.conversation.create({
        data: { title: sanitizeForDisplay(title) },
        include: { messages: true },
      });
    }

    // Save user message
    await db.message.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        content: message,
      },
    });

    // Build messages for LLM (limit context window)
    const recentMessages = conversation.messages.slice(-10); // Last 10 messages only
    const messages = [
      { role: 'assistant' as const, content: SYSTEM_PROMPT + catalogContext },
      ...recentMessages.map((m) => ({
        role: (m.role === 'USER' ? 'user' : 'assistant') as const,
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ];

    // Get AI response with error handling
    let aiResponse: string;
    try {
      const zai = await getZAI();
      const completion = await zai.chat.completions.create({
        messages,
        thinking: { type: 'disabled' },
      });
      aiResponse = completion.choices[0]?.message?.content || 'Вибачте, не вдалося отримати відповідь.';
    } catch (aiError) {
      console.error('AI error:', aiError);
      resetZAI();
      aiResponse = 'Вибачте, сталася помилка. Спробуйте пізніше.';
    }

    // Save AI response
    await db.message.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        content: aiResponse,
      },
    });

    // Update conversation
    await db.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      conversationId: conversation.id,
      response: aiResponse,
      catalogSearch: searchResults ? {
        term: searchRequest?.searchTerm,
        type: searchRequest?.searchType,
        total: searchResults.total,
        results: searchResults.books,
        url: 'https://library-service.com.ua:8443/khkhdak/DocumentSearchForm'
      } : null
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
