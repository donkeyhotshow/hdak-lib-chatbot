import { NextRequest, NextResponse } from 'next/server';
import { db, conversations, messages as messagesTable } from '@/lib/db';
import { eq, desc, and } from 'drizzle-orm';
import { stripHtml } from '@/lib/sanitize';
import { checkRateLimit, generateFingerprint } from '@/lib/rate-limit';
import { ALL_LINKS } from '@/lib/constants';
import { buildSystemPrompt } from '@/lib/prompts';
import { detectSearchIntent, searchCatalog, buildCatalogContext } from '@/lib/catalog-search';
import { isForbiddenOrigin } from '@/lib/cors';
import { isValidUuid, getSessionIdFromRequest } from '@/lib/validation';

const MAX_MESSAGE_LENGTH = 2000;

// ─── LLM config ──────────────────────────────────────────────────────────────

const GROQ_API_KEY = process.env.GROQ_API_KEY?.trim();
const GROQ_URL = process.env.GROQ_URL || 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = (process.env.GROQ_MODEL_NAME || 'llama-3.3-70b-versatile').trim();

const QWEN_API_KEY = process.env.QWEN_API_KEY?.trim();
const QWEN_URL = process.env.QWEN_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';
const QWEN_MODEL = (process.env.QWEN_MODEL_NAME || 'qwen-turbo').trim();

interface ChatMessage { role: string; content: string; }

// Fallback error message — not persisted to DB to avoid polluting conversation history
const FALLBACK_ERROR = 'Вибачте, сталася технічна помилка. Спробуйте пізніше.';

// ─── Validation ───────────────────────────────────────────────────────────────

