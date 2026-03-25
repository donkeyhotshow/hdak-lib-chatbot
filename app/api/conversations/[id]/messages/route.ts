import { chatStorage } from "../../../../../lib/storage";

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
    "google/gemini-2.0-flash-lite-preview-02-05";

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

  cachedSystemPrompt = `Ти — офіційний чат-помічник бібліотеки Харківської державної академії культури (ХДАК). Відповідай коротко, по-українськи.

КОНТАКТИ:
Адреса: вул. Бурсацький узвіз, 4, Харків 61057 (ст. метро «Історичний музей»)
Тел: (057) 731-27-83, (057) 731-13-85
Email: abon@xdak.ukr.education
Viber/Telegram: +380661458484
Instagram: @hdak_lib
Facebook: m.me/641740969354328
Сайт: https://lib-hdak.in.ua/

ГРАФІК:
Абонементи: Пн-Пт 9:00-16:45 (перерва 13-13:45), сб/нд вихідні, санітарний день - остання п'ятниця місяця.
Читальна зала: Пн-Пт 9:00-16:45, сб 9:00-13:30, санітарний день - останній четвер місяця.
Е-читальна зала (кімн.18а): Пн-Пт 9:00-16:45, сб/нд вихідні, санітарний день - останній четвер місяця.
Воєнний стан: обслуговування також дистанційно.

КАТАЛОГ:
Пошук: https://library-service.com.ua:8443/khkhdak/DocumentSearchForm
Сторінка: https://lib-hdak.in.ua/e-catalog.html
Мобільний Android: https://play.google.com/store/apps/details?id=ush.libclient

РЕПОЗИТАРІЙ: https://repository.ac.kharkov.ua/home (підручники, статті, кваліфікаційні роботи — відкритий доступ)

ЗАПИС ДО БІБЛІОТЕКИ (дистанційно):
Email: abon@xdak.ukr.education
Viber/Telegram: +380661458484
Facebook Messenger: http://m.me/641740969354328

ПРАВИЛА (коротко):
Відвідувати з квитком, повертати вчасно, дотримуватися тиші, не передавати квиток іншим. При втраті — відшкодувати.
Повні правила: https://lib-hdak.in.ua/rules-library.html

НАУКОВІ РЕСУРСИ:
Відкриті: Репозитарій ХДАК, Springer Link, УкрІНТЕІ, DOAJ
Корпоративні (мережа/VPN): Scopus, Web of Science, ScienceDirect, Research 4 Life
Запит на пошук джерел: https://lib-hdak.in.ua/search-scientific-info.html

ДИРЕКТОР: Кирпа Тетяна Олександрівна (кімн. 16)

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
      "**Абонементи та бібліографічний відділ:**\nПн–Пт: 9:00–16:45 (перерва 13:00–13:45)\nВихідні: субота, неділя (санітарний день: остання п'ятниця місяця)\n\n**Читальна зала:**\nПн–Пт: 9:00–16:45 | Субота: 9:00–13:30 (останній четвер місяця — санітарний)\n\n**Електронна читальна зала (кімн. 18а):**\nПн–Пт: 9:00–16:45\n\nℹ️ *Під час дії воєнного стану обслуговування також здійснюється дистанційно.*",
    chips: ["Контакти", "Записатися", "Каталог"],
  },
  catalog: {
    keywords: ["електронний каталог", "каталог", "пошук книг", "пошук видань", "де знайти"],
    content:
      "Електронний каталог ХДАК об'єднує всі фонди бібліотеки та дозволяє знайти необхідні видання онлайн.\n\n[🔍 Шукати в Електронному каталозі ↗](https://library-service.com.ua:8443/khkhdak/DocumentSearchForm)\n[📄 Як правильно шукати (Інструкція) ↗](https://lib-hdak.in.ua/e-catalog.html)\n\n**Поради:** Шукайте за автором, окремими словами з назви, або використовуйте знак «*» для пошуку за частиною слова (наприклад: *культур**).\nТакож ви можете завантажити **мобільний додаток** для Android: [Google Play ↗](https://play.google.com/store/apps/details?id=ush.libclient)",
    chips: ["Завантажити додаток", "Репозитарій", "Наука"],
  },
  register: {
    keywords: ["як записатися до бібліотеки", "записати", "квиток", "отримати квиток"],
    content:
      "Для запису до Бібліотеки ХДАК вам необхідно отримати Читацький квиток.\n\n**Особисто:** Зверніться в кімн. 19 або кімн. 2 з паспортом або студентським квитком.\n**Дистанційно:**\n📧 Email: abon@xdak.ukr.education\n📱 Viber/Telegram: +380 66 145 84 84\n💬 [Написати у Facebook ↗](http://m.me/641740969354328)\n\n**Важливо:** Передавати квиток іншим особам заборонено! У разі втрати зверніться до бібліотеки.",
    chips: ["Єдина картка", "Правила", "Контакти"],
  },
  science: {
    keywords: ["наукові бази даних", "наука", "scopus", "wos", "web of science", "наукова "],
    content:
      "Бібліотека ХДАК надає доступ до провідних міжнародних наукометричних баз:\n\n🌍 **Відкритий доступ:** \n• [Репозитарій ХДАК ↗](https://repository.ac.kharkov.ua/home)\n• [Springer Link ↗](https://link.springer.com/) (відкриті матеріали)\n\n🔒 **Корпоративний доступ (з локальної мережі ХДАК / VPN):**\n• [Scopus ↗](https://www.scopus.com/) та [Web of Science ↗](https://www.webofscience.com/)\n• [ScienceDirect ↗](https://www.sciencedirect.com/) та [Research 4 Life ↗](https://www.research4life.org/)\n\n💡 [Запит на пошук наукової інформації (Google Форма) ↗](https://lib-hdak.in.ua/search-scientific-info.html)",
    chips: ["Авторські профілі", "Репозитарій"],
  },
  contacts: {
    keywords: ["контакти та адреса", "контакт", "адреса", "телефон"],
    content:
      "📍 **Адреса Бібліотеки ХДАК:**\nм. Харків, 61057, вул. Бурсацький узвіз, 4 (біля метро «Історичний музей»).\n\n📞 **Телефони для довідок:**\n(057) 731-27-83\n(057) 731-13-85 (Директор: Кирпа Тетяна Олександрівна)\n\n📧 **Електронна пошта:** abon@xdak.ukr.education\n💬 **Месенджери:** Viber / Telegram: +380 66 145 84 84",
    chips: ["Графік", "Сайт бібліотеки"],
  },
  repository: {
    keywords: ["репозитарій хдак", "репозитарій", "підручник", "курсов", "диплом", "архів хдак"],
    content:
      "**eKhSACIR (Електронний архів ХДАК)** — це відкритий інституційний репозитарій.\nТут зібрані повні тексти: підручників, навчально-методичних посібників, монографій, статей, матеріалів конференцій та кваліфікаційних робіт наших викладачів та студентів.\n\n[📥 Перейти до Репозитарію ↗](https://repository.ac.kharkov.ua/home)\nВхід та пошук документів є абсолютно **безкоштовним** і відкритим для всіх користувачів Інтернету.",
    chips: ["Каталог", "Наука"],
  },
  exhibitions: {
    keywords: ["віртуальні виставки", "виставк", "колекції", "нові надходження"],
    content:
      "Бібліотека постійно готує книжкові та віртуальні виставки до пам'ятних дат, ювілеїв видатних діячів науки і культури, та презентації нових надходжень.\n\nВи можете ознайомитись із віртуальними презентаціями та оглядами літератури онлайн на нашому сайті:\n[🖼️ Відкрити Віртуальні виставки ↗](https://lib-hdak.in.ua/virtual-exhibitions.html)\n\nДля перегляду фізичних нових надходжень звертайтеся до інформаційного стенду в бібліотеці.",
    chips: ["Нові надходження", "Каталог"],
  },
  unified_card: {
    keywords: ["єдина картка читача", "єдина картка", "єдину картку", "20+ бібліотек", "картк"],
    content:
      "Проєкт **«Єдина картка читача»** закладів вищої освіти Харкова об'єднує понад 20 університетських бібліотек!\n\nМаючи читацький квиток ХДАК та оформивши Єдину картку, ви отримуєте можливість безкоштовно обслуговуватися в читальних залах інших вишів-учасників консорціуму, зокрема ХНУ ім. Каразіна, ХПІ, ХНУРЕ та інших.\n\n[Детальну інформацію та перелік бібліотек-партнерів дивіться тут ↗](https://lib-hdak.in.ua/project-unified-reader-card.html)",
    chips: ["Записатися", "Правила"],
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
