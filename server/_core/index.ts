import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import helmet from "helmet";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerChatRoutes } from "./chat";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { logger } from "./logger";
import { startSyncScheduler } from "../services/syncService";
import { chatRateLimiter, trpcRateLimiter, oauthRateLimiter, adminRateLimiter } from "./rateLimiter";
import { ENV } from "./env";
import { sdk } from "./sdk";
import { processDocument } from "../rag-service";

/** Maximum time (ms) to wait for in-flight requests before forcing shutdown. */
const SHUTDOWN_TIMEOUT_MS = 10_000;

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // Validate critical environment variables before starting.
  // OPENAI_API_KEY and DATABASE_URL are required in every environment;
  // the remaining secrets are only checked in production.
  const alwaysRequired: Array<[string, string]> = [
    ["OPENAI_API_KEY", process.env.OPENAI_API_KEY ?? ""],
    ["DATABASE_URL", ENV.databaseUrl],
  ];
  const alwaysMissing = alwaysRequired.filter(([, v]) => !v).map(([k]) => k);
  if (alwaysMissing.length > 0) {
    logger.error(
      `Missing required environment variable(s): ${alwaysMissing.join(", ")}. ` +
      "Set them in your .env file or deployment environment and restart the server."
    );
    process.exit(1);
  }

  if (ENV.isProduction) {
    const required: Array<[string, string]> = [
      ["JWT_SECRET", ENV.cookieSecret],
      ["BUILT_IN_FORGE_API_URL", ENV.forgeApiUrl],
      ["BUILT_IN_FORGE_API_KEY", ENV.forgeApiKey],
      ["OWNER_OPEN_ID", ENV.ownerOpenId],
    ];
    const missing = required.filter(([, v]) => !v).map(([k]) => k);
    if (missing.length > 0) {
      logger.error(`Missing required environment variables: ${missing.join(", ")}`);
      process.exit(1);
    }
  }

  const app = express();
  const server = createServer(app);

  // In production, enforce strict CSP without unsafe-inline.
  // In development, Vite HMR injects inline scripts and styles so unsafe-inline is kept.
  const isDev = process.env.NODE_ENV !== "production";
  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: isDev ? ["'self'", "'unsafe-inline'"] : ["'self'"],
          styleSrc: isDev ? ["'self'", "'unsafe-inline'"] : ["'self'"],
          imgSrc: ["'self'", "data:", "blob:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
    })
  );

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });
  // OAuth callback under /api/oauth/callback
  app.use("/api/oauth", oauthRateLimiter);
  registerOAuthRoutes(app);
  // Chat API with streaming and tool calling
  app.use("/api/chat", chatRateLimiter);
  registerChatRoutes(app);

  /**
   * POST /api/admin/process-pdf
   * Admin-only endpoint: accepts a text body (extracted PDF content) and
   * processes it into the RAG vector store.
   *
   * Body JSON:
   *   { title, content, language?, sourceType?, url?, author? }
   *
   * Returns:
   *   { success, chunksCreated, documentId }  (200)
   *   { error }  (400 / 401 / 403 / 500)
   */
  app.post("/api/admin/process-pdf", adminRateLimiter, async (req, res) => {
    // Authenticate + authorise (admin only)
    let user;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (user.openId !== ENV.ownerOpenId) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const {
      title,
      content,
      language = "uk",
      sourceType = "other",
      url,
      author,
    } = req.body as {
      title?: unknown;
      content?: unknown;
      language?: unknown;
      sourceType?: unknown;
      url?: unknown;
      author?: unknown;
    };

    if (typeof title !== "string" || !title.trim()) {
      res.status(400).json({ error: "title must be a non-empty string" });
      return;
    }
    if (typeof content !== "string" || !content.trim()) {
      res.status(400).json({ error: "content must be a non-empty string" });
      return;
    }
    const validLangs = ["en", "uk", "ru"] as const;
    const validSources = ["catalog", "repository", "database", "other"] as const;
    const lang = validLangs.includes(language as (typeof validLangs)[number])
      ? (language as (typeof validLangs)[number])
      : "uk";
    const src = validSources.includes(sourceType as (typeof validSources)[number])
      ? (sourceType as (typeof validSources)[number])
      : "other";

    const documentId = `manual_${Date.now()}_${title.slice(0, 40).replace(/\s+/g, "_")}`;

    logger.info("[/api/admin/process-pdf] Processing document", {
      documentId,
      title,
      lang,
      src,
      contentLength: content.length,
    });

    try {
      const result = await processDocument(
        documentId,
        title,
        content,
        src,
        lang,
        typeof url === "string" ? url : undefined,
        typeof author === "string" ? author : undefined
      );

      if (result.success) {
        logger.info("[/api/admin/process-pdf] Document processed successfully", {
          documentId,
          chunksCreated: result.chunksCreated,
        });
        res.json({ success: true, chunksCreated: result.chunksCreated, documentId });
      } else {
        res.status(422).json({ success: false, error: result.error ?? "Processing failed" });
      }
    } catch (err) {
      logger.error("[/api/admin/process-pdf] Unexpected error", {
        error: err instanceof Error ? err.message : String(err),
      });
      res.status(500).json({ error: "Internal server error" });
    }
  });
  // tRPC API
  app.use(
    "/api/trpc",
    trpcRateLimiter,
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    logger.warn(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    logger.milestone(`Server started on http://localhost:${port}/`, { env: process.env.NODE_ENV ?? "development" });
    // Start periodic catalog sync (only outside test environments)
    if (process.env.NODE_ENV !== "test") {
      startSyncScheduler();
    }
  });

  // Graceful shutdown: finish in-flight requests before exiting
  const shutdown = () => {
    logger.info("SIGTERM received, shutting down gracefully...");
    server.close(() => {
      logger.info("Server closed.");
      process.exit(0);
    });
    // Force exit if shutdown takes too long
    setTimeout(() => {
      logger.error("Forced shutdown after timeout.");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS).unref();
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

startServer().catch(err => {
  logger.error("Fatal server startup error", { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
