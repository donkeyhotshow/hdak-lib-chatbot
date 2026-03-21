import { chatStorage } from "@/lib/storage";
import type { LibraryInfo, LibraryResource } from "@/lib/db";

function buildLibraryContext(
  libInfo: LibraryInfo[],
  libResources: LibraryResource[]
): string {
  const grouped: Record<string, string[]> = {};
  for (const item of libInfo) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(`${item.key}: ${item.value_uk}`);
  }

  const infoBlock = Object.entries(grouped)
    .map(([cat, entries]) => `[${cat.toUpperCase()}]\n${entries.join("\n")}`)
    .join("\n\n");

  const resourceBlock = libResources
    .filter(r => r.is_official)
    .map(r => {
      const authNote = r.requires_auth ? " (потрібна авторизація/VPN)" : "";
      return `- [${r.type.toUpperCase()}] ${r.name}${authNote}\n  URL: ${r.url}\n  Опис: ${r.description_uk}`;
    })
    .join("\n\n");

  return `=== ДАНІ З БАЗИ ДАНИХ БІБЛІОТЕКИ ===\n\n${infoBlock}\n\n[РЕСУРСИ]\n${resourceBlock}\n\n=== КІНЕЦЬ ДАНИХ ===`;
}

function buildSystemPrompt(libraryContext: string): string {
  return `Ти — AI-асистент Наукової бібліотеки Харківської державної академії культури (ХДАК).
Твоя роль: допомагати користувачам знаходити інформацію про бібліотеку, її ресурси та послуги.

${libraryContext}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ПРАВИЛА (дотримуйся суворо)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. ДЖЕРЕЛА ДАНИХ
   - Використовуй ЛИШЕ інформацію з блоку «ДАНІ З БАЗИ ДАНИХ БІБЛІОТЕКИ» вище.
   - Якщо дані в БД суперечать попереднім відповідям — правильними вважаються дані з БД.
   - Не придумуй адреси, телефони, години роботи — бери значення лише з БД.

2. ПОШУК КНИГ / ДОКУМЕНТІВ
   - Для пошуку будь-якого документа завжди надавай посилання на Електронний каталог.
   - Для наукових праць, дисертацій, монографій — посилання на Інституційний репозитарій.
   - НІКОЛИ не вигадуй інвентарні номери, шифри зберігання або шифри УДК/ББК.

3. ПОСИЛАННЯ
   - Використовуй ЛИШЕ URL з поля url у блоці ресурсів вище.
   - Якщо потрібного ресурсу немає в БД — не вигадуй URL. Замість цього направ до офіційного сайту або порадь звернутися до бібліотекаря.

4. ПОСЛУГИ ТА ПРАВИЛА
   - Не обіцяй послуги, яких немає в полі services бази даних.
   - Для питань про штрафи, продовження, стан читацького рахунку — давай загальну відповідь і додавай:
     «Точну інформацію щодо вашого читацького рахунку можна отримати безпосередньо в бібліотеці або уточнити в бібліотекаря.»

5. КОЛИ ДАНИХ НЕМАЄ
   - Якщо запитаної інформації немає в БД — чесно скажи: «У мене немає цих даних» і запропонуй звернутися до бібліотекаря або на офіційний сайт бібліотеки (https://lib-hdak.in.ua/).
   - Не вигадуй відділи, посади, розклад або правила, яких немає в БД.

6. МОВА
   - Відповідай мовою, якою пише користувач.
   - За замовчуванням — українська.
   - Якщо питання українською → відповідь українською; якщо англійською → англійською.
   - Якщо питання написане будь-якою іншою мовою — відповідай українською.

7. СТИЛЬ
   - Будь ввічливим, чітким і лаконічним.
   - Уникай зайвих слів. Якщо є конкретне посилання — надай його одразу.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversationId = parseInt(id);
    const { content } = await request.json();

    // Save user message first
    await chatStorage.createMessage(conversationId, "user", content);

    // Fetch library context from DB
    const [libInfo, libResources, historyMessages] = await Promise.all([
      chatStorage.getLibraryInfo(),
      chatStorage.getLibraryResources(),
      chatStorage.getMessagesByConversation(conversationId),
    ]);

    // Build structured context and system prompt
    const libraryContext = buildLibraryContext(libInfo, libResources);
    const systemPrompt = buildSystemPrompt(libraryContext);

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
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Failed to send message" })}\n\n`));
          controller.close();
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
