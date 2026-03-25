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

  let infoString = "=== ПОДОБИЦІ З БАЗИ ЗНАНЬ ===\n\n";
  if (info && info.length > 0) infoString += "ІНФО:\n" + info.map(i => `- ${i.key}: ${i.value_uk}`).join("\n") + "\n\n";
  if (resources && resources.length > 0) infoString += "РЕСУРСИ:\n" + resources.map(r => `- ${r.name} (${r.type}): ${r.url}`).join("\n") + "\n\n";

  cachedSystemPrompt = `Ти — офіційний чат-помічник бібліотеки Харківської державної академії культури (ХДАК). Відповідай коротко, по-українськи.

КОНТАКТИ:
Адреса: вул. Бурсацький узвіз, 4, Харків 61057
(ст. метро «Історичний музей»)
Тел: (057) 731-27-83, (057) 731-13-85
Email: abon@xdak.ukr.education
Viber/Telegram: +380661458484
Instagram: @hdak_lib
Facebook: m.me/641740969354328
Сайт: https://lib-hdak.in.ua/

ГРАФІК:
Абонементи: Пн-Пт 9:00-16:45 (перерва 13-13:45), сб/нд вихідні, санітарний день - остання п'ятниця місяця.
Читальна зала: Пн-Пт 9:00-16:45, сб 9:00-13:30, санітарний день - останній четвер місяця.
Е-читальна зала (кімн.18а): Пн-Пт 9:00-16:45, сб/нд вихідні.
Воєнний стан: обслуговування також дистанційно.

КАТАЛОГ:
Пошук: https://library-service.com.ua:8443/khkhdak/DocumentSearchForm
Сторінка: https://lib-hdak.in.ua/e-catalog.html
Мобільний Android: https://play.google.com/store/apps/details?id=ush.libclient

РЕПОЗИТАРІЙ: https://repository.ac.kharkov.ua/home
(підручники, статті, кваліфікаційні роботи — відкритий доступ)

ЗАПИС ДО БІБЛІОТЕКИ:
Email: abon@xdak.ukr.education
Viber/Telegram: +380661458484

ПРАВИЛА (коротко):
Відвідувати з квитком, повертати вчасно, дотримуватися тиші. Повні правила: https://lib-hdak.in.ua/rules-library.html

НАУКОВІ РЕСУРСИ:
Відкриті: Репозитарій ХДАК, Springer Link, УкрІНТЕІ, DOAJ
Корпоративні: Scopus, Web of Science, ScienceDirect, Research 4 Life
Запит: https://lib-hdak.in.ua/search-scientific-info.html

ДИРЕКТОР: Кирпа Тетяна Олександрівна (кімн. 16)

${infoString}
`;
  
  lastCacheUpdate = now;
  return cachedSystemPrompt;
}

