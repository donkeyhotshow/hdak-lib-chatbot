import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import { chatStorage } from "./storage";
import { searchCatalog } from "../../catalog";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

function buildLibraryContext(
  libInfo: Awaited<ReturnType<typeof chatStorage.getLibraryInfo>>,
  libResources: Awaited<ReturnType<typeof chatStorage.getLibraryResources>>
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
   - Не придумуй адреси, телефони, години роботи — беризначення лише з БД.

2. ПОШУК КНИГ / ДОКУМЕНТІВ
   - Для пошуку будь-якого документа ЗАВЖДИ використовуй інструмент search_catalog.
   - Ніколи не кажи, що не знаєш, чи є книга в бібліотеці, без виклику search_catalog.
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

const CATALOG_TOOL: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "search_catalog",
    description: `Search HDAK library catalog. Call when user asks about books, authors, reading lists, or whether a specific book exists. Never say you don't know if the library has something without calling this tool first.`,
    parameters: {
      type: "object",
      properties: {
        author: { type: "string", description: "Author name to search" },
        title:  { type: "string", description: "Book title to search" },
        topic:  { type: "string", description: "Topic or subject to search" },
        limit:  { type: "number", description: "Max results (default 8, max 20)" },
      },
      required: [],
    },
  },
};

interface CatalogBook {
  title: string; author: string; year: string; type: string; url: string;
}

interface CatalogResult {
  ok: boolean; total: number; results: CatalogBook[]; search_url: string;
  empty?: boolean; error?: string; fallback?: { label: string; url: string }[];
}

async function executeCatalogSearch(args: { author?: string; title?: string; topic?: string; limit?: number }): Promise<CatalogResult> {
  const { author, title, topic, limit = 8 } = args;
  const query = title || topic || author || "";
  const BASE = "https://library-service.com.ua:8443/khkhdak";
  const qs = new URLSearchParams();
  if (author) { qs.set("ZT", "a"); qs.set("SS", author); }
  else if (query) { qs.set("ZT", "q"); qs.set("SS", query); }
  const searchUrl = `${BASE}/DocumentSearchForm?${qs.toString()}`;

  try {
    const data = await searchCatalog(query || "", author);
    const books = data.results.slice(0, Math.min(limit, 20)).map(r => ({
      title:  r.title,
      author: r.author ?? "",
      year:   r.year ?? "",
      type:   r.type ?? "",
      url:    r.link ? (r.link.startsWith("http") ? r.link : `${BASE}${r.link}`) : searchUrl,
    }));
    return { ok: true, total: books.length, results: books, search_url: searchUrl, empty: books.length === 0 };
  } catch {
    return {
      ok: false, total: 0, results: [], search_url: searchUrl, error: "unavailable",
      fallback: [
        { label: "Відкрити каталог", url: searchUrl },
        { label: "Viber бібліотеки", url: "viber://chat/?number=%2B380661458484" },
        { label: "Telegram",         url: "https://t.me/+380661458484" },
      ],
    };
  }
}

export function registerChatRoutes(app: Express): void {
  app.get("/api/conversations", async (req: Request, res: Response) => {
    try {
      const conversations = await chatStorage.getAllConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      const conversation = await chatStorage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const messages = await chatStorage.getMessagesByConversation(id);
      res.json({ ...conversation, messages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.post("/api/conversations", async (req: Request, res: Response) => {
    try {
      const { title } = req.body;
      const conversation = await chatStorage.createConversation(title || "Нова розмова");
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.delete("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      await chatStorage.deleteConversation(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  app.post("/api/conversations/:id/messages", async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id as string);
      const { content } = req.body;

      await chatStorage.createMessage(conversationId, "user", content);

      const [libInfo, libResources, historyMessages] = await Promise.all([
        chatStorage.getLibraryInfo(),
        chatStorage.getLibraryResources(),
        chatStorage.getMessagesByConversation(conversationId),
      ]);

      const libraryContext = buildLibraryContext(libInfo, libResources);
      const systemPrompt = buildSystemPrompt(libraryContext);

      type ChatMsg = OpenAI.Chat.Completions.ChatCompletionMessageParam;
      const chatMessages: ChatMsg[] = [
        { role: "system", content: systemPrompt },
        ...historyMessages.map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      let fullResponse = "";
      let catalogResult: CatalogResult | null = null;

      // ── First stream: may include tool_calls ──────────────────────────────
      const stream1 = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: chatMessages,
        stream: true,
        max_completion_tokens: 8192,
        tools: [CATALOG_TOOL],
        tool_choice: "auto",
      });

      let finishReason = "";
      const toolCallAcc: { id: string; name: string; args: string }[] = [];

      for await (const chunk of stream1) {
        const choice = chunk.choices[0];
        if (!choice) continue;
        if (choice.finish_reason) finishReason = choice.finish_reason;

        const delta = choice.delta as any;

        if (delta?.content) {
          fullResponse += delta.content;
          res.write(`data: ${JSON.stringify({ content: delta.content })}\n\n`);
        }

        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx: number = tc.index ?? 0;
            if (!toolCallAcc[idx]) toolCallAcc[idx] = { id: "", name: "", args: "" };
            if (tc.id) toolCallAcc[idx].id = tc.id;
            if (tc.function?.name) toolCallAcc[idx].name += tc.function.name;
            if (tc.function?.arguments) toolCallAcc[idx].args += tc.function.arguments;
          }
        }
      }

      // ── Handle tool call ──────────────────────────────────────────────────
      if (finishReason === "tool_calls" && toolCallAcc.length > 0) {
        const toolMessages: ChatMsg[] = [];

        for (const tc of toolCallAcc) {
          if (tc.name === "search_catalog") {
            let args: Record<string, unknown> = {};
            try { args = JSON.parse(tc.args || "{}"); } catch { /**/ }

            const result = await executeCatalogSearch(args as any);
            catalogResult = result;

            toolMessages.push({
              role: "tool",
              tool_call_id: tc.id,
              content: JSON.stringify(result),
            });
          }
        }

        if (catalogResult) {
          res.write(`data: ${JSON.stringify({ catalogResult })}\n\n`);
        }

        chatMessages.push({
          role: "assistant",
          content: null,
          tool_calls: toolCallAcc.map(tc => ({
            id: tc.id,
            type: "function" as const,
            function: { name: tc.name, arguments: tc.args },
          })),
        } as any);

        chatMessages.push(...toolMessages);

        // ── Second stream: final response after tool ───────────────────────
        const stream2 = await openai.chat.completions.create({
          model: "gpt-5.1",
          messages: chatMessages,
          stream: true,
          max_completion_tokens: 8192,
        });

        for await (const chunk of stream2) {
          const delta = chunk.choices[0]?.delta?.content || "";
          if (delta) {
            fullResponse += delta;
            res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
          }
        }
      }

      // Persist assistant message (with embedded catalog result if any)
      const persistContent = catalogResult
        ? `${fullResponse}\n\n<!--CATALOG:${JSON.stringify(catalogResult)}-->`
        : fullResponse;

      await chatStorage.createMessage(conversationId, "assistant", persistContent);

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error sending message:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to send message" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  });
}
