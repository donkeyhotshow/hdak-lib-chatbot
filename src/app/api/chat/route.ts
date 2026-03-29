import { NextRequest, NextResponse } from 'next/server';
import { db, conversations, messages as messagesTable } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import sanitizeHtml from 'sanitize-html';
import { checkRateLimit, generateFingerprint } from '@/lib/rate-limit';
import { LIBRARY, ALL_LINKS, isLibraryOpen } from '@/lib/constants';

// Constants
const MAX_MESSAGE_LENGTH = 2000;

function buildSystemPrompt(): string {
  const openStatus = isLibraryOpen()
    ? 'Зараз бібліотека ВІДКРИТА.'
    : 'Зараз бібліотека ЗАЧИНЕНА.';

  return `Ви — інтелектуальний асистент бібліотеки Харківської державної академії культури (ХДАК).
Відповідайте ВИКЛЮЧНО українською мовою, ввічливо, професійно та коротко.

=== СТАТУС ===
${openStatus}

=== КОНТАКТИ БІБЛІОТЕКИ ===
Назва: ${LIBRARY.name}
Адреса: ${LIBRARY.addressUk}
Телефон: ${LIBRARY.phoneFull}
Viber/Telegram: ${LIBRARY.messenger}
Email: ${LIBRARY.email}
Instagram: ${LIBRARY.instagram}
Facebook: ${LIBRARY.facebook}

=== ГРАФІК РОБОТИ ===
${LIBRARY.hours.weekdayUk}
${LIBRARY.hours.saturdayUk}
${LIBRARY.hours.sundayUk}
${LIBRARY.hours.sanitaryUk}

=== ПОСИЛАННЯ ===
Електронний каталог: ${ALL_LINKS.catalog_search}
Сайт бібліотеки: ${ALL_LINKS.main}
Репозитарій: ${ALL_LINKS.repository}
Нові надходження: ${ALL_LINKS.new_books}
Віртуальні виставки: ${ALL_LINKS.exhibitions}
Правила: ${ALL_LINKS.rules}
Контакти: ${ALL_LINKS.contacts}

=== НАУКОВІ БАЗИ (корпоративний доступ через бібліотеку) ===
Scopus: ${ALL_LINKS.scopus}
Web of Science: ${ALL_LINKS.wos}
ScienceDirect: ${ALL_LINKS.sciencedirect}
Springer: ${ALL_LINKS.springer}
Research4Life: ${ALL_LINKS.research4life}

=== ПРАВИЛА ВІДПОВІДЕЙ ===
1. Завжди відповідайте українською мовою.
2. Якщо користувач шукає книгу — порадьте скористатися каталогом: ${ALL_LINKS.catalog_search}
3. Якщо питання не стосується бібліотеки — ввічливо перенаправте на бібліотечні теми.
4. Надавайте конкретні посилання, коли це можливо.
5. Якщо не знаєте відповіді — запропонуйте звернутися напряму: ${LIBRARY.phoneFull} або ${LIBRARY.email}.`;
}

// OpenRouter Config
const OPENROUTER_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;
const OPENROUTER_URL = process.env.BUILT_IN_FORGE_API_URL || 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = process.env.AI_MODEL_NAME || 'openai/gpt-4o-mini';

// Groq Config
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL_NAME || 'llama-3.1-8b-instant';

interface ChatMessage {
  role: string;
  content: string;
}

interface CompletionResponse {
  choices: Array<{
    message?: {
      content?: string;
    };
  }>;
}

async function callOpenRouter(msgs: ChatMessage[]): Promise<CompletionResponse> {
  if (!OPENROUTER_API_KEY) throw new Error('OpenRouter API key missing');
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || '',
      'X-Title': process.env.OPENROUTER_X_TITLE || 'HDAK Library Chatbot',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: msgs,
    }),
  });
  if (!response.ok) throw new Error(`OpenRouter error: ${await response.text()}`);
  return response.json();
}

async function callGroq(msgs: ChatMessage[]): Promise<CompletionResponse> {
  if (!GROQ_API_KEY) throw new Error('Groq API key missing');
  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: msgs,
    }),
  });
  if (!response.ok) throw new Error(`Groq error: ${await response.text()}`);
  return response.json();
}

// Input validation
function validateMessage(message: unknown): { valid: boolean; error?: string; sanitized?: string } {
  if (typeof message !== 'string') return { valid: false, error: 'Message must be a string' };
  if (!message.trim()) return { valid: false, error: 'Message cannot be empty' };
  if (message.length > MAX_MESSAGE_LENGTH) return { valid: false, error: `Message exceeds ${MAX_MESSAGE_LENGTH} characters` };
  
  const sanitized = sanitizeHtml(message, {
    allowedTags: [],
    allowedAttributes: {}
  }).trim();

  if (!sanitized) return { valid: false, error: 'Invalid message content' };
  return { valid: true, sanitized };
}

