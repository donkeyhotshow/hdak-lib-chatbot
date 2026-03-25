import { streamText, generateText, type LanguageModel } from "ai";
import { openai } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { chatStorage } from "../../../../../lib/storage";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const REQUEST_LOGS = new Map<string, number[]>();
const RATE_LIMIT = 15;
const WINDOW_MS = 60000;

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
  const recent = logs.filter(t => now - t < WINDOW_MS);
  if (recent.length >= RATE_LIMIT) return true;
  recent.push(now);
  REQUEST_LOGS.set(ip, recent);
  return false;
}

async function googleGeminiGenerate(prompt: string): Promise<string> {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) throw new Error("Missing Google API Key");
  
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 800, temperature: 0.7 }
      })
    });
    
    if (!res.ok) {
      const errBody = await res.text();
      console.error(`Gemini API Error (${res.status}):`, errBody);
      return "";
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (e) {
    console.error("googleGeminiGenerate failed:", e);
    return "";
  }
}

let cachedSystemPrompt: string | null = null;
let lastCacheUpdate = 0;
const CACHE_TTL = 300000;

function getModel(primary = true): LanguageModel {
  const openRouterKey = process.env.BUILT_IN_FORGE_API_KEY?.trim();
  const openRouterUrl = process.env.BUILT_IN_FORGE_API_URL?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const modelName = process.env.AI_MODEL_NAME?.trim() || "openai/gpt-4o-mini";

  if (primary && openRouterKey && openRouterUrl) {
    const openrouter = createOpenRouter({
      apiKey: openRouterKey,
      baseURL: openRouterUrl.replace(/\/chat\/completions$/, ''),
      headers: {
        "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER || "https://hdak-lib-chatbot.onrender.com",
        "X-Title": "Бібліотека ХДАК",
      }
    });
    return openrouter(modelName);
  }

  if (openaiKey) return openai("gpt-4o-mini");
  throw new Error("Missing AI API key");
}

