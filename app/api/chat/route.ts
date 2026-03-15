import {
  chatRequestSchema,
  MAX_CHAT_MESSAGE_LENGTH,
} from "@/lib/server/controllers/chatController";
import { logger } from "@/lib/server/_core/logger";
import { authenticateUserFromRequest } from "@/lib/server/_core/nextContext";
import {
  ChatEndpointError,
  processChatRequest,
} from "@/lib/server/services/chatService";
import {
  enforceSecurityRateLimit,
  getRequestIp,
} from "@/lib/server/security/rateLimiter";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const requestIp = getRequestIp({
    ip: "unknown",
    headers: Object.fromEntries(req.headers.entries()),
  });

  try {
    try {
      await enforceSecurityRateLimit({ endpoint: "/api/chat", ip: requestIp });
    } catch {
      return Response.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const parseResult = chatRequestSchema.safeParse(body);

    if (!parseResult.success) {
      const hasTooLarge = parseResult.error.issues.some(
        issue => issue.code === "too_big" && issue.path.includes("content")
      );

      if (hasTooLarge) {
        return Response.json(
          {
            error: "Message too large",
            details: `Each message must be at most ${MAX_CHAT_MESSAGE_LENGTH} characters.`,
          },
          { status: 413 }
        );
      }

      return Response.json(
        {
          error: "Invalid request",
          details: parseResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { messages, language, conversationId } = parseResult.data;
    const authUser = await authenticateUserFromRequest(req);

    if (authUser) {
      try {
        await enforceSecurityRateLimit({
          endpoint: "/api/chat",
          ip: requestIp,
          userId: authUser.id,
        });
      } catch {
        return Response.json({ error: "Too many requests" }, { status: 429 });
      }
    }

    const serviceResult = await processChatRequest({
      messages,
      language,
      conversationId,
      userId: authUser?.id ?? null,
      ip: requestIp,
    });

    if (serviceResult.flagged) {
      return Response.json(
        { message: serviceResult.fallbackResponse, flagged: true },
        { status: 400 }
      );
    }

    return serviceResult.stream.toUIMessageStreamResponse();
  } catch (error) {
    if (error instanceof ChatEndpointError) {
      return Response.json({ error: error.message }, { status: error.statusCode });
    }

    logger.error("[/api/chat] Controller error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
