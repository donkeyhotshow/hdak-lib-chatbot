import { chatStorage } from "@/lib/storage";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// ─── Rate Limiter ──────────────────────────────────────────────────────────────
const REQUEST_LOGS = new Map<string, number[]>();
const RATE_LIMIT = 15;
const WINDOW_MS = 60_000;

function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const logs = REQUEST_LOGS.get(ip) || [];
  const recent = logs.filter((t) => now - t < WINDOW_MS);
  if (recent.length >= RATE_LIMIT) return true;
  recent.push(now);
  REQUEST_LOGS.set(ip, recent);
  return false;
}

// ─── Env utils ─────────────────────────────────────────────────────────────────
function cleanEnv(val: string | undefined): string | undefined {
  if (!val) return undefined;
  return val.replace(/^["']|["']$/g, "").replace(/\\n/g, "").trim();
}

// ─── Direct OpenRouter fetch (no SDK, no btoa issues) ─────────────────────────
interface OAIMessage {
  role: string;
  content: string;
}

async function callOpenRouter(
  messages: OAIMessage[],
  stream: true
): Promise<Response>;
async function callOpenRouter(
  messages: OAIMessage[],
  stream: false
): Promise<string>;
async function callOpenRouter(
  messages: OAIMessage[],
  stream: boolean
): Promise<Response | string> {
  const apiKey = cleanEnv(process.env.BUILT_IN_FORGE_API_KEY);
  if (!apiKey) throw new Error("BUILT_IN_FORGE_API_KEY is not set");

  const model =
    cleanEnv(process.env.AI_MODEL_NAME) ||
    "openai/gpt-4o-mini";

    const referer =
    cleanEnv(process.env.OPENROUTER_HTTP_REFERER) ||
    "https://hdak-lib-chatbot.onrender.com";

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      // All header values are pure ASCII — no btoa, no Cyrillic
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": referer,
      "X-Title": "HDAK Library Intelligence",
    },
    body: JSON.stringify({
      model,
      messages,
      stream,
      max_tokens: 1000,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(55_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.status.toString());
    throw new Error(`OpenRouter ${res.status}: ${errText}`);
  }

  if (stream) return res; // return raw Response for streaming
  const data = await res.json();
  return (data.choices?.[0]?.message?.content as string) || "";
}

// ─── Direct Gemini fetch (title generation fallback) ──────────────────────────
async function generateTitle(userText: string): Promise<string> {
  const geminiKey = cleanEnv(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  const prompt = `Створи дуже коротку назву (макс 3-4 слова) для діалогу українською мовою: "${userText}". Тільки назва.`;

  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 30, temperature: 0.5 },
          }),
          signal: AbortSignal.timeout(10_000),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const title: string =
          data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (title.trim()) return title.trim();
      }
    } catch {
      // fallback below
    }
  }

  try {
    // fallback — use OpenRouter non-streaming for title
    const title = await callOpenRouter(
      [{ role: "user", content: prompt }],
      false
    );
    return title.trim() || userText.slice(0, 60);
  } catch {
    return userText.slice(0, 60);
  }
}

// ─── System prompt cache ───────────────────────────────────────────────────────
let cachedSystemPrompt: string | null = null;
let lastCacheUpdate = 0;
const CACHE_TTL = 300_000;

