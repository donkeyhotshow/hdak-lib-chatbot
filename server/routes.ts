import type { Express } from "express";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";
import { registerChatRoutes, chatStorage } from "./replit_integrations/chat";
import { storage } from "./storage";

const chatRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Забагато запитів. Спробуйте через хвилину." },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await chatStorage.seedLibraryData();

  app.use("/api/conversations/:id/messages", chatRateLimit);

  registerChatRoutes(app);

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/chat/health", (req, res) => {
    res.json({ status: "ok", service: "chat" });
  });

  return httpServer;
}
