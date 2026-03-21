import { streamText } from "ai";
import { chatStorage } from "@/lib/storage";
import type { LibraryInfo, LibraryResource } from "@/lib/db";

export const maxDuration = 60;

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

    // Ensure library data is seeded, then fetch context
    await chatStorage.seedLibraryData();
    const [libInfo, libResources, historyMessages] = await Promise.all([
      chatStorage.getLibraryInfo(),
      chatStorage.getLibraryResources(),
      chatStorage.getMessagesByConversation(conversationId),
    ]);

    // Build structured context and system prompt
    const libraryContext = buildLibraryContext(libInfo, libResources);
    const systemPrompt = buildSystemPrompt(libraryContext);

    // Build chat message array for AI SDK
    const messages: { role: "user" | "assistant"; content: string }[] = 
      historyMessages.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    // Use AI SDK streamText with Vercel AI Gateway (zero config)
    const result = streamText({
      model: "openai/gpt-4o-mini",
      system: systemPrompt,
      messages,
      maxTokens: 8192,
      abortSignal: request.signal,
    });

    // Create custom SSE stream to save message at the end
    const encoder = new TextEncoder();
    let fullResponse = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) {
            fullResponse += chunk;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`)
            );
          }

          // Save assistant reply after stream completes
          await chatStorage.createMessage(conversationId, "assistant", fullResponse);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
          );
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: "Failed to send message" })}\n\n`)
          );
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