async function buildSystemPrompt(): Promise<string> {
  const now = Date.now();
  if (cachedSystemPrompt && now - lastCacheUpdate < CACHE_TTL)
    return cachedSystemPrompt;

  const [info, resources] = await Promise.all([
    chatStorage.getLibraryInfo(),
    chatStorage.getLibraryResources(),
  ]);

  let extra = "";
  if (info?.length)
    extra += "ІНФО:\n" + info.map((i) => `- ${i.key}: ${i.value_uk}`).join("\n") + "\n\n";
  if (resources?.length)
    extra +=
      "РЕСУРСИ:\n" +
      resources.map((r) => `- ${r.name} (${r.type}): ${r.url}`).join("\n") +
      "\n\n";

  cachedSystemPrompt = `Ти — інтелектуальний асистент цифровізованої бібліотеки Харківської державної академії культури (HDAK Core). 
Твоя місія: надавати точну, лаконічну та академічно обґрунтовану інформацію про ресурси та сервіси академії.

СТИЛЬ ВІДПОВІДІ:
- Офіційно-діловий, інтелектуальний, але доступний для дослідника.
- Використовуй термінологію: "фонди", "репозитарій", "цифрові вузли", "академічний контекст".
- Відповіді мають бути структурованими. В кінці кожної розгорнутої відповіді додавай: "Дана інформація підготовлена на основі актуальних протоколів HDAK Core."

КОНТАКТИ ТА ГЕОЛОКАЦІЯ:
📍 Адреса: м. Харків, Бурсацький узвіз, 4 (центральний вузол біля ст. метро «Історичний музей»).
📞 Комунікація: (057) 731-27-83 | Viber/Telegram: +380661458484
📧 Скринька: abon@xdak.ukr.education
🌐 Портал: https://lib-hdak.in.ua/

ГРАФІК РОБОТИ:
📚 Абонементи та бібліографічний відділ: Пн–Пт: 9:00–16:45 (перерва 13:00–13:45). Вихідні: субота, неділя. Санітарний день: остання п'ятниця місяця.
📖 Читальна зала: Пн–Пт: 9:00–16:45 | Субота: 9:00–13:30. Санітарний день: останній четвер місяця.
💻 Електронна читальна зала (кімн. 18а): Пн–Пт: 9:00–16:45.
ℹ️ Під час дії воєнного стану обслуговування також здійснюється дистанційно.

ЦИФРОВІ РЕСУРСИ:
- OPAC (Каталог): https://library-service.com.ua:8443/khkhdak/DocumentSearchForm
- eKhSACIR (Репозитарій): https://repository.ac.kharkov.ua/home — основне сховище наукових праць.
- Зовнішні бази: Scopus, Web of Science, ScienceDirect (доступ через локальну мережу акадамії).

РЕЄСТРАЦІЯ:
Дистанційний запис доступний через е-mail або месенджери. Потрібно надати фото паспорта/студентського квитка.

${extra}`;

  lastCacheUpdate = now;
  return cachedSystemPrompt;
}

// ─── Automated replies (keyword shortcuts, no AI needed) ──────────────────────
const AUTOMATED_REPLIES: Record<
  string,
  { keywords: string[]; content: string; chips: string[] }
