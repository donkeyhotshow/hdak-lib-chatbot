import { chatStorage } from "@/lib/storage";
export const dynamic = "force-dynamic";

function buildSystemPrompt(): string {
  return `Ти — офіційний чат-помічник бібліотеки Харківської державної академії культури (ХДАК). 
Твоя мета: допомагати користувачам знаходити книги, записуватися до бібліотеки та користуватися її ресурсами.

=== ПРАВИЛА ВІДПОВІДЕЙ ===
1. Відповідай коротко, точно, по-українськи.
2. Використовуй тільки перевірену інформацію з бази знань нижче.
3. Якщо користувач запитує те, чого немає в базі — направляй на офіційний сайт (https://lib-hdak.in.ua/) або контакти директора (кімн. 16).
4. Обов'язково додавай посилання, якщо вони є в тексті.

=== БАЗА ЗНАНЬ ===

1. КАТАЛОГ (тригери: каталог, знайти книгу, пошук, є у вас, автор):
Електронний каталог бібліотеки ХДАК:
🔍 Пошук: https://library-service.com.ua:8443/khkhdak/DocumentSearchForm
📄 Сторінка: https://lib-hdak.in.ua/e-catalog.html
Пошук за: автором, назвою, темою, роком видання, анотацією. При пошуку за назвою — шукайте за окремими словами.
📱 Мобільний додаток Android: https://play.google.com/store/apps/details?id=ush.libclient
Адреса для налаштування: https://ush.com.ua/khkhdak

2. ЗАПИСАТИСЯ (тригери: записатися, стати читачем, читацький квиток, реєстрація):
Запис до бібліотеки ХДАК:
Особисто: паспорт/студентський квиток, заповнити формуляр у бібліотеці.
Дистанційно: Email abon@xdak.ukr.education, Viber/Telegram +380661458484, Facebook http://m.me/641740969354328, Instagram @hdak_lib
📍 Адреса: вул. Бурсацький узвіз, 4, Харків (м. Історичний музей)

3. ГРАФІК (тригери: графік, години, коли, вихідні, субота):
🏛 Загальний: 9:00 – 17:00
📚 Абонементи + бібліографія: Пн–Пт 9:00–16:45 (перерва 13:00–13:45). Вихідні: сб, нд. Сандень: остання п'ятниця місяця.
📖 Читальна зала: Пн–Пт 9:00–16:45. Субота: 9:00–13:30. Сандень: останній четвер місяця.
💻 Е-читальна зала: Пн–Пт 9:00–16:45. Вихідні: сб, нд.

4. КОНТАКТИ (тригери: телефон, адреса, email, де знаходиться):
📍 Адреса: вул. Бурсацький узвіз, 4, м. Харків, 61057 (ст. «Історичний музей»)
📞 Телефони: (057) 731-27-83, (057) 731-13-85
📧 Email: abon@xdak.ukr.education
📱 Viber/Telegram: +380 66 145 84 84
🌐 Сайт: https://lib-hdak.in.ua/

5. ПРАВИЛА (тригери: правила, можна, штраф, борг, загубив):
Правила: https://lib-hdak.in.ua/rules-library.html
Коротко: квиток обов'язковий, повертати вчасно, тиша, не передавати квиток іншим. При втраті — заміна або грошове відшкодування.

6. НАУКОВІ БАЗИ (тригери: scopus, web of science, статті, дисертація):
Репозитарій: https://repository.ac.kharkov.ua/home
Scopus: https://www.scopus.com/
Web of Science: https://www.webofscience.com/
Research 4 Life: https://login.research4life.org/tacsgr1portal_research4life_org/

7. Е-ЧИТАЛЬНА ЗАЛА (тригери: е-читальна зала, комп'ютер, інтернет):
Локація: кімн. 18а. Пн–Пт 9:00–16:45. Пошук в інтернеті, доступ до каталогу, копіювання.

8. ЄДИНА КАРТКА (тригери: єдина картка, каразіна):
Дає доступ до фондів усіх бібліотек-учасниць Харкова. Отримати: ЦНБ ім. Каразіна, кімн. 7-50.

9. РЕПОЗИТАРІЙ (тригери: репозитарій, підручники онлайн, скачати):
Цифровий архів: https://repository.ac.kharkov.ua/home. Підручники, статті, монографії викладачів ХДАК.`;
}

