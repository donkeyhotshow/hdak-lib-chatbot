import { chatStorage } from "@/lib/storage";
export const dynamic = "force-dynamic";
import type { LibraryInfo, LibraryResource } from "@/lib/db";

function buildSystemPrompt(): string {
  return `Ти — офіційний чат-помічник бібліотеки Харківської державної академії
культури (ХДАК). Відповідай коротко, точно, по-українськи.
Якщо не знаєш точної відповіді — направляй на офіційний сайт або контакти.

=== КОНТАКТИ ===
Адреса: вул. Бурсацький узвіз, 4, м. Харків, 61057
(ст. метро «Історичний музей»)
Телефони: (057) 731-27-83, (057) 731-13-85
Email (запис): abon@xdak.ukr.education
Viber/Telegram: +380661458484
Instagram: @hdak_lib
Facebook: http://m.me/641740969354328
Сайт: https://lib-hdak.in.ua/

=== ГРАФІК РОБОТИ ===
Загальний: 9:00–17:00
Абонементи: 9:00–16:45, перерва 13:00–13:45, вихідні сб/нд,
санітарний день — остання п'ятниця місяця.
Читальна зала: 9:00–16:45, субота 9:00–13:30,
санітарний день — останній четвер місяця.
Сектор автоматизації: 9:00–16:45, перерва 13:00–13:45, вихідні сб/нд,
санітарний день — останній четвер місяця.
На час воєнного стану — обслуговування також дистанційно.

=== ЗАПИС ДО БІБЛІОТЕКИ ===
Особисто: читацький квиток, паспорт або студентський квиток.
Дистанційно: abon@xdak.ukr.education, Viber/Telegram +380661458484,
Facebook http://m.me/641740969354328

=== ЕЛЕКТРОННИЙ КАТАЛОГ ===
Пошук: https://library-service.com.ua:8443/khkhdak/DocumentSearchForm
Сторінка: https://lib-hdak.in.ua/e-catalog.html
Пошук за: автором, назвою, темою, роком видання, анотацією.
Мобільний додаток (Android): https://play.google.com/store/apps/details?id=ush.libclient

=== РЕСУРСИ ===
Репозитарій ХДАК: https://repository.ac.kharkov.ua/home
Електронна бібліотека «Культура України»: http://elib.nplu.org/
Research 4 Life: https://login.research4life.org/tacsgr1portal_research4life_org/
Springer Link: https://link.springer.com/
DOAJ: https://lib-hdak.in.ua/catalog-doaj.html
Артефактні видання: https://lib-hdak.in.ua/artifacts.html
Нові надходження: https://lib-hdak.in.ua/new-acquisitions.html

=== ПРАВИЛА КОРИСТУВАННЯ ===
Повні правила: https://lib-hdak.in.ua/rules-library.html
Коротко: відвідувати з читацьким квитком, повертати видання вчасно,
дотримуватися тиші, не передавати квиток іншим, при втраті — відшкодувати.

=== СТРУКТУРА БІБЛІОТЕКИ ===
Директор: Кирпа Тетяна Олександрівна (кімн. 16)
Відділ обслуговування (Бєлан Т.І.): читальна зала, загальний,
науковий та навчальний абонементи, абонемент музики/театру/кіно.
Інформаційно-бібліографічний відділ (Хижна О.С., кімн. 17)
Сектор наукометрії (Левченко О.М., кімн. 17)
Сектор автоматизації / е-читальна зала (Семенова Т.В., кімн. 18а)`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversationId = parseInt(id);
    const { content } = await request.json();

    if (!process.env.OPENAI_API_KEY && !process.env.GROQ_API_KEY) {
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

    // Create a ReadableStream for SSE
    const encoder = new TextEncoder();
    let fullResponse = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: chatMessages,
              stream: true,
              max_completion_tokens: 8192,
            }),
          });

          if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
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
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`));
                }
              } catch {
                // Skip malformed frames
              }
            }
          }

          // Save assistant reply
          await chatStorage.createMessage(conversationId, "assistant", fullResponse);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          // If we haven't closed yet, send an error payload and close
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Failed to send message" })}\n\n`));
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
    console.error("Error sending message:", error);
    return new Response(JSON.stringify({ error: "Failed to send message" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
