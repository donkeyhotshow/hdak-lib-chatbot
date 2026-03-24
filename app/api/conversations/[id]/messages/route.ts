import { streamText, generateText, type LanguageModel } from "ai";
import { openai } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { chatStorage } from "../../../../../lib/storage";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// --- Simple Rate Limiter (по IP) ---
const REQUEST_LOGS = new Map<string, number[]>();
const RATE_LIMIT = 8;
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

// --- Gemini REST Fallback ---
async function googleGeminiGenerate(prompt: string): Promise<string> {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) throw new Error("Missing Google API Key");
  
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 500, temperature: 0.7 }
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
  const openRouterKey = process.env.BUILT_IN_FORGE_API_KEY;
  const openRouterUrl = process.env.BUILT_IN_FORGE_API_URL;
  const openaiKey = process.env.OPENAI_API_KEY;
  const modelName = process.env.AI_MODEL_NAME || "openai/gpt-4o-mini";

  if (primary && openRouterKey && openRouterUrl) {
    const openrouter = createOpenRouter({
      apiKey: openRouterKey,
      baseURL: openRouterUrl.replace('/chat/completions', ''),
      headers: {
        "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER || "https://hdak-lib-chatbot.onrender.com",
        "X-Title": process.env.OPENROUTER_X_TITLE || "HDAK Library Chatbot",
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

  let infoString = "=== БАЗА ЗНАНЬ (Фактичні дані бібліотеки ХДАК) ===\n\n";
  if (info && info.length > 0) infoString += "ЗАГАЛЬНА ІНФОРМАЦІЯ:\n" + info.map(i => `- ${i.key}: ${i.value_uk}`).join("\n") + "\n\n";
  if (resources && resources.length > 0) infoString += "РЕСУРСИ:\n" + resources.map(r => `- ${r.name} (${r.type}): ${r.url}\n  Опис: ${r.description_uk}`).join("\n") + "\n\n";

  cachedSystemPrompt = `Ти — офіційний чат-помічник бібліотеки ХДАК ("Concierge").
Відповідай ВИКЛЮЧНО українською мовою. Коротко, точно, професійно та доброзичливо.

=== СЦЕНАРІЇ ТА ПОСИЛАННЯ ===
Обов'язково використовуй ці посилання (у форматі Markdown) при відповідних питаннях:
1. Загальна інформація про бібліотеку: [Сайт бібліотеки ХДАК](https://lib-hdak.in.ua/)
2. Пошук книг або матеріалів в каталозі: [Відкрити форму пошуку e-catalog](https://library-service.com.ua:8443/khkhdak/DocumentSearchForm)
3. Якщо користувач питає "знайти книгу", "пошук" або "де знайти":
   Надай коротку інструкцію та обов'язково додай посилання на форму пошуку (пункт 2).
4. Пошук за темами (класифікатор): [Пошук теми в каталогах](https://lib-hdak.in.ua/e-catalog.html#toggle-0)
5. Пошук за автором/ISBN/назвою: [Пошук за атрибутами](https://lib-hdak.in.ua/e-catalog.html#toggle-1)

=== БАЗА ЗНАНЬ (Фактичні дані бібліотеки ХДАК) ===
${infoString}
=== КІНЕЦЬ БАЗИ ЗНАНЬ ===
Запис до бібліотеки: проводиться за списками груп або особисто (через студентський квиток).`;
  
  lastCacheUpdate = now;
  return cachedSystemPrompt;
}

const AUTOMATED_REPLIES: Record<string, { keywords: string[]; content: string; chips: string[] }> = {
  "catalog": { 
    keywords: ["каталог", "книг", "пошук", "знайти", "літератур"],
    content: "Електронний каталог ХДАК: [Пошук в каталозі](https://library-service.com.ua:8443/khkhdak/DocumentSearchForm).", 
    chips: ["Як шукати?", "Репозитарій", "Контакти"] 
  },
  "hours": { 
    keywords: ["графік", "час", "коли", "відкрит", "працює"],
    content: "Графік роботи: Пн-Пт 9:00–16:45 (перерва 13:00–13:45), Сб 9:00–13:30. Нд — вихідний. Останній четвер місяця — санітарний день.", 
    chips: ["Записатися", "Де знаходиться?", "Правила"] 
  },
  "register": { 
    keywords: ["записати", "квіток", "стати", "читач", "реєстрац"],
    content: "Для запису потрібен паспорт та студентський квиток (студентам ХДАК). Звертайтеся у відділ обслуговування.", 
    chips: ["Я студент ХДАК", "Зовнішній читач"] 
  },
  "contacts": { 
    keywords: ["контакт", "телефон", "пошта", "email", "зв'яз", "соцмереж"],
    content: "Тел: (057) 731-27-83. Viber/Telegram: +380661458484. Email: bibliohdak@gmail.com.", 
    chips: ["Де знаходиться?", "Графік", "Сайт"] 
  },
  "address": { 
    keywords: ["адреса", "локац", "де ви", "місце", "координат", "узвіз"],
    content: "Харків, Бурсацький узвіз, 4. Біля ст. метро «Історичний музей».", 
    chips: ["Як доїхати?", "Графік", "Записатися"] 
  },
  "rules": { 
    keywords: ["правил", "повернення", "штраф", "термін", "обумов"],
    content: "Дбайливе ставлення до книг та дотримання дедлайнів повернення (зазвичай 14 днів).", 
    chips: ["Записатися", "Сайт", "Контакти"] 
  }
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversationId = parseInt(id);
    if (isNaN(conversationId)) {
      return Response.json({ error: "Invalid conversation ID" }, { status: 400 });
    }

    const { content } = await request.json();

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return Response.json({ error: "Empty message" }, { status: 400 });
    }
    if (content.length > 4000) {
      return Response.json({ error: "Повідомлення занадто довге (максимум 4000 символів)" }, { status: 400 });
    }

    const clientIp = getClientIp(request);
    if (isRateLimited(clientIp)) {
      return Response.json({ error: "Занадто багато запитів. Зачекайте хвилину." }, { status: 429 });
    }

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
          const title = await googleGeminiGenerate(`Створи дуже коротку назву (макс 3-4 слова) для діалогу українською мовою на основі цього питання: "${content}". Відповідай ТІЛЬКИ назвою без лапок.`)
            || (await generateText({ model: getModel(), prompt: `Title for: ${content}` })).text;
          if (title) await chatStorage.updateConversationTitle(conversationId, title.trim());
        } catch (e) { console.error("Title generation failed:", e); }
      })();
    }

    try {
      const result = await streamText({
        model: getModel(true),
        system: systemPrompt,
        messages: history.map(m => ({ role: m.role as any, content: m.content })),
        async onFinish({ text }) {
          if (text) {
            try { await chatStorage.createMessage(conversationId, "assistant", text); }
            catch (e) { console.error("onFinish: failed to save assistant message:", e); }
          }
        }
      });
      return result.toTextStreamResponse();
    } catch (aiError) {
      console.warn("Primary AI failed, trying Secondary...");
      try {
        const result = await streamText({
          model: getModel(false),
          system: systemPrompt,
          messages: history.map(m => ({ role: m.role as any, content: m.content })),
          async onFinish({ text }) {
            if (text) {
              try { await chatStorage.createMessage(conversationId, "assistant", text); }
              catch (e) { console.error("onFinish(secondary): failed to save assistant message:", e); }
            }
          }
        });
        return result.toTextStreamResponse();
      } catch (fallbackError) {
        console.error("Secondary AI failed, trying Gemini Free Fallback...");
        const text = await googleGeminiGenerate(`${systemPrompt}\n\n${history.map(m => `${m.role}: ${m.content}`).join('\n')}\nassistant:`);
        if (text) {
          try {
            await chatStorage.createMessage(conversationId, "assistant", text);
          } catch (dbError) {
            console.error("Fallback: DB save failed:", dbError);
          }
          return new Response(text, { headers: { "Content-Type": "text/plain" } });
        }
        throw new Error("All AI providers failed");
      }
    }

  } catch (error) {
    console.error("Service Error:", error);
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
    if (isNaN(conversationId)) {
      return Response.json({ error: "Invalid conversation ID" }, { status: 400 });
    }
    const messages = await chatStorage.getMessagesByConversation(conversationId);
    return Response.json(messages);
  } catch (error) {
    return Response.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}