function validateMessage(message: unknown): { valid: boolean; error?: string; sanitized?: string } {
  if (typeof message !== 'string') return { valid: false, error: 'Повідомлення має бути рядком' };
  if (!message.trim()) return { valid: false, error: 'Повідомлення не може бути порожнім' };
  if (message.length > MAX_MESSAGE_LENGTH) return { valid: false, error: `Повідомлення перевищує ${MAX_MESSAGE_LENGTH} символів` };
  const sanitized = stripHtml(message).trim();
  if (!sanitized) return { valid: false, error: 'Недійсний вміст повідомлення' };
  return { valid: true, sanitized };
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
    // C6+H11: combine client disconnect signal with 30s timeout
    // Create combined controller; always clear timer in finally to prevent leak
    const tc = new AbortController();
    const timer = setTimeout(() => tc.abort(new Error('LLM timeout')), 30_000);
    const onClientAbort = () => { clearTimeout(timer); tc.abort(signal.reason); };
    signal.addEventListener('abort', onClientAbort, { once: true });

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: msgs, max_tokens: 1024, temperature: 0.7, stream: true }),
        signal: signal.aborted ? signal : tc.signal,
      });
    } finally {
      // Always clean up timer and listener regardless of outcome
      clearTimeout(timer);
      signal.removeEventListener('abort', onClientAbort);
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!res.body) throw new Error('No response body');

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let full = '';
    let buf = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        // Finalize TextDecoder to flush any pending multi-byte UTF-8 sequences
        buf += dec.decode();
        break;
      }
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

  // Early bail if client already disconnected
  if (signal.aborted) {
    sendChunk(FALLBACK_ERROR);
    return FALLBACK_ERROR;
  }

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

  sendChunk(FALLBACK_ERROR);
  return FALLBACK_ERROR;
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // CORS check
  if (isForbiddenOrigin(request)) {
    return NextResponse.json({ error: 'Заборонене джерело' }, { status: 403 });
  }

  // Rate limit
  const fingerprint = generateFingerprint(request);
  if (!(await checkRateLimit(fingerprint))) {
    return NextResponse.json({ error: 'Забагато запитів. Зачекайте трохи.' }, { status: 429 });
  }

  // Parse body with size guard
  let body: { conversationId?: string; message?: unknown };
  try {
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 100_000) {
      return NextResponse.json({ error: 'Занадто великий запит' }, { status: 413 });
    }
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Невірний формат запиту' }, { status: 400 });
  }

  const { conversationId, message } = body;
  const validation = validateMessage(message);
  if (!validation.valid || !validation.sanitized) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const safeMessage = validation.sanitized;

  // Extract and validate sessionId
  const sessionId = getSessionIdFromRequest(request);

  // Validate conversationId format to prevent FK violations
  if (conversationId && !isValidUuid(conversationId)) {
    return NextResponse.json({ error: 'Невірний ідентифікатор розмови' }, { status: 400 });
  }

  // Catalog search (uses shared module)
  let catalogContext = '';
  const intent = detectSearchIntent(safeMessage);
  if (intent) {
    const result = await searchCatalog(intent.searchTerm, intent.searchType);
    catalogContext = buildCatalogContext(intent, result, ALL_LINKS.catalog_search);
  }

  // Feature #6: Book recommendations — if no direct catalog search was triggered,
  // try to extract a topic from the message and suggest related books
  if (!intent) {
    const topicMatch = safeMessage.match(
      /(?:розкажи|що таке|поясни|цікавить|навчаюсь|вивчаю|пишу|досліджую)\s+(?:про\s+)?(.{3,40}?)(?:\?|$)/i
    );
    if (topicMatch) {
      const topic = topicMatch[1].trim();
      const recResult = await searchCatalog(topic, 'general', 3);
      if (!recResult.unavailable && recResult.books.length > 0) {
        const recList = recResult.books
          .slice(0, 3)
          .map((b, i) => `${i + 1}. ${b.title}${b.year ? ` (${b.year})` : ''}`)
          .join('\n');
        catalogContext = `\n\n[РЕКОМЕНДАЦІЇ: За темою "${topic}" знайдено схожі матеріали в каталозі:\n${recList}\nПовний пошук: ${ALL_LINKS.catalog_search}]`;
      }
    }
  }

  // Persist user message & get/create conversation
  let convId = conversationId;
  if (!convId) {
    const [newConv] = await db.insert(conversations).values({
      title: safeMessage.substring(0, 50),
      sessionId,
    }).returning();
    convId = newConv.id;
  } else {
    // Verify conversation exists AND belongs to this session
    const [existing] = await db.select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.id, convId), eq(conversations.sessionId, sessionId)));
    if (!existing) {
      // Either doesn't exist or belongs to another session — create new
      const [newConv] = await db.insert(conversations).values({
        title: safeMessage.substring(0, 50),
        sessionId,
      }).returning();
      convId = newConv.id;
    }
  }

  await db.insert(messagesTable).values({ conversationId: convId, role: 'USER', content: safeMessage });

  const history = await db.select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, convId))
    .orderBy(desc(messagesTable.createdAt))
    .limit(10);

  const apiMessages: ChatMessage[] = [
    { role: 'system', content: buildSystemPrompt(catalogContext) },
    ...[...history].reverse().map(m => ({ role: m.role.toLowerCase(), content: m.content })),
  ];

  // Streaming SSE response
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Wrap async work so ReadableStream.start stays synchronous-safe
      (async () => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ conversationId: convId })}\n\n`));

          const fullResponse = await streamLLM(apiMessages, controller, encoder, request.signal);

          // Don't persist LLM fallback errors — they pollute conversation history
          if (fullResponse !== FALLBACK_ERROR) {
            try {
              await db.insert(messagesTable).values({ conversationId: convId, role: 'ASSISTANT', content: fullResponse });
            } catch (e) {
              console.error('Не вдалося зберегти відповідь:', e);
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, conversationId: convId })}\n\n`));
        } catch (e) {
          // Send error event to client before closing so it doesn't hang
          if (!(e instanceof Error && e.name === 'AbortError')) {
            console.error('Stream error:', e);
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Помилка сервера', done: true })}\n\n`));
            } catch { /* controller may already be closed */ }
          }
        } finally {
          try { controller.close(); } catch { /* already closed */ }
        }
      })();
    },
    cancel() {
      // Client disconnected — tryProvider handles cleanup via signal listener
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