const AUTOMATED_REPLIES = [
  {
    triggers: ['каталог', 'знайти книгу', 'пошук', 'є у вас', 'автор'],
    content: `Електронний каталог бібліотеки ХДАК:

🔍 Пошук: https://library-service.com.ua:8443/khkhdak/DocumentSearchForm
📄 Сторінка: https://lib-hdak.in.ua/e-catalog.html

Пошук за: автором, назвою, темою, роком видання, анотацією.
При пошуку за назвою — шукайте за окремими словами, не лише початком.

📱 Мобільний додаток Android:
https://play.google.com/store/apps/details?id=ush.libclient
Адреса для налаштування: https://ush.com.ua/khkhdak`,
    chips: ['Пошук за автором', 'Репозитарій', 'Мобільний додаток']
  },
  {
    triggers: ['записатися', 'стати читачем', 'читацький квиток', 'реєстрація'],
    content: `Запис до бібліотеки ХДАК:

Особисто:
1. Прийти з паспортом або студентским квитком
2. Заповнити читацький формуляр
3. Отримати читацький квиток

Дистанційно (на час воєнного стану):
📧 Email: abon@xdak.ukr.education
📱 Viber/Telegram: +380661458484
💬 Facebook: http://m.me/641740969354328
📸 Instagram: @hdak_lib

Адреса: вул. Бурсацький узвіз, 4, Харків
(ст. метро «Історичний музей»)`,
    chips: ['Графік роботи', 'Правила', 'Де знаходиться?']
  },
  {
    triggers: ['графік', 'години', 'коли', 'до котрої', 'вихідні', 'субота'],
    content: `Графік роботи бібліотеки ХДАК:

🏛 Загальний: 9:00 – 17:00

📚 Абонементи + інформаційно-бібліографічний відділ:
   Пн–Пт: 9:00–16:45 (перерва 13:00–13:45)
   Вихідні: субота, неділя
   Санітарний день: остання п'ятниця місяця

📖 Читальна зала:
   Пн–Пт: 9:00–16:45
   Субота: 9:00–13:30
   Санітарний день: останній четвер місяця

💻 Сектор автоматизації (е-читальна зала, кімн. 18а):
   Пн–Пт: 9:00–16:45 (перерва 13:00–13:45)
   Вихідні: субота, неділя
   Санітарний день: останній четвер місяця`,
    chips: ['Адреса та проїзд', 'Записатися', 'Контакти']
  },
  {
    triggers: ['контакти', 'телефон', 'адреса', 'email', 'де знаходиться', 'як дістатися'],
    content: `Контакти бібліотеки ХДАК:

📍 Адреса: вул. Бурсацький узвіз, 4, м. Харків, 61057
   Метро: ст. «Історичний музей»

📞 Телефони:
   (057) 731-27-83
   (057) 731-13-85

📧 Email (запис): abon@xdak.ukr.education
📱 Viber/Telegram: +380 66 145 84 84
💬 Facebook: m.me/641740969354328
📸 Instagram: instagram.com/hdak_lib

🌐 Сайт: https://lib-hdak.in.ua/
📋 Контакти: https://lib-hdak.in.ua/contacts.html

Директор: Кирпа Тетяна Олександрівна (кімн. 16)`,
    chips: ['Графік роботи', 'Записатися', 'Структура бібліотеки']
  },
  {
    triggers: ['правила', 'можна', 'не можна', 'штраф', 'борг', 'загубив книгу'],
    content: `Правила користування бібліотекою ХДАК:
https://lib-hdak.in.ua/rules-library.html

Обов'язки читача:
1. Відвідувати бібліотеку лише з читацьким квитком
2. Ставити підпис за кожне отримане видання
3. Повертати видання вчасно
4. Не передавати квиток іншим особам
5. Дотримуватися тиші, не використовувати телефон
6. При втраті — замінити рівноцінним виданням або ксерокопією, або розрахуватися готівкою.
7. Наприкінці семестру/навчального року повернути всі видання.

⚠️ При порушенні — позбавлення права користування на термін, встановлений бібліотекою.`,
    chips: ['Правила е-читальної зали', 'Записатися', 'Графік']
  },
  {
    triggers: ['scopus', 'web of science', 'наукова база', 'статті', 'дисертація', 'автореферат', 'наукові джерела'],
    content: `Наукові ресурси доступні через бібліотеку ХДАК:

🆓 Відкритий доступ:
• Репозитарій ХДАК: https://repository.ac.kharkov.ua/home
• Електронна бібліотека «Культура України»: http://elib.nplu.org/
• Springer Link: https://link.springer.com/

🔐 Корпоративний доступ (мережа академії або VPN):
• Scopus: https://www.scopus.com/
• Web of Science: https://www.webofscience.com/
• ScienceDirect: https://www.sciencedirect.com/

💡 Потрібна допомога з пошуком джерел? Заповніть форму: https://lib-hdak.in.ua/search-scientific-info.html`,
    chips: ['Репозитарій ХДАК', 'Авторські профілі', 'Пошук наукової інформації']
  },
  {
    triggers: ['е-читальна зала', 'електронна зала', 'комп\'ютер', 'інтернет в бібліотеці'],
    content: `Електронна читальна зала (ЕЧЗ) ХДАК:

📍 Розташування: головний корпус, 2-й поверх, кімн. 18а
⏰ Графік: Пн–Пт 9:00–16:45 (перерва 13:00–13:45)
   Вихідні: субота, неділя.

✅ Послуги:
• Доступ до електронного каталогу і репозитарію ХДАК
• Пошук в інтернеті
• Копіювання інформації на носії

Правила: https://lib-hdak.in.ua/rules-library-e-reading-room.html`,
    chips: ['Правила е-читальної зали', 'Репозитарій', 'Графік роботи']
  },
  {
    triggers: ['єдина картка', 'інші університети', 'каразіна', 'картка читача'],
    content: `Проєкт «Єдина картка читача» м. Харкова:
https://lib-hdak.in.ua/project-unified-reader-card.html

ХДАК є учасником проєкту з лютого 2016 року.
Дає безкоштовний доступ до фондів усіх бібліотек-учасниць.
📍 Де отримати: ЦНБ імені В.Н. Каразіна, кімн. 7-50. Тел.: 707-56-74.
При собі мати читацький квиток ХДАК!`,
    chips: ['Записатися до ХДАК', 'Графік', 'Контакти']
  },
  {
    triggers: ['репозитарій', 'підручники онлайн', 'навчальні матеріали', 'скачати'],
    content: `Репозитарій ХДАК — відкритий цифровий архів:
https://repository.ac.kharkov.ua/home

Містить:
• Повнотекстові підручники та навчальні посібники
• Навчально-методичні матеріали
• Монографії викладачів
• Наукові статті
🆓 Доступ: відкритий, без реєстрації`,
    chips: ['Наукові бази даних', 'Публікації вчених', 'Каталог']
  }
];