const AUTOMATED_REPLIES: Record<string, { keywords: string[]; content: string; chips: string[] }> = {
  "hours": { 
    keywords: ["графік", "годин", "розклад", "субот", "вихідн", "перерв", "коли"],
    content: "<strong>Абонементи + бібліографічний відділ:</strong><br>Пн–Пт: 9:00–16:45 (перерва 13:00–13:45)<br>Вихідні: субота, неділя<br>Санітарний день: <em>остання п'ятниця місяця</em><br><br><strong>Читальна зала:</strong><br>Пн–Пт: 9:00–16:45<br>Субота: 9:00–13:30<br>Санітарний день: <em>останній четвер місяця</em><br><br><strong>Е-читальна зала (кімн. 18а):</strong><br>Пн–Пт: 9:00–16:45 (перерва 13:00–13:45)<br>Вихідні: субота, неділя<br>Санітарний день: <em>останній четвер місяця</em><br><br>ℹ️ На час воєнного стану — обслуговування також дистанційно.\n<div class=\"src\">lib-hdak.in.ua</div>", 
    chips: ["Адреса та проїзд", "Записатися", "Е-читальна зала"] 
  },
  "catalog": { 
    keywords: ["каталог", "пошук книг", "знайти", "є у вас", "автор", "назва", "літератур"],
    content: "<strong>Електронний каталог ХДАК</strong> — пошук за автором, назвою, темою, роком.<br><br><a href=\"https://library-service.com.ua:8443/khkhdak/DocumentSearchForm\" target=\"_blank\">🔍 Відкрити пошук ↗</a><br><a href=\"https://lib-hdak.in.ua/e-catalog.html\" target=\"_blank\">📄 Інструкція з пошуку ↗</a><br><br><strong>Поради для пошуку:</strong><br>• За назвою — шукайте по окремих словах<br>• Анотація — вводьте частину слова зі знаком * (наприклад: <em>культур*</em>)<br>• Рік видання — заповніть обидва поля для діапазону<br><br><strong>📱 Мобільний додаток Android:</strong><br><a href=\"https://play.google.com/store/apps/details?id=ush.libclient\" target=\"_blank\">Google Play ↗</a> &nbsp;·&nbsp; Адреса: <code>https://ush.com.ua/khkhdak</code>\n<div class=\"src\">lib-hdak.in.ua/e-catalog</div>", 
    chips: ["Репозитарій ХДАК", "Мобільний додаток", "Пошук наукової інформації"] 
  },
  "register": { 
    keywords: ["записати", "стати читачем", "читацький квиток", "реєстрація", "отримати квиток", "квіток"],
    content: "<strong>Особисто:</strong><br>1. Паспорт або студентський квиток<br>2. Заповнити читацький формуляр<br>3. Отримати читацький квиток<br><br><strong>Дистанційно</strong> (на час воєнного стану):<br>📧 <a href=\"mailto:abon@xdak.ukr.education\">abon@xdak.ukr.education</a><br>📱 Viber/Telegram: <a href=\"tel:+380661458484\">+380 66 145 84 84</a><br>💬 <a href=\"http://m.me/641740969354328\" target=\"_blank\">Facebook Messenger ↗</a><br>📸 <a href=\"https://www.instagram.com/hdak_lib/\" target=\"_blank\">Instagram @hdak_lib ↗</a><br><br>📍 Адреса: вул. Бурсацький узвіз, 4 (ст. метро «Історичний музей»)\n<div class=\"src\">lib-hdak.in.ua</div>", 
    chips: ["Графік роботи", "Правила бібліотеки", "Єдина картка читача"] 
  },
  "contacts": { 
    keywords: ["контакт", "телефон", "адреса", "де знаходиться", "дістатися", "email", "пошта", "локац", "узвіз"],
    content: "📍 <strong>Адреса:</strong><br>вул. Бурсацький узвіз, 4, Харків 61057<br>(ст. метро «Історичний музей»)<br><br>📞 <strong>Телефони:</strong><br>(057) 731-27-83 &nbsp;·&nbsp; (057) 731-13-85<br><br>📧 <strong>Email:</strong><br><a href=\"mailto:abon@xdak.ukr.education\">abon@xdak.ukr.education</a> — запис<br><br>📱 <strong>Месенджери:</strong><br>Viber/Telegram: <a href=\"tel:+380661458484\">+380 66 145 84 84</a><br><a href=\"http://m.me/641740969354328\" target=\"_blank\">Facebook ↗</a> &nbsp;·&nbsp; <a href=\"https://www.instagram.com/hdak_lib/\" target=\"_blank\">Instagram ↗</a><br><br><a href=\"https://lib-hdak.in.ua/contacts.html\" target=\"_blank\">Сторінка контактів ↗</a>\n<div class=\"src\">lib-hdak.in.ua/contacts</div>", 
    chips: ["Графік роботи", "Записатися", "Структура бібліотеки"] 
  },
  "rules": { 
    keywords: ["правила", "можна", "не можна", "штраф", "загубив", "борг", "повернення", "обумов", "правил"],
    content: "<strong>Правила користування бібліотекою ХДАК:</strong><br><br>✅ <strong>Обов'язки читача:</strong><br>1. Відвідувати лише з читацьким квитком<br>2. Підписувати за кожне отримане видання<br>3. Повертати вчасно у встановлений строк<br>4. Не передавати квиток іншим особам<br>5. Дотримуватися тиші, не використовувати телефон<br>6. При втраті — замінити рівноцінним або відшкодувати<br>7. Наприкінці семестру повернути всі видання<br><br>⚠️ При порушенні — позбавлення права користування на термін, встановлений бібліотекою.<br><br><a href=\"https://lib-hdak.in.ua/rules-library.html\" target=\"_blank\">Повні правила ↗</a> &nbsp;·&nbsp; <a href=\"https://lib-hdak.in.ua/rules-library-e-reading-room.html\" target=\"_blank\">Правила е-читальної зали ↗</a>\n<div class=\"src\">lib-hdak.in.ua/rules-library</div>", 
    chips: ["Правила е-читальної зали", "Записатися", "Графік роботи"] 
  },
  "science": { 
    keywords: ["scopus", "web of science", "науков", "статті", "дисертація", "автореферат", "wos", "springer", "elsevier"],
    content: "<strong>🆓 Відкритий доступ:</strong><br>• <a href=\"https://repository.ac.kharkov.ua/home\" target=\"_blank\">Репозитарій ХДАК ↗</a> — підручники, статті, кваліфікаційні роботи<br>• <a href=\"http://elib.nplu.org/\" target=\"_blank\">«Культура України» ↗</a> — електронна бібліотека<br>• <a href=\"https://link.springer.com/\" target=\"_blank\">Springer Link ↗</a><br>• <a href=\"http://nrat.ukrintei.ua/\" target=\"_blank\">УкрІНТЕІ ↗</a> — автореферати дисертацій<br>• <a href=\"https://lib-hdak.in.ua/catalog-doaj.html\" target=\"_blank\">DOAJ ↗</a> — відкриті журнали<br><br><strong>🔐 Корпоративний доступ</strong> (мережа ХДАК або VPN):<br>• <a href=\"https://www.scopus.com/\" target=\"_blank\">Scopus ↗</a><br>• <a href=\"https://www.webofscience.com/\" target=\"_blank\">Web of Science ↗</a><br>• <a href=\"https://www.sciencedirect.com/\" target=\"_blank\">ScienceDirect (Elsevier) ↗</a><br>• <a href=\"https://login.research4life.org/tacsgr1portal_research4life_org/\" target=\"_blank\">Research 4 Life ↗</a><br><br>💡 Потрібна допомога з добором джерел?<br><a href=\"https://lib-hdak.in.ua/search-scientific-info.html\" target=\"_blank\">Заповнити форму запиту ↗</a>\n<div class=\"src\">lib-hdak.in.ua/search-scientific-info</div>", 
    chips: ["Репозитарій ХДАК", "Авторські профілі", "Пошук наукової інформації"] 
  },
  "repo": { 
    keywords: ["репозитарій", "підручники онлайн", "матеріали", "скачати", "безкоштовно", "підручник"],
    content: "<strong>Репозитарій ХДАК</strong> — відкритий цифровий архів:<br><a href=\"https://repository.ac.kharkov.ua/home\" target=\"_blank\">repository.ac.kharkov.ua ↗</a><br><br><strong>Що є в репозитарії:</strong><br>• Підручники та навчальні посібники<br>• Навчально-методичні матеріали<br>• Монографії викладачів ХДАК<br>• Наукові статті та збірники<br>• Кваліфікаційні роботи здобувачів<br><br>✅ Доступ безкоштовний, без реєстрації.<br><br><a href=\"https://lib-hdak.in.ua/scientists-publications.html\" target=\"_blank\">Публікації вчених ХДАК ↗</a>\n<div class=\"src\">repository.ac.kharkov.ua</div>", 
    chips: ["Наукові бази даних", "Публікації вчених ХДАК", "Каталог"] 
  },
  "unified": { 
    keywords: ["єдина картка", "картк", "каразін", "цнб", "інші університети", "харківські"],
    content: "<strong>Проєкт «Єдина картка читача»</strong><br>ХДАК — учасник з лютого 2016 року.<br><br><strong>Що дає картка:</strong><br>• Доступ до фондів усіх бібліотек-учасниць Харкова<br>• Безкоштовне обслуговування у читальних залах<br>• Онлайн-замовлення літератури<br>• Доступ до електронних каталогів<br><br><strong>📍 Де отримати картку:</strong><br>ЦНБ ім. В.Н. Каразіна<br>Відділ реєстрації, кімн. 7-50<br>Тел.: <a href=\"tel:+380577075674\">707-56-74</a><br>⚠️ При собі мати читацький квиток ХДАК!<br><br><a href=\"https://lib-hdak.in.ua/project-unified-reader-card.html\" target=\"_blank\">Детальніше про проєкт ↗</a> &nbsp;·&nbsp; <a href=\"https://www.google.com/maps/d/u/0/viewer?mid=zZ5ryHhTX-uk.kDSxRYR32iQI\" target=\"_blank\">Карта бібліотек ↗</a>\n<div class=\"src\">lib-hdak.in.ua/project-unified-reader-card</div>", 
    chips: ["Записатися", "Графік роботи", "Контакти"] 
  },
  "eroom": { 
    keywords: ["е-читальн", "електронна зал", "комп'ютер", "інтернет", "пк"],
    content: "<strong>Електронна читальна зала (ЕЧЗ)</strong><br><br>📍 Головний корпус, 2-й поверх, кімн. 18а<br><br>⏰ <strong>Графік:</strong><br>Пн–Пт: 9:00–16:45 (перерва 13:00–13:45)<br>Вихідні: субота, неділя<br>Санітарний день: останній четвер місяця<br><br><strong>✅ Послуги:</strong><br>• Доступ до каталогу та репозитарію<br>• Пошук інформації в інтернеті<br>• Копіювання на носії<br>• Довідки за запитами<br><br><strong>❌ Заборонено:</strong><br>Змінювати налаштування ПК, приносити їжу, користуватися телефоном, встановлювати програми.<br><br><a href=\"https://lib-hdak.in.ua/rules-library-e-reading-room.html\" target=\"_blank\">Повні правила ЕЧЗ ↗</a>\n<div class=\"src\">lib-hdak.in.ua/rules-library-e-reading-room</div>", 
    chips: ["Правила е-читальної зали", "Наукові бази даних", "Графік"] 
  },
  "exhibits": { 
    keywords: ["виставк", "virtual", "колекц", "онлайн перегляд"],
    content: "<strong>Віртуальні виставки бібліотеки ХДАК</strong><br><br>Бібліотека регулярно готує тематичні онлайн-виставки присвячені визначним датам, персоналіям та актуальним темам.<br><br><a href=\"https://lib-hdak.in.ua/virtual-exhibitions.html\" target=\"_blank\">🎭 Переглянути виставки ↗</a><br><br>Також доступні:<br>• <a href=\"https://lib-hdak.in.ua/artifacts.html\" target=\"_blank\">Артефактні книжкові видання ↗</a><br>• <a href=\"https://lib-hdak.in.ua/new-acquisitions.html\" target=\"_blank\">Нові надходження ↗</a><br>• <a href=\"https://lib-hdak.in.ua/gallery-all.html\" target=\"_blank\">Галерея бібліотеки ↗</a>\n<div class=\"src\">lib-hdak.in.ua/virtual-exhibitions</div>", 
    chips: ["Нові надходження", "Артефактні видання", "Каталог"] 
  },
  "author": { 
    keywords: ["авторський профіль", "orcid", "google scholar", "h-індекс", "наукометрія", "researcher id", "scopus профіль"],
    content: "<strong>Авторські профілі — інструкції від бібліотеки ХДАК:</strong><br><br><a href=\"https://lib-hdak.in.ua/author-profiles-instructions.html\" target=\"_blank\">📋 Інструкції зі створення профілів ↗</a><br><br>Охоплює реєстрацію та налаштування в:<br>• ORCID<br>• Google Scholar<br>• Scopus Author ID<br>• ResearcherID (Web of Science)<br><br><strong>Потрібна індивідуальна консультація?</strong><br>Сектор наукометрії — кімн. 17<br>Зав. сектору: Левченко Олена Миколаївна<br><br><a href=\"https://lib-hdak.in.ua/scientists-publications.html\" target=\"_blank\">Публікації вчених ХДАК ↗</a>\n<div class=\"src\">lib-hdak.in.ua/author-profiles-instructions</div>", 
    chips: ["Наукові бази даних", "Репозитарій ХДАК", "Пошук наукової інформації"] 
  },
  "structure": { 
    keywords: ["структура", "відділ", "директор", "персонал", "співробітник", "кімнат"],
    content: "<strong>Структура бібліотеки ХДАК:</strong><br><br>👤 <strong>Директор:</strong> Кирпа Тетяна Олександрівна (кімн. 16)<br><br><strong>Відділ обслуговування</strong> — Бєлан Тетяна Ігорівна (кімн. 19):<br>• Читальна зала — кімн. 18<br>• Загальний абонемент — кімн. 19<br>• Науковий абонемент — кімн. 2<br>• Навчальний абонемент — кімн. 1<br>• Абонемент музики/театру/кіно — корп. 4, кімн. 20<br><br><strong>Інформаційно-бібліографічний відділ</strong><br>Хижна Оксана Сергіївна — кімн. 17<br><br><strong>Сектор наукометрії</strong><br>Левченко Олена Миколаївна — кімн. 17<br><br><strong>Сектор автоматизації (е-читальна зала)</strong><br>Семенова Тетяна Володимирівна — кімн. 18а<br><br><a href=\"https://lib-hdak.in.ua/structure-library.html\" target=\"_blank\">Детальніше про структуру ↗</a>\n<div class=\"src\">lib-hdak.in.ua/structure-library</div>", 
    chips: ["Контакти", "Е-читальна зала", "Графік роботи"] 
  },
  "fallback": {
    keywords: ["допомога", "привіт", "здоров", "що ти", "вмієш", "підкаж", "інше"],
    content: "Я — чат-помічник бібліотеки ХДАК. Можу допомогти з:<br><br>📚 <strong>Пошук:</strong> електронний каталог, репозитарій<br>🕐 <strong>Організаційне:</strong> графік, запис, правила<br>🔬 <strong>Наука:</strong> бази даних, авторські профілі<br>📍 <strong>Контакти:</strong> адреса, телефони, месенджери<br><br>Або зверніться напряму:<br>📧 <a href=\"mailto:abon@xdak.ukr.education\">abon@xdak.ukr.education</a><br>📱 <a href=\"tel:+380661458484\">+380 66 145 84 84</a> (Viber/Telegram)<br>🌐 <a href=\"https://lib-hdak.in.ua/\" target=\"_blank\">lib-hdak.in.ua ↗</a>\n<div class=\"src\">lib-hdak.in.ua</div>",
    chips: ["Каталог", "Графік роботи", "Контакти"]
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