async function buildSystemPrompt(): Promise<string> {
  const now = Date.now();
  if (cachedSystemPrompt && (now - lastCacheUpdate < CACHE_TTL)) return cachedSystemPrompt;

  const [info, resources] = await Promise.all([chatStorage.getLibraryInfo(), chatStorage.getLibraryResources()]);

  let infoString = "=== ДОДАТКОВІ ДАНІ З БАЗИ ===\n\n";
  if (info && info.length > 0) infoString += "ІНФО:\n" + info.map(i => `- ${i.key}: ${i.value_uk}`).join("\n") + "\n\n";
  if (resources && resources.length > 0) infoString += "РЕСУРСИ:\n" + resources.map(r => `- ${r.name} (${r.type}): ${r.url}`).join("\n") + "\n\n";

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
Читальна залу: Пн-Пт 9:00-16:45, сб 9:00-13:30, санітарний день - останній четвер місяця.
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

${infoString}
`;
  
  lastCacheUpdate = now;
  return cachedSystemPrompt;
}

const AUTOMATED_REPLIES: Record<string, { keywords: string[]; content: string; chips: string[] }> = {
  "hours": { 
    keywords: ["графік", "годин", "розклад", "субот", "вихідн", "перерв", "коли"],
    content: "<strong>Абонементи + бібліографічний відділ:</strong><br>Пн–Пт: 9:00–16:45 (перерва 13:00–13:45)<br>Вихідні: субота, неділя<br>Санітарний день: <em>остання п'ятниця місяця</em><br><br><strong>Читальна зала:</strong><br>Пн–Пт: 9:00–16:45<br>Субота: 9:00–13:30<br>Санітарний день: <em>останній четвер місяця</em><br><br><strong>Е-читальна зала (кімн. 18а):</strong><br>Пн–Пт: 9:00–16:45<br>Вихідні: субота, неділя<br>Санітарний день: <em>останній четвер місяця</em><br><br>ℹ️ На час воєнного стану — обслуговування також дистанційно.", 
    chips: ["📍 Контакти", "📋 Записатися", "💻 Е-читальна зала"] 
  },
  "catalog": { 
    keywords: ["каталог", "пошук книг", "знайти", "є у вас", "автор", "назва", "літератур"],
    content: "<strong>Електронний каталог ХДАК</strong> — пошук за автором, назвою, темою.<br><br><a href=\"https://library-service.com.ua:8443/khkhdak/DocumentSearchForm\" target=\"_blank\">🔍 Відкрити пошук ↗</a><br><a href=\"https://lib-hdak.in.ua/e-catalog.html\" target=\"_blank\">📄 Інструкція з пошуку ↗</a><br><br><strong>Поради для пошуку:</strong><br>• За назвою — шукайте по окремих словах<br>• Анотація — вводьте частину слова зі знаком * (наприклад: <em>культур*</em>)<br><br><strong>📱 Мобільний додаток Android:</strong><br><a href=\"https://play.google.com/store/apps/details?id=ush.libclient\" target=\"_blank\">Google Play ↗</a>", 
    chips: ["📖 Репозитарій ХДАК", "📱 Мобільний додаток", "🔬 Пошук наукової інформації"] 
  },
  "register": { 
    keywords: ["записати", "стати читачем", "читацький квиток", "реєстрація", "отримати квиток", "квіток"],
    content: "<strong>Запис до бібліотеки ХДАК:</strong><br><br><strong>Особисто:</strong><br>Пред'явіть паспорт або студентський квиток у кімн. 19 або 2.<br><br><strong>Дистанційно:</strong><br>📧 Email: <a href=\"mailto:abon@xdak.ukr.education\">abon@xdak.ukr.education</a><br>📱 Viber/Telegram: <a href=\"tel:+380661458484\">+380 66 145 84 84</a><br>💬 <a href=\"http://m.me/641740969354328\" target=\"_blank\">Facebook ↗</a><br><br>📍 вул. Бурсацький узвіз, 4 (метро «Історичний музей»)", 
    chips: ["🕐 Графік роботи", "📋 Правила бібліотеки", "💳 Єдина картка читача"] 
  },
  "contacts": { 
    keywords: ["контакт", "телефон", "адреса", "де знаходиться", "дістатися", "email", "пошта", "локац", "узвіз"],
    content: "📍 <strong>Адреса:</strong><br>вул. Бурсацький узвіз, 4, Харків 61057 (метро «Історичний музей»)<br><br>📞 <strong>Телефони:</strong><br>(057) 731-27-83 &nbsp;·&nbsp; (057) 731-13-85<br><br>📧 <strong>Email:</strong><br><a href=\"mailto:abon@xdak.ukr.education\">abon@xdak.ukr.education</a><br><br>📱 <strong>Месенджери:</strong><br>Viber/Telegram: <a href=\"tel:+380661458484\">+380 66 145 84 84</a><br><a href=\"http://m.me/641740969354328\" target=\"_blank\">Facebook ↗</a> &nbsp;·&nbsp; <a href=\"https://www.instagram.com/hdak_lib/\" target=\"_blank\">Instagram ↗</a>", 
    chips: ["🕐 Графік роботи", "📋 Записатися", "🏛 Сайт бібліотеки"] 
  },
  "science": { 
    keywords: ["scopus", "web of science", "науков", "статті", "дисертація", "автореферат", "wos", "springer", "elsevier"],
    content: "<strong>Наукові ресурси:</strong><br><br>• <a href=\"https://repository.ac.kharkov.ua/home\" target=\"_blank\">Репозитарій ХДАК ↗</a> — відкритий доступ<br>• <a href=\"https://link.springer.com/\" target=\"_blank\">Springer Link ↗</a><br>• <a href=\"https://www.scopus.com/\" target=\"_blank\">Scopus ↗</a> (мережа ХДАК/VPN)<br>• <a href=\"https://www.webofscience.com/\" target=\"_blank\">Web of Science ↗</a> (мережа ХДАК/VPN)<br><br>💡 Потрібна допомога з добором джерел?<br><a href=\"https://lib-hdak.in.ua/search-scientific-info.html\" target=\"_blank\">Заповнити форму запиту ↗</a>", 
    chips: ["📖 Репозитарій ХДАК", "👤 Авторські профілі", "🔬 Пошук наукової інформації"] 
  }
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversationId = parseInt(id);
    if (isNaN(conversationId)) return Response.json({ error: "Invalid ID" }, { status: 400 });

    const { content } = await request.json();
    if (!content?.trim()) return Response.json({ error: "Empty" }, { status: 400 });

    const clientIp = getClientIp(request);
    if (isRateLimited(clientIp)) return Response.json({ error: "Rate limit" }, { status: 429 });

    const [_, history, systemPrompt] = await Promise.all([
      chatStorage.createMessage(conversationId, "user", content),
      chatStorage.getMessagesByConversation(conversationId),
      buildSystemPrompt()
    ]);

    const lower = content.toLowerCase().trim();
    for (const reply of Object.values(AUTOMATED_REPLIES)) {
      if (reply.keywords.some(k => lower.includes(k))) {
        const responseText = `${reply.content}\n\n[CHIPS: ${reply.chips.join(', ')}]`;
        await chatStorage.createMessage(conversationId, "assistant", responseText);
        return new Response(responseText, { headers: { "Content-Type": "text/plain" } });
      }
    }

    if (history.length === 1) {
      (async () => {
        try {
          const title = await googleGeminiGenerate(`Створи дуже коротку назву (макс 3-4 слова) для діалогу українською мовою: "${content}". Тільки назва.`)
            || (await generateText({ model: getModel(), prompt: `Title for: ${content}` })).text;
          if (title) await chatStorage.updateConversationTitle(conversationId, title.trim());
        } catch (e) { console.error(e); }
      })();
    }

    try {
      const result = await streamText({
        model: getModel(true),
        system: systemPrompt,
        messages: history.map(m => ({ role: m.role as any, content: m.content })),
        async onFinish({ text }) {
          if (text) await chatStorage.createMessage(conversationId, "assistant", text);
        }
      });
      return result.toTextStreamResponse();
    } catch (aiError) {
      const result = await streamText({
        model: getModel(false),
        system: systemPrompt,
        messages: history.map(m => ({ role: m.role as any, content: m.content })),
        async onFinish({ text }) {
          if (text) await chatStorage.createMessage(conversationId, "assistant", text);
        }
      });
      return result.toTextStreamResponse();
    }
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Service unavailable" }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversationId = parseInt(id);
    const messages = await chatStorage.getMessagesByConversation(conversationId);
    return Response.json(messages);
  } catch (error) {
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
