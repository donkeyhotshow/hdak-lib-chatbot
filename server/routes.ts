import type { Express } from "express";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { registerChatRoutes, chatStorage } from "./replit_integrations/chat";
import { searchCatalog } from "./catalog";

const chatRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Забагато запитів. Спробуйте через хвилину." },
});

const catalogRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Забагато запитів до каталогу. Спробуйте через хвилину." },
});

const catalogQuerySchema = z.object({
  query: z.string().min(2, "Запит має містити щонайменше 2 символи").max(200),
  author: z.string().max(100).optional(),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await chatStorage.seedLibraryData();

  /* ── Rate limits ── */
  app.use("/api/conversations/:id/messages", chatRateLimit);
  app.use("/api/catalog", catalogRateLimit);

  /* ── Chat routes ── */
  registerChatRoutes(app);

  /* ── Catalog live search (legacy POST) ── */
  app.post("/api/catalog/live", async (req, res) => {
    const parsed = catalogQuerySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.errors[0]?.message ?? "Невірний запит",
      });
    }

    const { query, author } = parsed.data;

    try {
      const data = await searchCatalog(query, author);
      return res.json(data);
    } catch (err: any) {
      console.error("[catalog]", err?.message);
      return res.status(502).json({
        error: err?.message ?? "Помилка з'єднання з каталогом",
        fallbackUrl: `https://library-service.com.ua:8443/khkhdak/DocumentSearchForm?ZT=q&SS=${encodeURIComponent(query)}`,
      });
    }
  });

  /* ── Catalog GET search (for AI tool use) ── */
  const catalogGetSchema = z.object({
    author: z.string().max(200).optional(),
    title:  z.string().max(200).optional(),
    topic:  z.string().max(200).optional(),
    limit:  z.coerce.number().int().min(1).max(30).optional(),
  });

  app.get("/api/catalog", async (req, res) => {
    const parsed = catalogGetSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "Невірний запит", results: [], total: 0, search_url: "" });
    }

    const { author, title, topic, limit = 8 } = parsed.data;
    const query = title || topic || author || "";
    const BASE = "https://library-service.com.ua:8443/khkhdak";
    const qs = new URLSearchParams();
    if (author) qs.set("ZT", "a"), qs.set("SS", author);
    else if (query) qs.set("ZT", "q"), qs.set("SS", query);
    const searchUrl = `${BASE}/DocumentSearchForm?${qs.toString()}`;

    try {
      const data = await searchCatalog(query || "", author);
      const books = data.results.slice(0, limit).map(r => ({
        title:  r.title,
        author: r.author ?? "",
        year:   r.year ?? "",
        type:   r.type ?? "",
        url:    r.link ? (r.link.startsWith("http") ? r.link : `${BASE}${r.link}`) : searchUrl,
      }));
      return res.json({
        ok: true,
        total: books.length,
        results: books,
        search_url: searchUrl,
        empty: books.length === 0,
      });
    } catch (err: any) {
      console.error("[catalog GET]", err?.message);
      return res.json({
        ok: false,
        total: 0,
        results: [],
        search_url: searchUrl,
        error: "unavailable",
        fallback: [
          { label: "Відкрити каталог",  url: searchUrl },
          { label: "Viber бібліотеки",  url: "viber://chat/?number=%2B380661458484" },
          { label: "Telegram",          url: "https://t.me/+380661458484" },
        ],
      });
    }
  });

  /* ── Health ── */
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/chat/health", (_req, res) => res.json({ status: "ok", service: "chat" }));

  return httpServer;
}
