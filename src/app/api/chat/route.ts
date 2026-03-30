import { NextRequest, NextResponse } from 'next/server';
import { db, conversations, messages as messagesTable } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import sanitizeHtml from 'sanitize-html';
import { checkRateLimit, generateFingerprint } from '@/lib/rate-limit';
import { ALL_LINKS } from '@/lib/constants';
import { buildSystemPrompt } from '@/lib/prompts';
import { detectSearchIntent, searchCatalog, buildCatalogContext } from '@/lib/catalog-search';

const MAX_MESSAGE_LENGTH = 2000;

// ─── LLM config ──────────────────────────────────────────────────────────────

const GROQ_API_KEY = process.env.GROQ_API_KEY?.trim();
const GROQ_URL = process.env.GROQ_URL || 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = (process.env.GROQ_MODEL_NAME || 'llama-3.3-70b-versatile').trim();

const QWEN_API_KEY = process.env.QWEN_API_KEY?.trim();
const QWEN_URL = process.env.QWEN_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';
const QWEN_MODEL = (process.env.QWEN_MODEL_NAME || 'qwen-turbo').trim();

interface ChatMessage { role: string; content: string; }

// ─── Validation ───────────────────────────────────────────────────────────────

function validateMessage(message: unknown): { valid: boolean; error?: string; sanitized?: string } {
  if (typeof message !== 'string') return { valid: false, error: 'Повідомлення має бути рядком' };
  if (!message.trim()) return { valid: false, error: 'Повідомлення не може бути порожнім' };
  if (message.length > MAX_MESSAGE_LENGTH) return { valid: false, error: `Повідомлення перевищує ${MAX_MESSAGE_LENGTH} символів` };
  const sanitized = sanitizeHtml(message, { allowedTags: [], allowedAttributes: {} }).trim();
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

// ─── CORS helper ──────────────────────────────────────────────────────────────

function isForbiddenOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin || process.env.NODE_ENV !== 'production') return false;
  try {
    const originHost = new URL(origin).hostname;
    const reqHost = new URL(request.url).hostname;
    const localHosts = ['localhost', '127.0.0.1', '0.0.0.0'];
    const isLocal = localHosts.includes(originHost) && localHosts.includes(reqHost);
    return originHost !== reqHost && !isLocal;
  } catch {
    // Malformed origin header — treat as forbidden
    return true;
  }
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

  // Parse body
  let body: { conversationId?: string; message?: unknown };
  try {
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

  // Catalog search (uses shared module)
  let catalogContext = '';
  const intent = detectSearchIntent(safeMessage);
  if (intent) {
    const result = await searchCatalog(intent.searchTerm, intent.searchType);
    catalogContext = buildCatalogContext(intent, result, ALL_LINKS.catalog_search);
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
    { role: 'system', content: buildSystemPrompt(catalogContext) },
    ...[...history].reverse().map(m => ({ role: m.role.toLowerCase(), content: m.content })),
  ];

  // Streaming SSE response
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ conversationId: convId })}\n\n`));

      const fullResponse = await streamLLM(apiMessages, controller, encoder, request.signal);

      // Persist assistant response
      try {
        await db.insert(messagesTable).values({ conversationId: convId, role: 'ASSISTANT', content: fullResponse });
      } catch (e) {
        console.error('Не вдалося зберегти відповідь:', e);
      }

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
