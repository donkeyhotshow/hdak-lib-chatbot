import type { Express } from "express";
import { z } from "zod/v4";
import { SECURITY_CONFIG } from "../config/security";
import { sdk } from "../_core/sdk";
import { logger } from "../_core/logger";
import { processChatRequest, ChatEndpointError } from "../services/chatService";
import { streamToHttpResponse } from "../services/streamService";
import {
  enforceSecurityRateLimit,
  getRequestIp,
} from "../security/rateLimiter";

export const MAX_CHAT_MESSAGE_LENGTH =
  SECURITY_CONFIG.tokenLimits.maxMessageChars;

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(MAX_CHAT_MESSAGE_LENGTH),
});

export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(100),
  language: z.enum(["en", "uk", "ru"]).optional(),
  conversationId: z.number().int().positive().optional(),
  model: z.string().trim().min(1).optional(),
});

export function registerChatController(app: Express) {
  app.post("/api/chat", async (req, res) => {
    const requestIp = getRequestIp(req);

    try {
      try {
        await enforceSecurityRateLimit({
          endpoint: "/api/chat",
          ip: requestIp,
        });
      } catch {
        res.status(429).json({ error: "Too many requests" });
        return;
      }

      const parseResult = chatRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        const hasTooLarge = parseResult.error.issues.some(
          issue => issue.code === "too_big" && issue.path.includes("content")
        );
        if (hasTooLarge) {
          res.status(413).json({
            error: "Message too large",
            details: `Each message must be at most ${MAX_CHAT_MESSAGE_LENGTH} characters.`,
          });
          return;
        }

        res.status(400).json({
          error: "Invalid request",
          details: parseResult.error.issues,
        });
        return;
      }

      const { messages, language, conversationId, model } = parseResult.data;

      let authUserId: number | null = null;
      try {
        const user = await sdk.authenticateRequest(req);
        authUserId = user.id;
        try {
          await enforceSecurityRateLimit({
            endpoint: "/api/chat",
            ip: requestIp,
            userId: user.id,
          });
        } catch {
          res.status(429).json({ error: "Too many requests" });
          return;
        }
      } catch {
        authUserId = null;
      }

      const serviceResult = await processChatRequest({
        messages,
        language,
        conversationId,
        model,
        userId: authUserId,
        ip: requestIp,
      });

      if (serviceResult.flagged) {
        res
          .status(400)
          .json({ message: serviceResult.fallbackResponse, flagged: true });
        return;
      }

      streamToHttpResponse(serviceResult.stream, res);
    } catch (error) {
      if (error instanceof ChatEndpointError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      logger.error("[/api/chat] Controller error", {
        error: error instanceof Error ? error.message : String(error),
      });
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });
}