// Search logic (Simplified regex for this task)
const SEARCH_PATTERNS = [
  { pattern: /знайди\s+книг[уи]\s+(.+)/i, type: 'title' as const },
  { pattern: /пошук\s+книг[иі]\s+(.+)/i, type: 'title' as const },
  { pattern: /знайти\s+книг[уи]\s+(.+)/i, type: 'title' as const },
];

function isBookSearchRequest(message: string) {
  for (const { pattern, type } of SEARCH_PATTERNS) {
    const match = message.match(pattern);
    if (match?.[1]?.trim()) return { isSearch: true, searchTerm: match[1].trim(), searchType: type };
  }
  return null;
}

async function searchCatalog(searchTerm: string, searchType: string) {
  // Simplified for refactoring - same logic as before but with fetch
  try {
    const formData = new URLSearchParams();
    formData.append(searchType === 'author' ? 'author' : 'name_value', searchTerm);
    formData.append('i_lang', 'ukr');
    
    const response = await fetch('https://library-service.com.ua:8443/khkhdak/DocumentSearchResult', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    if (!response.ok) return { books: [], total: 0 };
    const html = await response.text();
    const books: string[] = [];
    const tdRegex = /<td[^>]*width:\s*80%[^>]*>([\s\S]*?)<\/td>/gi;
    let match;
    while ((match = tdRegex.exec(html)) !== null && books.length < 5) {
      books.push(match[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim());
    }
    return { books, total: books.length };
  } catch {
    return { books: [], total: 0 };
  }
}

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin');
    if (origin && process.env.NODE_ENV === 'production') {
      const originHost = new URL(origin).hostname;
      const reqHost = new URL(request.url).hostname;
      const isLocal = ['localhost', '127.0.0.1', '0.0.0.0'].includes(originHost) && ['localhost', '127.0.0.1', '0.0.0.0'].includes(reqHost);
      if (originHost !== reqHost && !isLocal) {
        return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
      }
    }

    const fingerprint = generateFingerprint(request);
    if (!(await checkRateLimit(fingerprint))) {
      return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
    }

    const { conversationId, message } = await request.json();

    const validation = validateMessage(message);
    if (!validation.valid || !validation.sanitized) return NextResponse.json({ error: validation.error }, { status: 400 });

    const safeMessage = validation.sanitized;
    const searchRequest = isBookSearchRequest(safeMessage);
    let catalogContext = '';
    if (searchRequest) {
      const results = await searchCatalog(searchRequest.searchTerm, searchRequest.searchType);
      if (results.books.length > 0) {
        catalogContext = `\n\n[РЕЗУЛЬТАТИ ПОШУКУ: ${results.books.join('; ')}]`;
      }
    }

    let convId = conversationId;
    if (!convId) {
      const [newConv] = await db.insert(conversations).values({ 
        title: safeMessage.substring(0, 50) 
      }).returning();
      convId = newConv.id;
    }

    await db.insert(messagesTable).values({
      conversationId: convId,
      role: 'USER',
      content: safeMessage,
    });

    const history = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, convId))
      .orderBy(desc(messagesTable.createdAt))
      .limit(10);

    const apiMessages = [
      { role: 'system', content: buildSystemPrompt() + catalogContext },
      ...history.reverse().map(m => ({
        role: m.role.toLowerCase(),
        content: m.content
      }))
    ];

    let aiResponse: string;
    try {
      // Primary: OpenRouter
      const aiResult = await callOpenRouter(apiMessages);
      aiResponse = aiResult.choices[0]?.message?.content || 'Помилка отримання відповіді від OpenRouter.';
    } catch (orError) {
      console.error('OpenRouter failed, trying Groq fallback:', orError);
      try {
        // Fallback: Groq
        const groqResult = await callGroq(apiMessages);
        aiResponse = groqResult.choices[0]?.message?.content || 'Помилка отримання відповіді від Groq.';
      } catch (groqError) {
        console.error('Groq fallback also failed:', groqError);
        aiResponse = 'Вибачте, сталася технічна помилка. Спробуйте пізніше.';
      }
    }

    await db.insert(messagesTable).values({
      conversationId: convId,
      role: 'ASSISTANT',
      content: aiResponse,
    });

    return NextResponse.json({ conversationId: convId, response: aiResponse });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
