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

  /* ── Catalog live search ── */
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

  /* ── Health ── */
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/chat/health", (_req, res) => res.json({ status: "ok", service: "chat" }));

  return httpServer;
}
