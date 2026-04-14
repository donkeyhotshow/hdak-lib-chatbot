import { NextRequest, NextResponse } from "next/server";
import { db, conversations, messages as messagesTable } from "@/lib/db";
import { eq, desc, and } from "drizzle-orm";
import { stripHtml } from "@/lib/sanitize";
import { checkRateLimit, generateFingerprint } from "@/lib/rate-limit";
import { ALL_LINKS } from "@/lib/constants";
import { buildSystemPrompt } from "@/lib/prompts";
import {
  detectSearchIntent,
  searchCatalog,
  buildCatalogContext,
  checkCatalogAvailability,
  SearchIntent,
} from "@/lib/catalog-search";
import { isForbiddenOrigin } from "@/lib/cors";
import {
  isValidUuid,
  getSessionIdFromRequest,
  buildSessionCookie,
} from "@/lib/validation";

const MAX_MESSAGE_LENGTH = 2000;
const DB_TIMEOUT_MS = 10_000;

// ─── Timeout wrapper for DB operations ──────────────────────────────────────

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`DB timeout: ${label} (${ms}ms)`)), ms)
    ),
  ]);
}

// ─── LLM config ──────────────────────────────────────────────────────────────

const GROQ_API_KEY = process.env.GROQ_API_KEY?.trim();
const GROQ_URL =
  process.env.GROQ_URL || "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = (
  process.env.GROQ_MODEL_NAME || "llama-3.3-70b-versatile"
).trim();

const QWEN_API_KEY = process.env.QWEN_API_KEY?.trim();
const QWEN_URL =
  process.env.QWEN_URL ||
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions";
const QWEN_MODEL = (process.env.QWEN_MODEL_NAME || "qwen-turbo").trim();

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// Fallback error message — not persisted to DB to avoid polluting conversation history
const FALLBACK_ERROR = "Вибачте, сталася технічна помилка. Спробуйте пізніше.";

// ─── Validation ───────────────────────────────────────────────────────────────

