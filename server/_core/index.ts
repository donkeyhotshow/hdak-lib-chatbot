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
import { chatRateLimiter, trpcRateLimiter, oauthRateLimiter } from "./rateLimiter";
import { ENV } from "./env";

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
  // Validate critical environment variables before starting
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

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
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
    logger.info(`Server running on http://localhost:${port}/`);
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

startServer().catch(console.error);
