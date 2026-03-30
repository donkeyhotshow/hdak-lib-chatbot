import { NextRequest, NextResponse } from 'next/server';
import { db, conversations, messages as messagesTable } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import sanitizeHtml from 'sanitize-html';
import { checkRateLimit, generateFingerprint } from '@/lib/rate-limit';
import { LIBRARY, ALL_LINKS, isLibraryOpen } from '@/lib/constants';

const MAX_MESSAGE_LENGTH = 2000;

function buildSystemPrompt(): string {
  const openStatus = isLibraryOpen()
    ? '🟢 Зараз бібліотека ВІДКРИТА.'
    : '🔴 Зараз бібліотека ЗАЧИНЕНА.';

  return `Ви — інтелектуальний асистент бібліотеки Харківської державної академії культури (ХДАК).
Відповідайте ВИКЛЮЧНО українською мовою, ввічливо, професійно та лаконічно.
Використовуйте тільки факти з цього промпту — не вигадуйте інформацію.

=== ПОТОЧНИЙ СТАТУС ===
${openStatus}

=== КОНТАКТИ ===
Адреса: ${LIBRARY.addressUk}
Телефон: ${LIBRARY.phoneFull}
Viber/Telegram: ${LIBRARY.messenger}
Email: ${LIBRARY.email}
Instagram: ${LIBRARY.instagram}
Facebook: ${LIBRARY.facebook}
Сайт: ${ALL_LINKS.main}

=== ГРАФІК РОБОТИ ===
Абонементи та інформаційно-бібліографічний відділ:
- Пн–Пт: 9:00–16:45 (перерва 13:00–13:45)
- Субота, неділя — вихідні
- Санітарний день — остання п'ятниця місяця

Читальна зала:
- Пн–Пт: 9:00–16:45
- Субота: 9:00–13:30
- Санітарний день — останній четвер місяця

Сектор автоматизації:
- Пн–Пт: 9:00–16:45 (перерва 13:00–13:45)
- Субота, неділя — вихідні
- Санітарний день — останній четвер місяця

=== РЕСУРСИ БІБЛІОТЕКИ ===
Електронний каталог (пошук книг): ${ALL_LINKS.catalog_search}
Репозитарій ХДАК (наукові праці): ${ALL_LINKS.repository}
Електронна бібліотека «Культура України»: http://elib.nplu.org/
Нові надходження: ${ALL_LINKS.new_books}
Віртуальні виставки: ${ALL_LINKS.exhibitions}
Артефактні книжкові видання: ${ALL_LINKS.artifacts}

=== НАУКОВА ПІДТРИМКА ===
Пошук наукової інформації (заповнити форму): ${ALL_LINKS.sci_search}
Авторські профілі (Google Scholar, ORCID, WoS): ${ALL_LINKS.author_profiles}
Публікації вчених ХДАК: ${ALL_LINKS.publications}

Наукові бази з корпоративним доступом через бібліотеку:
- Scopus: ${ALL_LINKS.scopus}
- Web of Science: ${ALL_LINKS.wos}
- ScienceDirect: ${ALL_LINKS.sciencedirect}
- Springer Link: ${ALL_LINKS.springer}
- Research4Life: ${ALL_LINKS.research4life}

=== ПРАВИЛА КОРИСТУВАННЯ БІБЛІОТЕКОЮ ===
Повний текст: ${ALL_LINKS.rules}
Ключові правила:
1. Відвідувати бібліотеку лише з читацьким квитком
2. Не передавати квиток іншим особам
3. Підписуватися за кожне отримане видання
4. Повертати видання у встановлений строк
5. Дотримуватися тиші, не використовувати мобільний телефон
6. При втраті — замінити рівноцінним виданням або ксерокопією
7. Наприкінці семестру/навчального року повернути всі видання

=== ЯК ЗАПИСАТИСЯ ДО БІБЛІОТЕКИ ===
Під час воєнного стану бібліотека обслуговує через:
- Email: ${LIBRARY.email}
- Facebook Messenger: група "Бібліотека ХДАК"
- Viber: ${LIBRARY.messenger}
- Telegram: ${LIBRARY.messenger}
- Instagram: hdak_lib

=== КОРИСНІ ПОСИЛАННЯ ===
Springer Link (повнотекстові ресурси): https://link.springer.com/
Верховна Рада України (закони): http://zakon1.rada.gov.ua/laws/main
Каталог DOAJ: ${ALL_LINKS.doaj}
Всі корисні посилання: ${ALL_LINKS.helpful_links}

=== ВИДАВНИЧА ДІЯЛЬНІСТЬ ===
«Віват, Академіє!» — видання ХДАК
Праці викладачів та співробітників
Біобібліографічні та бібліографічні покажчики

=== ПРАВИЛА ВІДПОВІДЕЙ ===
1. Завжди відповідайте українською мовою.
2. Якщо в контексті є [РЕЗУЛЬТАТИ КАТАЛОГУ] — використовуйте їх. Якщо знайдено — перелічіть книги з роком видання. Якщо не знайдено — скажіть про це і дайте посилання на ручний пошук.
3. На питання про книги — спочатку перевіряйте [РЕЗУЛЬТАТИ КАТАЛОГУ], потім давайте посилання на каталог.
4. На питання про наукові джерела — направляйте на ${ALL_LINKS.sci_search} або наукові бази.
5. Якщо питання не стосується бібліотеки — ввічливо поверніть до бібліотечних тем.
6. Якщо не знаєте точної відповіді — запропонуйте звернутися: ${LIBRARY.phoneFull} або ${LIBRARY.email}.
7. Надавайте конкретні посилання у відповідях.`;
}

