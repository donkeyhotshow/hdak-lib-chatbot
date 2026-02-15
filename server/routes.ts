import type { Express } from "express";
import { createServer, type Server } from "http";
import { registerChatRoutes, chatStorage } from "./replit_integrations/chat";
import { storage } from "./storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Seed initial library data
  await chatStorage.seedLibraryData();

  // Register the chat integration routes
  registerChatRoutes(app);

  // Add a simple health check or welcome route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  return httpServer;
}