> = {
  hours: {
    keywords: ["графік", "годин", "розклад", "субот", "вихідн", "перерв", "коли"],
    content:
      "**Графік роботи бібліотеки:**\n\n📚 **Абонементи та бібліографічний відділ:**\nПн–Пт: 9:00–16:45 (перерва 13:00–13:45)\nВихідні: субота, неділя\nℹ️ Санітарний день: остання п'ятниця місяця\n\n📖 **Читальна зала:**\nПн–Пт: 9:00–16:45 | Субота: 9:00–13:30\nℹ️ Санітарний день: останній четвер місяця\n\n💻 **Електронна читальна зала (кімн. 18а):**\nПн–Пт: 9:00–16:45\n\nℹ️ Під час дії воєнного стану обслуговування також здійснюється дистанційно.\n\nДана інформація підготовлена на основі актуальних протоколів HDAK Core.",
    chips: ["Контакти", "Записатися", "Каталог"],
  },
  catalog: {
    keywords: ["електронний каталог", "каталог", "пошук книг", "пошук видань", "де знайти"],
    content:
      "**Вузол доступу до фондів (OPAC):**\n\nЦифровий каталог ХДАК забезпечує наскрізний пошук по всіх архівних та активних фондах бібліотеки.\n\n🔗 [Відкрити Електронний каталог ↗](https://library-service.com.ua:8443/khkhdak/DocumentSearchForm)\n📱 [Android-додаток (LibClient) ↗](https://play.google.com/store/apps/details?id=ush.libclient)\n\nДля прецизійного пошуку використовуйте вкладку «Розширений пошук». Дана інформація підготовлена на основі актуальних протоколів HDAK Core.",
    chips: ["Репозитарій", "Наука", "Записатися"],
  },
  register: {
    keywords: ["як записатися до бібліотеки", "записати", "квиток", "отримати квиток"],
    content:
      "**Протокол реєстрації дослідника:**\n\nДля доступу до ресурсів необхідно активувати Читацький квиток. Це можна зробити двома способами:\n\n1. **Локально:** кімн. 19 або кімн. 2 (мати при собі паспорт/студентський).\n2. **Дистанційно:** надіслати запит на `abon@xdak.ukr.education` з цифровою копією документів.\n\nДана інформація підготовлена на основі актуальних протоколів HDAK Core.",
    chips: ["Правила", "Контакти", "Єдина картка"],
  },
  science: {
    keywords: ["наукові бази даних", "наука", "scopus", "wos", "web of science", "наукова "],
    content:
      "**Академічні наукові вузли:**\n\nДослідникам ХДАК доступна розширена мережа наукових ресурсів:\n\n🌍 **Global Access:** [Репозитарій ХДАК ↗](https://repository.ac.kharkov.ua/home) | Springer | DOAJ\n💎 **Premium Access (VPN/Академія):** Scopus | Web of Science | ScienceDirect\n\nПотрібна допомога у підборі літератури? [Залишити запит ↗](https://lib-hdak.in.ua/search-scientific-info.html)\n\nДана інформація підготовлена на основі актуальних протоколів HDAK Core.",
    chips: ["Репозитарій", "Каталог"],
  },
  contacts: {
    keywords: ["контакти та адреса", "контакт", "адреса", "телефон"],
    content:
      "**Комунікаційні вузли HDAK Core:**\n\n📍 **Геолокація:** вул. Бурсацький узвіз, 4, Харків.\n📞 **Лінія зв'язку:** (057) 731-27-83\n💬 **Цифрові канали:** Telegram/Viber: +380 66 145 84 84\n\nДана інформація підготовлена на основі актуальних протоколів HDAK Core.",
    chips: ["Графік", "Сайт"],
  },
  repository: {
    keywords: ["репозитарій хдак", "репозитарій", "підручник", "курсов", "диплом", "архів хдак"],
    content:
      "**Електронний Архів (eKhSACIR):**\n\nЦентральне сховище інтелектуальної власності академії. Містить понад 15 000 повнотекстових документів: від монографій до кваліфікаційних робіт.\n\n📥 [Вхід до Репозитарію ↗](https://repository.ac.kharkov.ua/home)\n*Доступ вільний 24/7.*\n\nДана інформація підготовлена на основі актуальних протоколів HDAK Core.",
    chips: ["Наука", "Каталог"],
  },
  exhibitions: {
    keywords: ["віртуальні виставки", "виставк", "колекції", "нові надходження"],
    content:
      "**Культурні експозиції:**\n\nОзнайомтеся з тематичними колекціями та оглядами нових надходжень у цифровому форматі:\n\n🖼️ [Віртуальні виставки ХДАК ↗](https://lib-hdak.in.ua/virtual-exhibitions.html)\n\nДана інформація підготовлена на основі актуальних протоколів HDAK Core.",
    chips: ["Каталог", "Наука"],
  },
  unified_card: {
    keywords: ["єдина картка читача", "єдина картка", "єдину картку", "20+ бібліотек", "картк"],
    content:
      "**Проєкт «Єдина картка» (Inter-Library Network):**\n\nВаш квиток ХДАК відкриває двері до 20+ провідних університетських бібліотек Харкова (ХНУ ім. Каразіна, ХНУРЕ та ін.).\n\n🔗 [Перелік партнерів та правила ↗](https://lib-hdak.in.ua/project-unified-reader-card.html)\n\nДана інформація підготовлена на основі актуальних протоколів HDAK Core.",
    chips: ["Записатися", "Графік"],
  },
};

