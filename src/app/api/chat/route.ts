import { NextRequest, NextResponse } from 'next/server';
import { db, conversations, messages as messagesTable } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import sanitizeHtml from 'sanitize-html';
import { checkRateLimit, generateFingerprint } from '@/lib/rate-limit';
import { LIBRARY, ALL_LINKS, isLibraryOpen } from '@/lib/constants';

const MAX_MESSAGE_LENGTH = 2000;

// Fix #12: cache prompt, invalidate every 60s (isLibraryOpen changes)
let _promptCache: { value: string; ts: number } | null = null;

function buildSystemPrompt(): string {
  const now = Date.now();
  if (_promptCache && now - _promptCache.ts < 60_000) return _promptCache.value;

  const openStatus = isLibraryOpen()
    ? '🟢 Зараз бібліотека ВІДКРИТА.'
    : '🔴 Зараз бібліотека ЗАЧИНЕНА.';

  const result = `Ви — інтелектуальний асистент бібліотеки Харківської державної академії культури (ХДАК).
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
  _promptCache = { value: result, ts: now };
  return result;
}

// ─── LLM config ──────────────────────────────────────────────────────────────

const GROQ_API_KEY = process.env.GROQ_API_KEY?.trim();
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = (process.env.GROQ_MODEL_NAME || 'llama-3.3-70b-versatile').trim();

const QWEN_API_KEY = process.env.QWEN_API_KEY?.trim();
const QWEN_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';
const QWEN_MODEL = (process.env.QWEN_MODEL_NAME || 'qwen-turbo').trim();

interface ChatMessage { role: string; content: string; }

// ─── Validation ───────────────────────────────────────────────────────────────

function validateMessage(message: unknown): { valid: boolean; error?: string; sanitized?: string } {
  if (typeof message !== 'string') return { valid: false, error: 'Message must be a string' };
  if (!message.trim()) return { valid: false, error: 'Message cannot be empty' };
  if (message.length > MAX_MESSAGE_LENGTH) return { valid: false, error: `Message exceeds ${MAX_MESSAGE_LENGTH} characters` };
  const sanitized = sanitizeHtml(message, { allowedTags: [], allowedAttributes: {} }).trim();
  if (!sanitized) return { valid: false, error: 'Invalid message content' };
  return { valid: true, sanitized };
}

// ─── Catalog search ───────────────────────────────────────────────────────────

interface SearchIntent { searchTerm: string; searchType: 'title' | 'author' | 'general'; }
interface BookResult { title: string; description: string; year: string; hasFile: boolean; }

const TITLE_PATTERNS = [
  /(?:знайди|знайти|пошук|шукаю|шукати|є|маєте|чи є|чи маєте|є у вас|маєте у каталозі)\s+книг[уиі]?\s+[«"']?(.+?)[»"']?$/i,
  /книг[уиі]\s+[«"'](.+?)[»"']/i,
  /книг[уиі]\s+(.{3,60})(?:\s+є|\s+маєте|$)/i,
  /[«"'](.+?)[»"']\s+(?:є|маєте|знайти|пошук)/i,
  /(?:є|маєте|є у вас)\s+[«"'](.+?)[»"']/i,
  /(?:шукаю|шукати)\s+[«"']?(.+?)[»"']?$/i,
];

const AUTHOR_PATTERNS = [
  /(?:книги|твори|роботи|праці)\s+(?:автора\s+)?[«"']?([А-ЯҐЄІЇа-яґєії\w\s\-]{3,50})[»"']?$/i,
  /автор[аи]?\s+[«"']?([А-ЯҐЄІЇа-яґєії\w\s\-]{3,50})[»"']?/i,
  /(?:є|маєте)\s+(?:щось\s+)?(?:від|від автора)\s+([А-ЯҐЄІЇа-яґєії\w\s\-]{3,50})/i,
];

function detectSearchIntent(message: string): SearchIntent | null {
  for (const pattern of AUTHOR_PATTERNS) {
    const term = message.match(pattern)?.[1]?.trim();
    if (term && term.length >= 3) return { searchTerm: term, searchType: 'author' };
  }
  for (const pattern of TITLE_PATTERNS) {
    const term = message.match(pattern)?.[1]?.trim();
    if (term && term.length >= 3) return { searchTerm: term, searchType: 'title' };
  }
  const quotedMatch = message.match(/[«"'](.{3,80})[»"']/);
  if (quotedMatch && /книг|каталог|бібліотек|є у вас|маєте|шукаю/i.test(message)) {
    return { searchTerm: quotedMatch[1].trim(), searchType: 'title' };
  }
  return null;
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
      const raw = match[1].replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      if (raw.length < 20) continue;
      const year = raw.match(/[,—–]\s*(\d{4})[.\s]/)?.[1] ?? '';
      const title = raw.match(/^([^/[]+)/)?.[1]?.trim() ?? raw.substring(0, 60);
      const hasFile = /електронн/i.test(raw) || /DocumentDownload/i.test(match[1]);
      books.push({ title, description: raw.substring(0, 200), year, hasFile });
    }

    const total = parseInt(html.match(/(\d+)\s*[-–]\s*\d+\s+з\s+(\d+)/)?.[2] ?? '0') || books.length;
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
    return `\n\n[РЕЗУЛЬТАТИ КАТАЛОГУ: Пошук за ${typeLabel} "${searchTerm}" — нічого не знайдено. Посилання для ручного пошуку: ${ALL_LINKS.catalog_search}]`;
  }

  const list = books.map((b, i) => {
    const fileNote = b.hasFile ? ' 📄 (є електронна версія)' : '';
    const yearNote = b.year ? ` (${b.year})` : '';
    return `${i + 1}. ${b.title}${yearNote}${fileNote}`;
  }).join('\n');

  const moreNote = total > books.length ? `\nВсього знайдено: ${total}. Показано перші ${books.length}.` : '';
  return `\n\n[РЕЗУЛЬТАТИ КАТАЛОГУ: Знайдено за ${typeLabel} "${searchTerm}" (${total} результатів):\n${list}${moreNote}\nПосилання для повного пошуку: ${ALL_LINKS.catalog_search}]`;
}

// ─── Streaming LLM call ───────────────────────────────────────────────────────

async function streamLLM(
  msgs: ChatMessage[],
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  signal: AbortSignal
): Promise<string> {
  const sendChunk = (text: string) => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
  };

  const tryProvider = async (url: string, apiKey: string, model: string): Promise<string> => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: msgs, max_tokens: 1024, temperature: 0.7, stream: true }),
      signal,
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    if (!res.body) throw new Error('No response body');

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let full = '';
    let buf = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') continue;
        try {
          const chunk = JSON.parse(data);
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) {
            full += delta;
            sendChunk(delta);
          }
        } catch { /* skip malformed */ }
      }
    }
    return full;
  };

  // Try Groq first
  if (GROQ_API_KEY) {
    try {
      return await tryProvider(GROQ_URL, GROQ_API_KEY, GROQ_MODEL);
    } catch (e) {
      console.error('Groq stream failed:', e);
    }
  }

  // Fallback: Qwen
  if (QWEN_API_KEY) {
    try {
      return await tryProvider(QWEN_URL, QWEN_API_KEY, QWEN_MODEL);
    } catch (e) {
      console.error('Qwen stream failed:', e);
    }
  }

  const fallback = 'Вибачте, сталася технічна помилка. Спробуйте пізніше.';
  sendChunk(fallback);
  return fallback;
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // CORS check
  const origin = request.headers.get('origin');
  if (origin && process.env.NODE_ENV === 'production') {
    const originHost = new URL(origin).hostname;
    const reqHost = new URL(request.url).hostname;
    const isLocal = ['localhost', '127.0.0.1', '0.0.0.0'].includes(originHost);
    if (originHost !== reqHost && !isLocal) {
      return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
    }
  }

  // Rate limit
  const fingerprint = generateFingerprint(request);
  if (!(await checkRateLimit(fingerprint))) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
  }

  // Parse body — Fix #4: return 400 on bad JSON
  let body: { conversationId?: string; message?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { conversationId, message } = body;
  const validation = validateMessage(message);
  if (!validation.valid || !validation.sanitized) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const safeMessage = validation.sanitized;

  // Catalog search
  let catalogContext = '';
  const intent = detectSearchIntent(safeMessage);
  if (intent) {
    const result = await searchCatalog(intent.searchTerm, intent.searchType);
    catalogContext = buildCatalogContext(intent, result);
  }

  // Persist user message & get/create conversation
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

  const apiMessages: ChatMessage[] = [
    { role: 'system', content: buildSystemPrompt() + catalogContext },
    ...[...history].reverse().map(m => ({ role: m.role.toLowerCase(), content: m.content })),
  ];

  // Fix #5: Streaming SSE response
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Send conversationId first so client can track it
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ conversationId: convId })}\n\n`));

      const fullResponse = await streamLLM(apiMessages, controller, encoder, request.signal);

      // Persist assistant response
      try {
        await db.insert(messagesTable).values({ conversationId: convId, role: 'ASSISTANT', content: fullResponse });
      } catch (e) {
        console.error('Failed to persist assistant message:', e);
      }

      // Signal done
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, conversationId: convId })}\n\n`));
      controller.close();
    },
    cancel() {
      // Client disconnected — nothing to clean up
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
