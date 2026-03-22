import { streamText, type LanguageModelV1 } from "ai";
import { openai } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { chatStorage } from "@/lib/storage";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Select the best available model provider
function getModel(): LanguageModelV1 {
  const openRouterKey = process.env.BUILT_IN_FORGE_API_KEY;
  const openRouterUrl = process.env.BUILT_IN_FORGE_API_URL;
  const openaiKey = process.env.OPENAI_API_KEY;
  const modelName = process.env.AI_MODEL_NAME || "openai/gpt-4o-mini";

  if (openRouterKey && openRouterUrl) {
    const openrouter = createOpenRouter({
      apiKey: openRouterKey,
      baseURL: openRouterUrl.replace('/chat/completions', ''),
    });
    return openrouter(modelName);
  }

  if (openaiKey) {
    return openai(modelName);
  }

  throw new Error("Missing AI API key (BUILT_IN_FORGE_API_KEY or OPENAI_API_KEY)");
}

function buildSystemPrompt(): string {
  return `Ти — офіційний чат-помічник бібліотеки Харківської державної академії культури (ХДАК). 
Твоя мета: допомагати користувачам знаходити книги, записуватися до бібліотеки та користуватися її ресурсами.

=== ПРАВИЛА ВІДПОВІДЕЙ ===
1. Відповідай коротко, точно, по-українськи.
2. Використовуй тільки перевірену інформацію з бази знань нижче.
3. Якщо користувач запитує те, чого немає в базі — направляй на офіційний сайт (https://lib-hdak.in.ua/) або контакти директора (кімн. 16).
4. Обов'язково додавай посилання, якщо вони є в тексті.

=== БАЗА ЗНАНЬ ===
(библиотечные данные: каталог, запись, график, контакты, правила)
... [остальная база знаний] ...`;
}

// Map the internal triggers to response data
const AUTOMATED_REPLIES: Record<string, { content: string; chips: string[] }> = {
  "каталог": {
    content: "Електронний каталог ХДАК: [Пошук](https://library-service.com.ua:8443/khkhdak/DocumentSearchForm).",
    chips: ["Як шукати?", "АБІС", "Репозитарій"]
  },
  // ... other replies ...
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

    // 1. Save user message
    await chatStorage.createMessage(conversationId, "user", content);

    // 2. Fetch history
    const history = await chatStorage.getMessagesByConversation(conversationId);
    
    // 3. Simple automated reply check (optional, but keep it for speed)
    const lower = content.toLowerCase();
    const trigger = Object.keys(AUTOMATED_REPLIES).find(t => lower.includes(t));
    if (trigger) {
      const reply = AUTOMATED_REPLIES[trigger];
      const responseText = `${reply.content}\n\n[CHIPS: ${reply.chips.join(', ')}]`;
      await chatStorage.createMessage(conversationId, "assistant", responseText);
      return new Response(responseText + "[DONE]", { headers: { "Content-Type": "text/plain" } });
    }

    // 4. Stream response using AI SDK
    const result = streamText({
      model: getModel(),
      system: buildSystemPrompt(),
      messages: history.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    return result.toDataStreamResponse({
      async onFlush({ text }) {
        if (text) {
          // Final save after stream is complete
          await chatStorage.createMessage(conversationId, "assistant", text);
        }
      }
    });

  } catch (error) {
    console.error("Critical API Error:", error);
    return Response.json({ error: "Service unavailable" }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const messages = await chatStorage.getMessagesByConversation(parseInt(id));
  return Response.json(messages);
}
}
