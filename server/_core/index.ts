import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import helmet from "helmet";
import compression from "compression";
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
import { getMetrics, startMemoryMonitoring } from "./metrics";

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
  // BUILT_IN_FORGE_API_KEY and DATABASE_URL are required in every environment;
  // the remaining secrets are only checked in production.
  const alwaysRequired: Array<[string, string]> = [
    ["BUILT_IN_FORGE_API_KEY", ENV.forgeApiKey],
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

  // Trust the first hop from a reverse proxy (nginx, load balancer) so that
  // express-rate-limit and req.ip resolve to the real client IP via the
  // X-Forwarded-For header rather than the proxy's IP.
  app.set("trust proxy", 1);

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
   *
   * Registered BEFORE the global 1 MB body-parser so that its own 50 MB
   * per-route parser runs first.  Once the handler sends a response the global
   * parser is never reached for this route.
   */
  app.post(
    "/api/admin/process-pdf",
    adminRateLimiter,
    express.json({ limit: "50mb" }),
    async (req, res) => {
    // Authenticate + authorise (admin only)
    let user;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (user.role !== "admin") {
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
    if (title.length > 500) {
      res.status(400).json({ error: "title must be at most 500 characters" });
      return;
    }
    if (typeof content !== "string" || !content.trim()) {
      res.status(400).json({ error: "content must be a non-empty string" });
      return;
    }
    if (typeof url === "string" && url.length > 2048) {
      res.status(400).json({ error: "url must be at most 2048 characters" });
      return;
    }
    if (typeof author === "string" && author.length > 500) {
      res.status(400).json({ error: "author must be at most 500 characters" });
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

  // Body parser — 1 MB global limit to protect public endpoints against abuse.
  // /api/admin/process-pdf is registered above with its own 50 MB body parser;
  // since it sends a response without calling next(), this global middleware is
  // never reached for that route.
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true }));
  // Enable gzip/deflate compression for all responses
  app.use(compression());
  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });
  // Readiness probe — succeeds only when critical env vars are present
  app.get("/api/ready", (_req, res) => {
    const missing: string[] = [];
    if (!ENV.forgeApiKey) missing.push("BUILT_IN_FORGE_API_KEY");
    if (!ENV.databaseUrl) missing.push("DATABASE_URL");
    if (missing.length > 0) {
      res.status(503).json({ ready: false, missing });
      return;
    }
    res.json({ ready: true });
  });
  // Metrics endpoint (admin-only) — exposes latency, memory and streaming stats
  app.get("/api/metrics", adminRateLimiter, async (req, res) => {
    let user;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (user.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    res.json(getMetrics());
  });
  // OAuth callback under /api/oauth/callback
  app.use("/api/oauth", oauthRateLimiter);
  registerOAuthRoutes(app);
  // Chat API with streaming and tool calling
  app.use("/api/chat", chatRateLimiter);
  registerChatRoutes(app);
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
    // Start periodic memory monitoring for the /api/metrics endpoint
    startMemoryMonitoring();
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
