import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import * as cheerio from "cheerio";
import { chatStorage } from "./storage";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

function buildLibraryContext(
  libInfo: Awaited<ReturnType<typeof chatStorage.getLibraryInfo>>,
  libResources: Awaited<ReturnType<typeof chatStorage.getLibraryResources>>
): string {
  // Group info by category for a clean, structured context block
  const grouped: Record<string, string[]> = {};
  for (const item of libInfo) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(`${item.key}: ${item.value_uk}`);
  }

  const infoBlock = Object.entries(grouped)
    .map(([cat, entries]) => `[${cat.toUpperCase()}]\n${entries.join("\n")}`)
    .join("\n\n");

  // Only include official resources; flag those requiring auth
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
   - Для пошуку будь-якого документа завжди надавай посилання на Електронний каталог.
   - Для наукових праць, дисертацій, монографій — посилання на Інституційний репозитарій.
   - НІКОЛИ не вигадуй інвентарні номери, шифри зберігання або шифри УДК/ББК.

3. ПОСИЛАННЯ
   - Використовуй ЛИШЕ URL з поля url у блоці ресурсів вище.
   - Якщо потрібного ресурсу немає в БД — не вигадуй URL. Замість цього направ до офіційного сайту або порадь звернутися до бібліотекаря.

4. ПОСЛУГИ ТА ПРАВИЛА
   - Не обіцяй послуги, яких немає в полі services бази даних (наприклад, не обіцяй цілодобовий доступ або автоматичне продовження).
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

export function registerChatRoutes(app: Express): void {
  // Get all conversations
  app.get("/api/conversations", async (req: Request, res: Response) => {
    try {
      const conversations = await chatStorage.getAllConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Get single conversation with messages
  app.get("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
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

  // Create new conversation
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

  // Delete conversation
  app.delete("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await chatStorage.deleteConversation(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  // Send message and get AI response (streaming SSE)
  app.post("/api/conversations/:id/messages", async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { content } = req.body;

      // Save user message first
      await chatStorage.createMessage(conversationId, "user", content);

      // Fetch library context from DB (runs in parallel)
      const [libInfo, libResources, historyMessages] = await Promise.all([
        chatStorage.getLibraryInfo(),
        chatStorage.getLibraryResources(),
        chatStorage.getMessagesByConversation(conversationId),
      ]);

      // Build structured context and system prompt
      const libraryContext = buildLibraryContext(libInfo, libResources);
      const systemPrompt = buildSystemPrompt(libraryContext);

      // Build chat message array: system + conversation history (already includes user's latest)
      const chatMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
        { role: "system", content: systemPrompt },
        ...historyMessages.map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      // Set up SSE headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // Stream from OpenAI
      const stream = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: chatMessages,
        stream: true,
        max_completion_tokens: 8192,
      });

      let fullResponse = "";

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || "";
        if (delta) {
          fullResponse += delta;
          res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
        }
      }

      // Save full assistant reply
      await chatStorage.createMessage(conversationId, "assistant", fullResponse);

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

  // ── Catalog search — always returns 200 with fallback ─────────────────────
  app.get("/api/catalog", async (req: Request, res: Response) => {
    const { author, title, topic, limit = "5" } = req.query;
    const query = [author, title, topic].filter(Boolean).join(" ").trim();

    if (!query) {
      return res.json({ ok: true, results: [], query: "" });
    }

    try {
      const encoded = encodeURIComponent(query);
      const url = `http://library-service.com.ua:8443/cgi-bin/zgate?action=search&P_find_data=${encoded}&P_find_mode=1&P_db_list=BOOKS&P_page_size=${limit}`;

      const signal = AbortSignal.timeout(8000);
      const response = await fetch(url, { signal });

      if (!response.ok) {
        return res.json({ ok: false, results: [], query, error: "Каталог тимчасово недоступний" });
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const results: { title: string; author: string; year?: string; url?: string }[] = [];

      $("table.res_table tr").each((_i, el) => {
        const title = $(el).find(".res_title").text().trim();
        const author = $(el).find(".res_author").text().trim();
        const year = $(el).find(".res_year").text().trim() || undefined;
        const href = $(el).find("a").attr("href");
        if (title) {
          results.push({
            title,
            author,
            year,
            url: href ? `http://library-service.com.ua:8443${href}` : undefined,
          });
        }
      });

      return res.json({ ok: true, results, query });
    } catch {
      return res.json({ ok: false, results: [], query, error: "Каталог тимчасово недоступний" });
    }
  });
}
