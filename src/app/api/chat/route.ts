import { NextRequest, NextResponse } from "next/server";
import { db, conversations, messages as messagesTable } from "@/lib/db";
import { eq, desc, and } from "drizzle-orm";
import { stripHtml } from "@/lib/sanitize";
import { checkRateLimit, generateFingerprint } from "@/lib/rate-limit";
import { ALL_LINKS } from "@/lib/constants";
import { buildSystemPrompt } from "@/lib/prompts";
import { getFaqResponse } from "@/lib/faq-responses";
import {
  detectSearchIntent,
  searchCatalog,
  buildCatalogContext,
  checkCatalogAvailability,
  SearchIntent,
  BookResult,
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
import { buildDspaceAnswer, buildDspaceContext } from "@/lib/dspace";

export const runtime = "nodejs";
export const maxDuration = 60;

const DB_TIMEOUT_MS = 10_000;
const LLM_STREAM_IDLE_TIMEOUT_MS = 10_000;
const LLM_CHAIN_TIMEOUT_MS = 45_000;

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
const DEFAULT_XAI_URL = "https://api.x.ai/v1/chat/completions";
const DEFAULT_XAI_MODEL = "grok-3-mini";
const DEFAULT_GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";
const DEFAULT_QWEN_URL =
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions";
const DEFAULT_QWEN_MODEL = "qwen-turbo";
const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";

function getLlmConfig() {
  return {
    gemini: {
      apiKey: (
        process.env.GEMINI_API_KEY ||
        process.env.gemini_api_key ||
        process.env.GEMINIAPI
      )?.trim(),
      model: process.env.GEMINI_MODEL_NAME?.trim() || DEFAULT_GEMINI_MODEL,
    },
    llm7: {
      apiKey: process.env.HDAKLLM?.trim(),
      url: process.env.LLM7_URL?.trim() || DEFAULT_LLM7_URL,
      model: process.env.LLM7_MODEL_NAME?.trim() || DEFAULT_LLM7_MODEL,
    },
    xai: {
      apiKey: process.env.GROK_API_KEY?.trim(),
      url: process.env.GROK_URL?.trim() || DEFAULT_XAI_URL,
      model: process.env.GROK_MODEL_NAME?.trim() || DEFAULT_XAI_MODEL,
    },
    groq: {
      apiKey: process.env.GROQ_API_KEY?.trim() || process.env.GROQ_API?.trim(),
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
  const tryProvider = async (
    url: string,
    apiKey: string,
    model: string,
    onChunk: (text: string) => void,
    deadline: number
  ): Promise<string> => {
    const tc = new AbortController();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const resetTimeout = () => {
      if (timer) clearTimeout(timer);
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        tc.abort(new Error("LLM provider chain deadline exceeded"));
        return;
      }
      timer = setTimeout(
        () => tc.abort(new Error("LLM stream timeout")),
        Math.min(LLM_STREAM_IDLE_TIMEOUT_MS, remaining)
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
              onChunk(delta);
            }
          } catch {
            console.warn("Skipped malformed chunk (len:", data.length, ")");
          }
        }
      }
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

  const tryGemini = async (
    apiKey: string,
    model: string,
    onChunk: (text: string) => void,
    deadline: number
  ): Promise<string> => {
    const tc = new AbortController();
    const timeoutMs = Math.max(1000, Math.min(30_000, deadline - Date.now()));
    const timer = setTimeout(() => tc.abort(new Error("Gemini timeout")), timeoutMs);
    const onClientAbort = () => {
      clearTimeout(timer);
      tc.abort(signal.reason);
    };
    signal.addEventListener("abort", onClientAbort, { once: true });

    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
      const systemMsg = msgs.find(m => m.role === "system");
      const chatMsgs = msgs.filter(m => m.role !== "system");

      const contents = chatMsgs.map(m => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      }));

      const bodyPayload: Record<string, unknown> = { contents };
      if (systemMsg) {
        bodyPayload.systemInstruction = {
          parts: [{ text: systemMsg.content }],
        };
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
        signal: signal.aborted ? signal : tc.signal,
      });

      if (!res.ok) {
        throw new Error(`Gemini HTTP error ${res.status}`);
      }
      if (!res.body) {
        throw new Error("No response body from Gemini");
      }

      reader = res.body.getReader();
      const dec = new TextDecoder();
      let full = "";
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
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
          if (!data || data === "[DONE]") continue;
          try {
            const chunk = JSON.parse(data);
            const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              full += text;
              onChunk(text);
            }
          } catch {
            // skip malformed
          }
        }
      }
      return full;
    } finally {
      clearTimeout(timer);
      signal.removeEventListener("abort", onClientAbort);
      try {
        await reader?.cancel();
      } catch {
        // no-op
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
  const deadline = Date.now() + LLM_CHAIN_TIMEOUT_MS;

  // 1. Try Gemini first if configured
  if (config.gemini.apiKey) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      if (signal.aborted) break;
      if (Date.now() >= deadline) {
        logger.warn("LLM provider chain reached its overall deadline");
        throw new LlmUnavailableError();
      }
      try {
        const chunks: string[] = [];
        const response = await tryGemini(
          config.gemini.apiKey,
          config.gemini.model,
          text => chunks.push(text),
          deadline
        );
        if (!response.trim()) throw new Error("Gemini returned an empty response");
        for (const text of chunks) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
          );
        }
        return response;
      } catch (e) {
        logger.error(
          `Gemini provider failed (${config.gemini.model}, attempt ${attempt})`,
          e instanceof Error ? e : new Error(String(e))
        );
        if (signal.aborted) break;
      }
    }
  }

  // Prefer explicitly configured providers, then fall back without exposing keys.
  for (const provider of [config.llm7, config.groq, config.xai, config.qwen]) {
    if (!provider.apiKey) continue;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      if (signal.aborted) break;
      if (Date.now() >= deadline) {
        logger.warn("LLM provider chain reached its overall deadline");
        throw new LlmUnavailableError();
      }
      try {
        const chunks: string[] = [];
        const response = await tryProvider(
          provider.url,
          provider.apiKey,
          provider.model,
          text => chunks.push(text),
          deadline
        );
        if (!response.trim()) throw new Error("Provider returned an empty response");
        for (const text of chunks) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
          );
        }
        return response;
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
  // The local/demo path is deliberately stateless and is exercised by the
  // browser matrix; do not let its in-memory limiter make tests order-dependent.
  if (process.env.DATABASE_URL && !(await checkRateLimit(fingerprint))) {
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
            (b: BookResult, i: number) =>
              `${i + 1}. ${b.title}${b.year ? ` (${b.year})` : ""}`
          )
          .join("\n");
        catalogContext += `\n\n[РЕКОМЕНДАЦІЇ: За темою "${topic}" знайдено схожі матеріали в каталозі:\n${recList}\nПовний пошук: ${ALL_LINKS.catalog_search}]`;
      }
    }
  }

  // Repository results are available after the explicit mock/live sync.
  // A failed or not-yet-configured repository never blocks catalog or chat.
  const dspaceContext = buildDspaceContext(safeMessage);
  if (dspaceContext) catalogContext += dspaceContext;

  // Keep the documented mock/demo flow usable before production DB and LLM
  // credentials are connected. Production requests continue through the full
  // persistence + provider pipeline below.
  const demoAnswer = !process.env.DATABASE_URL
    ? buildDspaceAnswer(safeMessage)
    : null;
  const offlineAnswer = !process.env.DATABASE_URL
    ? demoAnswer ?? getOfflineAnswer(safeMessage, catalogContext)
    : null;
  if (offlineAnswer) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: offlineAnswer, source: demoAnswer ? "dspace" : "offline", done: true })}\n\n`));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  }

  // Persist user message & get/create conversation with graceful fallback if DB is unreachable
  let convId = conversationId;
  let history: Array<{ role: string; content: string }> = [];

  try {
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

    if (convId) {
      await withTimeout(
        db
          .insert(messagesTable)
          .values({ conversationId: convId, role: "USER", content: safeMessage }),
        DB_TIMEOUT_MS,
        "insert user message"
      );

      const dbHistory = await withTimeout(
        db
          .select()
          .from(messagesTable)
          .where(eq(messagesTable.conversationId, convId))
          .orderBy(desc(messagesTable.createdAt))
          .limit(10),
        DB_TIMEOUT_MS,
        "load history"
      );
      history = [...dbHistory].reverse().map(m => ({
        role: m.role.toLowerCase() === "user" ? "user" : "assistant",
        content: m.content,
      }));
    }
  } catch (dbError) {
    logger.warn(
      "DB conversation persistence failed, continuing in memory/stateless mode",
      dbError instanceof Error ? dbError : new Error(String(dbError))
    );
    history = [{ role: "user", content: safeMessage }];
  }

  const apiMessages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt(catalogContext) },
    ...(history.length > 0
      ? (history as ChatMessage[])
      : [{ role: "user" as const, content: safeMessage }]),
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

          const curatedFaq = getFaqResponse(safeMessage);
          if (curatedFaq) {
            const curatedText = curatedFaq.content;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ text: curatedText, source: "knowledge_base" })}\n\n`
              )
            );
            if (convId) {
              try {
                await db.insert(messagesTable).values({
                  conversationId: convId,
                  role: "ASSISTANT",
                  content: curatedText,
                });
              } catch (dbErr) {
                logger.warn("Failed to persist curated FAQ answer", dbErr instanceof Error ? dbErr : new Error(String(dbErr)));
              }
            }
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ done: true, source: "knowledge_base", conversationId: convId })}\n\n`
              )
            );
            return;
          }

          const fullResponse = await streamLLM(
            apiMessages,
            controller,
            encoder,
            request.signal
          );

          if (convId) {
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
              try {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ error: "Відповідь сформовано, але не вдалося зберегти історію.", done: true, conversationId: convId })}\n\n`
                  )
                );
              } catch {
                // The client may have disconnected before the persistence error was reported.
              }
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
            logger.error(
              "Chat stream failed",
              e instanceof Error ? e : new Error(String(e))
            );
            try {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ error: e instanceof LlmUnavailableError ? LLM_UNAVAILABLE_MESSAGE : "Не вдалося сформувати відповідь. Спробуйте ще раз.", done: true })}\n\n`
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

function getOfflineAnswer(message: string, catalogContext: string): string {
  const faq = getFaqResponse(message);
  if (faq) return faq.content;
  if (catalogContext) {
    if (catalogContext.includes("Каталог тимчасово недоступний")) {
      return `**Джерело: Електронний каталог ХДАК.** Каталог тимчасово недоступний. Спробуйте повторити пошук пізніше або скористайтеся прямим посиланням: ${ALL_LINKS.catalog_search}. Якщо проблема збережеться, зверніться до бібліотекаря або подайте тематичний запит.`;
    }
    return catalogContext
      .replace(/^\s*\[РЕЗУЛЬТАТИ КАТАЛОГУ:\s*/u, "**Джерело: Електронний каталог ХДАК.** ")
      .replace(/\]\s*$/u, "\n\nЯкщо потрібен інший пошук, зверніться до бібліотекаря.");
  }
  if (/where|what|how|find|book|catalog/i.test(message)) {
    return "**Джерело: Бібліотека ХДАК.** Я допоможу знайти книги в електронному каталозі, наукові матеріали й інформацію про бібліотечні послуги. У локальному режимі доступні перевірені відповіді та пошук за джерелами.";
  }
  return "Я можу допомогти знайти книги в електронному каталозі, матеріали в репозитарії ХДАК, наукові ресурси та інформацію про бібліотечні послуги.";
}
