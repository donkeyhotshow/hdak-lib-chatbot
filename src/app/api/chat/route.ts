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
  ChatMessageSchema,
  validateInput,
} from "@/lib/validation";
import { logger } from "@/lib/logger";

const MAX_MESSAGE_LENGTH = 2000;
const DB_TIMEOUT_MS = 10_000;
const LLM_STREAM_IDLE_TIMEOUT_MS = 30_000;

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

const DEFAULT_LLM7_URL = "https://api.llm7.io/v1/chat/completions";
const DEFAULT_LLM7_MODEL = "default";
const DEFAULT_GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";
const DEFAULT_QWEN_URL =
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions";
const DEFAULT_QWEN_MODEL = "qwen-turbo";

function getLlmConfig() {
  return {
    llm7: {
      apiKey: process.env.HDAKLLM?.trim(),
      url: process.env.LLM7_URL?.trim() || DEFAULT_LLM7_URL,
      model: process.env.LLM7_MODEL_NAME?.trim() || DEFAULT_LLM7_MODEL,
    },
    groq: {
      apiKey: process.env.GROQ_API_KEY?.trim(),
      url: process.env.GROQ_URL?.trim() || DEFAULT_GROQ_URL,
      model: process.env.GROQ_MODEL_NAME?.trim() || DEFAULT_GROQ_MODEL,
    },
    qwen: {
      apiKey: process.env.QWEN_API_KEY?.trim(),
      url: process.env.QWEN_URL?.trim() || DEFAULT_QWEN_URL,
      model: process.env.QWEN_MODEL_NAME?.trim() || DEFAULT_QWEN_MODEL,
    },
  };
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const LLM_UNAVAILABLE_MESSAGE =
  "Асистент тимчасово не може сформувати відповідь. Спробуйте ще раз пізніше.";

class LlmUnavailableError extends Error {
  constructor() {
    super(LLM_UNAVAILABLE_MESSAGE);
    this.name = "LlmUnavailableError";
  }
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
    const tc = new AbortController();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const resetTimeout = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(
        () => tc.abort(new Error("LLM stream timeout")),
        LLM_STREAM_IDLE_TIMEOUT_MS
      );
    };
    const onClientAbort = () => {
      if (timer) clearTimeout(timer);
      tc.abort(signal.reason);
    };
    signal.addEventListener("abort", onClientAbort, { once: true });

    let res: Response;
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    try {
      if (signal.aborted) tc.abort(signal.reason);
      resetTimeout();
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
        signal: tc.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) throw new Error("No response body");

      reader = res.body.getReader();
      const dec = new TextDecoder();
      let full = "";
      let buf = "";

      while (true) {
        resetTimeout();
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
          } catch {
            console.warn("Skipped malformed chunk (len:", data.length, ")");
          }
        }
      }
      if (!full.trim()) throw new Error("LLM returned an empty response");
      return full;
    } finally {
      if (timer) clearTimeout(timer);
      signal.removeEventListener("abort", onClientAbort);
      try {
        await reader?.cancel();
      } catch {
        // no-op if already closed/aborted
      }
    }
  };

  // Early bail if client already disconnected
  if (signal.aborted) {
    throw signal.reason instanceof Error
      ? signal.reason
      : new DOMException("Aborted", "AbortError");
  }

  const config = getLlmConfig();

  // Prefer LLM7, then use configured compatible providers as fallbacks.
  for (const provider of [config.llm7, config.groq, config.qwen]) {
    if (!provider.apiKey) continue;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        return await tryProvider(provider.url, provider.apiKey, provider.model);
      } catch (e) {
        logger.error(
          `LLM provider failed (${provider.model}, attempt ${attempt})`,
          e instanceof Error ? e : new Error(String(e))
        );
        if (signal.aborted) break;
      }
    }
  }

  throw new LlmUnavailableError();
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
  let body: unknown;
  try {
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 100_000) {
      return NextResponse.json(
        { error: "Занадто велик��й запит" },
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

  const parsed = await validateInput(ChatMessageSchema, body);
  if (!parsed.success || !parsed.data) {
    return NextResponse.json(
      { error: parsed.error || "Невалідні вхідні дані" },
      { status: 400 }
    );
  }

  const { conversationId, message } = parsed.data;
  const safeMessage = stripHtml(message).trim();
  if (!safeMessage) {
    return NextResponse.json(
      { error: "Недійсний вміст повідомлення" },
      { status: 400 }
    );
  }

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
    const settledResults = await Promise.allSettled(searchPromises);
    const results = settledResults.flatMap(settled => {
      if (settled.status === "fulfilled") return [settled.value];
      logger.warn("Catalog auxiliary search failed");
      return [];
    });
    let isCatalogAvailable = true;

    // First pass: check availability
    for (const res of results) {
      if (res.type === "availability")
        isCatalogAvailable = res.result as boolean;
    }

    for (const { type, result, intent: searchIntent, topic } of results) {
      if (type === "catalog" && searchIntent) {
        const searchResult = result as Awaited<
          ReturnType<typeof searchCatalog>
        >;
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
        result &&
        typeof result === "object" &&
        "books" in result &&
        !("unavailable" in result && result.unavailable) &&
        Array.isArray(result.books) &&
        result.books.length > 0
      ) {
        const searchResult = result as Awaited<
          ReturnType<typeof searchCatalog>
        >;
        const recList = searchResult.books
          .slice(0, 3)
          .map(
            (b: any, i: number) =>
              `${i + 1}. ${b.title}${b.year ? ` (${b.year})` : ""}`
          )
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

          try {
            await db.insert(messagesTable).values({
              conversationId: convId,
              role: "ASSISTANT",
              content: fullResponse,
            });
          } catch (e) {
            logger.error(
              "Не вдалося зберегти відповідь",
              e instanceof Error ? e : new Error(String(e))
            );
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ done: true, conversationId: convId })}\n\n`
            )
          );
        } catch (e) {
          // Send error event to client before closing so it doesn't hang
          if (!(e instanceof Error && e.name === "AbortError")) {
            logger.error(
              "Chat stream failed",
              e instanceof Error ? e : new Error(String(e))
            );
            try {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ error: e instanceof LlmUnavailableError ? LLM_UNAVAILABLE_MESSAGE : "Не вдалося сформувати відповідь. Спробуйте ще раз.", done: true })}\\n\\n`
                )
              );
            } catch (enqueueError) {
              logger.warn(
                "Unable to enqueue stream error event",
                enqueueError instanceof Error ? enqueueError : undefined
              );
            }
          }
        } finally {
          try {
            controller.close();
          } catch (closeError) {
            logger.warn(
              "Stream controller was already closed",
              closeError instanceof Error ? closeError : undefined
            );
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
