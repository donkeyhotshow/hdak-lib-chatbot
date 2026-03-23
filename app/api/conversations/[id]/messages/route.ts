import { streamText, type LanguageModel } from "ai";
import { openai } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { chatStorage } from "@/lib/storage";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Select the best available model provider
function getModel(): LanguageModel {
  const openRouterKey = process.env.BUILT_IN_FORGE_API_KEY;
  const openRouterUrl = process.env.BUILT_IN_FORGE_API_URL;
  const openaiKey = process.env.OPENAI_API_KEY;
  const modelName = process.env.AI_MODEL_NAME || "openai/gpt-4o-mini";

  if (openRouterKey && openRouterUrl) {
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

  if (openaiKey) {
    return openai(modelName);
  }

  throw new Error("Missing AI API key (BUILT_IN_FORGE_API_KEY or OPENAI_API_KEY)");
}

async function buildSystemPrompt(): Promise<string> {
  const info = await chatStorage.getLibraryInfo();
  const resources = await chatStorage.getLibraryResources();

  let infoString = "=== БАЗА ЗНАНЬ (Фактичні дані бібліотеки ХДАК) ===\n\n";
  
  if (info && info.length > 0) {
    infoString += "ЗАГАЛЬНА ІНФОРМАЦІЯ:\n" + info.map(i => `- ${i.key}: ${i.value_uk}`).join("\n") + "\n\n";
  }

  if (resources && resources.length > 0) {
    infoString += "РЕСУРСИ:\n" + resources.map(r => `- ${r.name} (${r.type}): ${r.url}\n  Опис: ${r.description_uk}`).join("\n") + "\n\n";
  }

  return `Ти — офіційний чат-помічник бібліотеки Харківської державної академії культури (ХДАК). 
Твоя мета: допомагати користувачам знаходити книги, записуватися до бібліотеки та користуватися її ресурсами.

=== ПРАВИЛА ВІДПОВІДЕЙ ===
1. Відповідай коротко, точно, по-українськи.
2. Використовуй тільки перевірену інформацію.
3. Якщо користувач запитує те, чого немає в базі — направляй на офіційний сайт (https://lib-hdak.in.ua/) або на контактну пошту/телефон з розділу контактів.
4. Обов'язково додавай посилання, якщо вони є в тексті.

${infoString}
=== КІНЕЦЬ БАЗИ ЗНАНЬ ===
Запис до бібліотеки:
Проводиться за списками груп або особисто (через читацький чи студентський квиток або заставу).`;
}

// Map some internal triggers to instant response data
const AUTOMATED_REPLIES: Record<string, { content: string; chips: string[] }> = {
  "каталог": {
    content: "Електронний каталог бібліотеки ХДАК доступний за посиланням: [Пошук в каталозі](https://library-service.com.ua:8443/khkhdak/DocumentSearchForm).",
    chips: ["Як шукати?", "Репозитарій", "Контакти"]
  },
  "графік": {
    content: "Бібліотека працює з 9:00 до 17:00 (Пн-Пт). Детальніше про графік абонементів та читальних залів можна дізнатися в розділі контактів.",
    chips: ["Записатися", "Де знаходиться?", "Правила"]
  }
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversationId = parseInt(id);
    const { content } = await request.json();

    if (!content) return Response.json({ error: "Empty message" }, { status: 400 });

    // Ensure DB context is seeded (runs in background)
    chatStorage.seedLibraryData().catch(console.error);

    // 1. Save user message
    await chatStorage.createMessage(conversationId, "user", content);

    // 2. Simple automated reply check for instant feedback
    const lower = content.toLowerCase();
    const trigger = Object.keys(AUTOMATED_REPLIES).find(t => lower.includes(t));
    if (trigger) {
      const reply = AUTOMATED_REPLIES[trigger];
      const responseText = `${reply.content}\n\n[CHIPS: ${reply.chips.join(', ')}]`;
      await chatStorage.createMessage(conversationId, "assistant", responseText);
      // We return text directly for speed in this branch
      return new Response(responseText, { headers: { "Content-Type": "text/plain" } });
    }

    // 3. Fetch history
    const history = await chatStorage.getMessagesByConversation(conversationId);
    
    // 4. Stream response using AI SDK
    const systemPrompt = await buildSystemPrompt();

    const result = streamText({
      model: getModel(),
      system: systemPrompt,
      messages: history.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    return result.toTextStreamResponse({
      async onFinish({ text }) {
        if (text) {
          // Final save after stream is complete
          await chatStorage.createMessage(conversationId, "assistant", text);
        }
      }
    });

  } catch (error) {
    console.error("Critical API Error:", error);
    return Response.json({ 
      error: "Service unavailable",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const messages = await chatStorage.getMessagesByConversation(parseInt(id));
    return Response.json(messages);
  } catch (error) {
    return Response.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}
