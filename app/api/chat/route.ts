// REQUIRED env vars: BUILT_IN_FORGE_API_KEY (or FORGE_API_KEY / OPENAI_API_KEY)
// Set these in Vercel Dashboard → Settings → Environment Variables
// Local: copy .env.example → .env.local

import {
  chatRequestSchema,
  MAX_CHAT_MESSAGE_LENGTH,
} from "@/lib/server/controllers/chatController";
import { getMissingCriticalEnvVars } from "@/lib/server/_core/env";
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
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const missingEnv = getMissingCriticalEnvVars({ forProductionBoot: false });
    if (missingEnv.length > 0) {
      logger.error("[api/chat] Required environment variable(s) missing", {
        missing: missingEnv,
      });
      return Response.json(
        {
          error: "API key not configured",
          details: `Missing environment variable(s): ${missingEnv.join(", ")}`,
        },
        { status: 500 }
      );
    }

    const requestIp = getRequestIp({
      ip: "unknown",
      headers: Object.fromEntries(req.headers.entries()),
    });

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

    const { messages, language, conversationId, model } = parseResult.data;
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
      model,
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
  } catch (err) {
    if (err instanceof ChatEndpointError) {
      return Response.json({ error: err.message }, { status: err.statusCode });
    }

    logger.error("[api/chat] Unhandled error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return Response.json(
      {
        error: "internal_error",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