// Groq Config (Primary)
const GROQ_API_KEY = process.env.GROQ_API_KEY?.trim();
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = (process.env.GROQ_MODEL_NAME || 'llama-3.3-70b-versatile').trim();

// Qwen via DashScope Config (Fallback)
const QWEN_API_KEY = process.env.QWEN_API_KEY?.trim();
const QWEN_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';
const QWEN_MODEL = (process.env.QWEN_MODEL_NAME || 'qwen-turbo').trim();

interface ChatMessage { role: string; content: string; }
interface CompletionResponse { choices: Array<{ message?: { content?: string } }>; }

async function callGroq(msgs: ChatMessage[]): Promise<CompletionResponse> {
  if (!GROQ_API_KEY) throw new Error('Groq API key missing');
  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({ model: GROQ_MODEL, messages: msgs }),
  });
  if (!response.ok) throw new Error(`Groq error: ${await response.text()}`);
  return response.json();
}

async function callQwen(msgs: ChatMessage[]): Promise<CompletionResponse> {
  if (!QWEN_API_KEY) throw new Error('Qwen API key missing');
  const response = await fetch(QWEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${QWEN_API_KEY}` },
    body: JSON.stringify({ model: QWEN_MODEL, messages: msgs }),
  });
  if (!response.ok) throw new Error(`Qwen error: ${await response.text()}`);
  return response.json();
}

function validateMessage(message: unknown): { valid: boolean; error?: string; sanitized?: string } {
  if (typeof message !== 'string') return { valid: false, error: 'Message must be a string' };
  if (!message.trim()) return { valid: false, error: 'Message cannot be empty' };
  if (message.length > MAX_MESSAGE_LENGTH) return { valid: false, error: `Message exceeds ${MAX_MESSAGE_LENGTH} characters` };
  const sanitized = sanitizeHtml(message, { allowedTags: [], allowedAttributes: {} }).trim();
  if (!sanitized) return { valid: false, error: 'Invalid message content' };
  return { valid: true, sanitized };
}

// ─── Catalog search detection ────────────────────────────────────────────────

interface SearchIntent {
  searchTerm: string;
  searchType: 'title' | 'author' | 'general';
}

// Broad patterns: title search
const TITLE_PATTERNS = [
  /(?:знайди|знайти|пошук|шукаю|шукати|є|маєте|чи є|чи маєте|є у вас|маєте у каталозі)\s+книг[уиі]?\s+[«"']?(.+?)[»"']?$/i,
  /книг[уиі]\s+[«"'](.+?)[»"']/i,
  /книг[уиі]\s+(.{3,60})(?:\s+є|\s+маєте|$)/i,
  /[«"'](.+?)[»"']\s+(?:є|маєте|знайти|пошук)/i,
  /(?:є|маєте|є у вас)\s+[«"'](.+?)[»"']/i,
  /(?:шукаю|шукати)\s+[«"']?(.+?)[»"']?$/i,
];

// Author patterns
const AUTHOR_PATTERNS = [
  /(?:книги|твори|роботи|праці)\s+(?:автора\s+)?[«"']?([А-ЯҐЄІЇа-яґєії\w\s\-]{3,50})[»"']?$/i,
  /автор[аи]?\s+[«"']?([А-ЯҐЄІЇа-яґєії\w\s\-]{3,50})[»"']?/i,
  /(?:є|маєте)\s+(?:щось\s+)?(?:від|від автора)\s+([А-ЯҐЄІЇа-яґєії\w\s\-]{3,50})/i,
];

function detectSearchIntent(message: string): SearchIntent | null {
  // Try author patterns first
  for (const pattern of AUTHOR_PATTERNS) {
    const m = message.match(pattern);
    const term = m?.[1]?.trim();
    if (term && term.length >= 3) {
      return { searchTerm: term, searchType: 'author' };
    }
  }
  // Try title patterns
  for (const pattern of TITLE_PATTERNS) {
    const m = message.match(pattern);
    const term = m?.[1]?.trim();
    if (term && term.length >= 3) {
      return { searchTerm: term, searchType: 'title' };
    }
  }
  // Fallback: if message contains book-related keywords + quoted text
  const quotedMatch = message.match(/[«"'](.{3,80})[»"']/);
  if (quotedMatch && /книг|каталог|бібліотек|є у вас|маєте|шукаю/i.test(message)) {
    return { searchTerm: quotedMatch[1].trim(), searchType: 'title' };
  }
  return null;
}

// ─── Catalog fetch ────────────────────────────────────────────────────────────

interface BookResult {
  title: string;
  description: string;
  year: string;
  hasFile: boolean;
}

async function searchCatalog(searchTerm: string, searchType: 'title' | 'author' | 'general'): Promise<{ books: BookResult[]; total: number }> {
  try {
    const formData = new URLSearchParams();
    if (searchType === 'author') {
      formData.append('author', searchTerm);
      formData.append('author_cond', 'authorAnyWord');
    } else {
      formData.append('name_value', searchTerm);
      formData.append('name_cond', 'authorAnyWord');
    }
    formData.append('page_size', '8');
    formData.append('page_number', '1');
    formData.append('sorting1', 'author');
    formData.append('sorting_direction1', 'asc');
    formData.append('i_lang', 'ukr');

    const response = await fetch('https://library-service.com.ua:8443/khkhdak/DocumentSearchResult', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return { books: [], total: 0 };
    const html = await response.text();

    const books: BookResult[] = [];
    const tdRegex = /<td[^>]*width:\s*80%[^>]*>([\s\S]*?)<\/td>/gi;
    let match;

    while ((match = tdRegex.exec(html)) !== null && books.length < 8) {
      const raw = match[1]
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (raw.length < 20) continue;

      const yearMatch = raw.match(/[,—–]\s*(\d{4})[.\s]/);
      const year = yearMatch?.[1] ?? '';
      const titleMatch = raw.match(/^([^/[]+)/);
      const title = titleMatch?.[1]?.trim() ?? raw.substring(0, 60);
      const hasFile = /електронн/i.test(raw) || /DocumentDownload/i.test(match[1]);

      books.push({ title, description: raw.substring(0, 200), year, hasFile });
    }

    const countMatch = html.match(/(\d+)\s*[-–]\s*\d+\s+з\s+(\d+)/);
    const total = countMatch ? parseInt(countMatch[2]) : books.length;

    return { books, total };
  } catch {
    return { books: [], total: 0 };
  }
}

function buildCatalogContext(intent: SearchIntent, result: { books: BookResult[]; total: number }): string {
  const { searchTerm, searchType } = intent;
  const { books, total } = result;
  const typeLabel = searchType === 'author' ? 'автором' : 'назвою';

  if (books.length === 0) {
    return `\n\n[РЕЗУЛЬТАТИ КАТАЛОГУ: Пошук за ${typeLabel} "${searchTerm}" — нічого не знайдено в електронному каталозі ХДАК. Можливо, книга є під іншою назвою або відсутня у фонді. Посилання для ручного пошуку: ${ALL_LINKS.catalog_search}]`;
  }

  const list = books.map((b, i) => {
    const fileNote = b.hasFile ? ' 📄 (є електронна версія)' : '';
    const yearNote = b.year ? ` (${b.year})` : '';
    return `${i + 1}. ${b.title}${yearNote}${fileNote}`;
  }).join('\n');

  const moreNote = total > books.length ? `\nВсього знайдено: ${total}. Показано перші ${books.length}.` : '';

  return `\n\n[РЕЗУЛЬТАТИ КАТАЛОГУ: Знайдено за ${typeLabel} "${searchTerm}" (${total} результатів):\n${list}${moreNote}\nПосилання для повного пошуку: ${ALL_LINKS.catalog_search}]`;
}

// ─── POST handler ─────────────────────────────────────────────────────────────

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
    if (!validation.valid || !validation.sanitized) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const safeMessage = validation.sanitized;

    // Detect and run catalog search
    let catalogContext = '';
    const intent = detectSearchIntent(safeMessage);
    if (intent) {
      const result = await searchCatalog(intent.searchTerm, intent.searchType);
      catalogContext = buildCatalogContext(intent, result);
    }

    // Persist conversation
    let convId = conversationId;
    if (!convId) {
      const [newConv] = await db.insert(conversations).values({
        title: safeMessage.substring(0, 50),
      }).returning();
      convId = newConv.id;
    }

    await db.insert(messagesTable).values({ conversationId: convId, role: 'USER', content: safeMessage });

    const history = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, convId))
      .orderBy(desc(messagesTable.createdAt))
      .limit(10);

    const apiMessages = [
      { role: 'system', content: buildSystemPrompt() + catalogContext },
      ...history.reverse().map(m => ({ role: m.role.toLowerCase(), content: m.content })),
    ];

    // Call LLM
    let aiResponse: string;
    try {
      const groqResult = await callGroq(apiMessages);
      aiResponse = groqResult.choices[0]?.message?.content || '';
      if (!aiResponse) throw new Error('Empty Groq response');
    } catch (groqError) {
      console.error('Groq failed:', groqError);
      try {
        const qwenResult = await callQwen(apiMessages);
        aiResponse = qwenResult.choices[0]?.message?.content || '';
        if (!aiResponse) throw new Error('Empty Qwen response');
      } catch (qwenError) {
        console.error('Qwen fallback failed:', qwenError);
        aiResponse = 'Вибачте, сталася технічна помилка. Спробуйте пізніше.';
      }
    }

    await db.insert(messagesTable).values({ conversationId: convId, role: 'ASSISTANT', content: aiResponse });

    return NextResponse.json({ conversationId: convId, response: aiResponse });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