function getAutomatedReply(userInput: string) {
  const input = userInput.toLowerCase();
  for (const reply of AUTOMATED_REPLIES) {
    if (reply.triggers.some(t => input.includes(t))) {
      return reply;
    }
  }
  return null;
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
    return Response.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversationId = parseInt(id);
    const { content } = await request.json();

    const apiKey = process.env.BUILT_IN_FORGE_API_KEY || process.env.OPENAI_API_KEY;
    const apiUrl = process.env.BUILT_IN_FORGE_API_URL || "https://api.openai.com/v1/chat/completions";
    const modelName = process.env.AI_MODEL_NAME || "gpt-4o-mini";

    if (!apiKey) {
      return Response.json({ error: "API key not configured" }, { status: 500 });
    }

    // Save user message first
    await chatStorage.createMessage(conversationId, "user", content);

    // Fetch library context from DB
    const historyMessages = await chatStorage.getMessagesByConversation(conversationId);

    // Build structured context and system prompt
    const systemPrompt = buildSystemPrompt();

    // Build chat message array
    const chatMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
      ...historyMessages.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    // Check for automated reply
    const autoReply = getAutomatedReply(content);
    
    const encoder = new TextEncoder();
    let fullResponse = "";

    if (autoReply) {
      const responseText = autoReply.content + (autoReply.chips ? `\n\n[CHIPS: ${autoReply.chips.join(', ')}]` : '');
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(responseText));
          // Save async but don't block start
          chatStorage.createMessage(conversationId, "assistant", responseText).catch(console.error);
          controller.close();
        }
      });
      return new Response(stream, {
        headers: { 
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache"
        },
      });
    }

    console.log(`Sending message to LLM. URL: ${apiUrl}, Model: ${modelName}`);

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`,
              "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER || "https://hdak-lib-chatbot.onrender.com",
              "X-Title": process.env.OPENROUTER_X_TITLE || "HDAK Library Chatbot",
            },
            body: JSON.stringify({
              model: modelName,
              messages: chatMessages,
              stream: true,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error("LLM API Error Response:", errorText);
            throw new Error(`LLM API error: ${response.status}`);
          }

          const reader = response.body?.getReader();
          if (!reader) throw new Error("No response stream");

          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const raw = line.slice(6).trim();
              if (!raw || raw === "[DONE]") continue;

              try {
                const data = JSON.parse(raw);
                const delta = data.choices?.[0]?.delta?.content;
                if (typeof delta === "string") {
                  fullResponse += delta;
                  controller.enqueue(encoder.encode(delta));
                }
              } catch {
                // Skip malformed frames
              }
            }
          }

          // Save assistant reply
          await chatStorage.createMessage(conversationId, "assistant", fullResponse);
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          try {
            controller.close();
          } catch (e) {
            // Controller might be already closed
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("CRITICAL ERROR in POST /api/conversations/[id]/messages:", error);
    return new Response(JSON.stringify({ 
      error: "Failed to send message",
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