function validateMessage(message: unknown): {
  valid: boolean;
  error?: string;
  sanitized?: string;
} {
  if (typeof message !== "string")
    return { valid: false, error: "Повідомлення має бути рядком" };
  if (!message.trim())
    return { valid: false, error: "Повідомлення не може бути порожнім" };
  if (message.length > MAX_MESSAGE_LENGTH)
    return {
      valid: false,
      error: `Повідомлення перевищує ${MAX_MESSAGE_LENGTH} символів`,
    };
  const sanitized = stripHtml(message).trim();
  if (!sanitized)
    return { valid: false, error: "Недійсний вміст повідомлення" };
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

  const tryProvider = async (
    url: string,
    apiKey: string,
    model: string
  ): Promise<string> => {
    // C6+H11: combine client disconnect signal with 30s timeout
    // Create combined controller; always clear timer in finally to prevent leak
    const tc = new AbortController();
    const timer = setTimeout(() => tc.abort(new Error("LLM timeout")), 30_000);
    const onClientAbort = () => {
      clearTimeout(timer);
      tc.abort(signal.reason);
    };
    signal.addEventListener("abort", onClientAbort, { once: true });

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: msgs,
          max_tokens: 1024,
          temperature: 0.7,
          stream: true,
        }),
        signal: signal.aborted ? signal : tc.signal,
      });
    } finally {
      // Always clean up timer and listener regardless of outcome
      clearTimeout(timer);
      signal.removeEventListener("abort", onClientAbort);
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!res.body) throw new Error("No response body");

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let full = "";
    let buf = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        // Finalize TextDecoder to flush any pending multi-byte UTF-8 sequences
        buf += dec.decode();
        break;
      }
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") continue;
        if (!data || data === "null") continue;
        try {
          const chunk = JSON.parse(data);
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) {
            full += delta;
            sendChunk(delta);
          }
        } catch (e) {
          console.warn("Skipped malformed chunk (len:", data.length, ")");
        }
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
      console.error("Groq stream failed:", e);
    }
  }

  // Fallback: Qwen
  if (QWEN_API_KEY) {
    try {
      return await tryProvider(QWEN_URL, QWEN_API_KEY, QWEN_MODEL);
    } catch (e) {
      console.error("Qwen stream failed:", e);
    }
  }

  sendChunk(FALLBACK_ERROR);
  return FALLBACK_ERROR;
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // CORS check
  if (isForbiddenOrigin(request)) {
    return NextResponse.json({ error: "Заборонене джерело" }, { status: 403 });
  }

  // Rate limit
  const fingerprint = generateFingerprint(request);
  if (!(await checkRateLimit(fingerprint))) {
    return NextResponse.json(
      { error: "Забагато запитів. Зачекайте трохи." },
      { status: 429 }
    );
  }

  // Parse body with size guard
  let body: { conversationId?: string; message?: unknown };
  try {
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 100_000) {
      return NextResponse.json(
        { error: "Занадто великий запит" },
        { status: 413 }
      );
    }
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Невірний формат запиту" },
      { status: 400 }
    );
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
    return NextResponse.json(
      { error: "Невірний ідентифікатор розмови" },
      { status: 400 }
    );
  }

  // Catalog search + recommendations — run in parallel when possible
  let catalogContext = "";
  const intent = detectSearchIntent(safeMessage);

  // Build parallel search promises
  const searchPromises: Promise<{
    type: "catalog" | "recommendation" | "availability";
    result: Awaited<ReturnType<typeof searchCatalog>> | boolean;
    intent?: SearchIntent;
    topic?: string;
  }>[] = [];

  // M1: Always check availability in parallel if we have an intent
  if (intent) {
    searchPromises.push(
      checkCatalogAvailability().then(isAvailable => ({
        type: "availability" as const,
        result: isAvailable,
      }))
    );

    searchPromises.push(
      searchCatalog(intent.searchTerm, intent.searchType).then(result => ({
        type: "catalog" as const,
        result,
        intent,
      }))
    );
  }

  // Always try recommendations in parallel (extract topic from message)
  const topicMatch = safeMessage.match(
    /(?:розкажи|що таке|поясни|цікавить|навчаюсь|вивчаю|пишу|досліджую)\s+(?:про\s+)?(.{3,40}?)(?:\?|$)/i
  );
  if (topicMatch) {
    const topic = topicMatch[1].trim();
    if (topic.length >= 3 && topic.length <= 40) {
      searchPromises.push(
        searchCatalog(topic, "general", 3).then(result => ({
          type: "recommendation" as const,
          result,
          topic,
        }))
      );
    }
  }

  // Execute all searches in parallel with timeout
  if (searchPromises.length > 0) {
    const results = await Promise.all(searchPromises);
    let isCatalogAvailable = true;

    // First pass: check availability
    for (const res of results) {
      if (res.type === "availability") isCatalogAvailable = res.result as boolean;
    }

    for (const { type, result, intent: searchIntent, topic } of results) {
      if (type === "catalog" && searchIntent) {
        const searchResult = result as Awaited<ReturnType<typeof searchCatalog>>;
        // If availability check failed but search somehow worked, trust search.
        // If search failed with unavailable, or availability check failed, mark as unavailable.
        if (!isCatalogAvailable && searchResult.books.length === 0) {
          searchResult.unavailable = true;
        }
        catalogContext = buildCatalogContext(
          searchIntent,
          searchResult,
          ALL_LINKS.catalog_search
        );
      } else if (
        type === "recommendation" &&
        topic &&
        !(result as any).unavailable &&
        (result as any).books.length > 0
      ) {
        const recList = result.books
          .slice(0, 3)
          .map((b, i) => `${i + 1}. ${b.title}${b.year ? ` (${b.year})` : ""}`)
          .join("\n");
        catalogContext += `\n\n[РЕКОМЕНДАЦІЇ: За темою "${topic}" знайдено схожі матеріали в каталозі:\n${recList}\nПовний пошук: ${ALL_LINKS.catalog_search}]`;
      }
    }
  }

  // Persist user message & get/create conversation
  let convId = conversationId;
  if (!convId) {
    const [newConv] = await withTimeout(
      db
        .insert(conversations)
        .values({
          title: safeMessage.substring(0, 50),
          sessionId,
        })
        .returning(),
      DB_TIMEOUT_MS,
      "create conversation"
    );
    convId = newConv.id;
  } else {
    // Verify conversation exists AND belongs to this session
    const [existing] = await withTimeout(
      db
        .select({ id: conversations.id })
        .from(conversations)
        .where(
          and(
            eq(conversations.id, convId),
            eq(conversations.sessionId, sessionId)
          )
        ),
      DB_TIMEOUT_MS,
      "verify conversation"
    );
    if (!existing) {
      // Either doesn't exist or belongs to another session — create new
      const [newConv] = await withTimeout(
        db
          .insert(conversations)
          .values({
            title: safeMessage.substring(0, 50),
            sessionId,
          })
          .returning(),
        DB_TIMEOUT_MS,
        "create conversation fallback"
      );
      convId = newConv.id;
    }
  }

  await withTimeout(
    db
      .insert(messagesTable)
      .values({ conversationId: convId, role: "USER", content: safeMessage }),
    DB_TIMEOUT_MS,
    "insert user message"
  );

  const history = await withTimeout(
    db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, convId))
      .orderBy(desc(messagesTable.createdAt))
      .limit(10),
    DB_TIMEOUT_MS,
    "load history"
  );

  const apiMessages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt(catalogContext) },
    ...[...history].reverse().map(m => ({
      role: (m.role.toLowerCase() === "user" ? "user" : "assistant") as
        | "user"
        | "assistant",
      content: m.content,
    })),
  ];

  // Streaming SSE response
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Wrap async work so ReadableStream.start stays synchronous-safe
      (async () => {
        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ conversationId: convId })}\n\n`
            )
          );

          const fullResponse = await streamLLM(
            apiMessages,
            controller,
            encoder,
            request.signal
          );

          // Don't persist LLM fallback errors — they pollute conversation history
          if (fullResponse !== FALLBACK_ERROR) {
            try {
              await db.insert(messagesTable).values({
                conversationId: convId,
                role: "ASSISTANT",
                content: fullResponse,
              });
            } catch (e) {
              console.error("Не вдалося зберегти відповідь:", e);
            }
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ done: true, conversationId: convId })}\n\n`
            )
          );
        } catch (e) {
          // Send error event to client before closing so it doesn't hang
          if (!(e instanceof Error && e.name === "AbortError")) {
            console.error("Stream error:", e);
            try {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ error: "Помилка сервера", done: true })}\n\n`
                )
              );
            } catch {
              /* controller may already be closed */
            }
          }
        } finally {
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        }
      })();
    },
    cancel() {
      // Client disconnected — tryProvider handles cleanup via signal listener
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      // Persist session so cookie-less clients get a stable session across reloads
      "Set-Cookie": buildSessionCookie(sessionId),
    },
  });
}
