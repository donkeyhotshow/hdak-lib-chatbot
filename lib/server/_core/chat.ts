import type { Express } from "express";
import {
  registerChatController,
  chatRequestSchema,
  MAX_CHAT_MESSAGE_LENGTH,
} from "../controllers/chatController";
import { buildLegacyTools } from "../services/toolExecutor";

export { chatRequestSchema, MAX_CHAT_MESSAGE_LENGTH };

export const tools = buildLegacyTools({ endpoint: "/api/chat" });

export function registerChatRoutes(app: Express) {
  registerChatController(app);
}