// ─── POST handler ──────────────────────────────────────────────────────────────
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversationId = parseInt(id);
    if (isNaN(conversationId))
      return Response.json({ error: "Invalid ID" }, { status: 400 });

    const { content } = await request.json();
    if (!content?.trim())
      return Response.json({ error: "Empty message" }, { status: 400 });

    const clientIp = getClientIp(request);
    if (isRateLimited(clientIp))
      return Response.json({ error: "Rate limit exceeded" }, { status: 429 });

    // Save user message + load history + build prompt in parallel
    const [, history, systemPrompt] = await Promise.all([
      chatStorage.createMessage(conversationId, "user", content),
      chatStorage.getMessagesByConversation(conversationId),
      buildSystemPrompt(),
    ]);

    // ── Automated keyword reply (no AI) ──────────────────────────────────────
    const lower = content.toLowerCase().trim();
    for (const reply of Object.values(AUTOMATED_REPLIES)) {
      if (reply.keywords.some((k) => lower.includes(k))) {
        const responseText = `${reply.content}\n\n[CHIPS: ${reply.chips.join(", ")}]`;
        await chatStorage.createMessage(conversationId, "assistant", responseText);
        return new Response(responseText, {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
    }

    // ── Auto-title on first message (fire-and-forget) ─────────────────────
    if (history.length === 1) {
      generateTitle(content)
        .then((title) => {
          if (title) chatStorage.updateConversationTitle(conversationId, title);
        })
        .catch(console.error);
    }

    // ── Stream from OpenRouter via direct fetch (no SDK, no btoa) ─────────
    const oaiMessages: OAIMessage[] = [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({ role: m.role, content: m.content })),
    ];

    let upstreamRes: Response;
    try {
      upstreamRes = await callOpenRouter(oaiMessages, true);
    } catch (primaryErr) {
      console.error("OpenRouter primary failed:", primaryErr);
      return Response.json(
        { error: "Сервіс тимчасово недоступний. Спробуйте пізніше." },
        { status: 503 }
      );
    }

    // Pipe OpenRouter SSE → plain text stream to client + save to DB
    const encoder = new TextEncoder();
    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
    const writer = writable.getWriter();

    // Process the SSE stream in background
    (async () => {
      let fullText = "";
      const decoder = new TextDecoder();
      const reader = upstreamRes.body!.getReader();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const chunk: string = parsed.choices?.[0]?.delta?.content ?? "";
              if (chunk) {
                fullText += chunk;
                await writer.write(encoder.encode(chunk));
              }
            } catch {
              // malformed SSE chunk — skip
            }
          }
        }
      } catch (streamErr) {
        console.error("Stream read error:", streamErr);
      } finally {
        try {
          await writer.close();
        } catch { /* already closed */ }
        if (fullText.trim()) {
          chatStorage
            .createMessage(conversationId, "assistant", fullText)
            .catch(console.error);
        }
      }
    })();

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "X-Accel-Buffering": "no", // disable Nginx buffering on Render
      },
    });
  } catch (error) {
    console.error("POST /messages unhandled:", error);
    return Response.json({ error: "Service unavailable" }, { status: 500 });
  }
}

// ─── GET handler ───────────────────────────────────────────────────────────────
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversationId = parseInt(id);
    if (isNaN(conversationId))
      return Response.json({ error: "Invalid ID" }, { status: 400 });
    const messages = await chatStorage.getMessagesByConversation(conversationId);
    return Response.json(messages);
  } catch (error) {
    console.error("GET /messages error:", error);
    return Response.json({ error: "Failed to load messages" }, { status: 500 });
  }
}
