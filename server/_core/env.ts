import { z } from "zod";
import { logger } from "./logger";

const PORT = parseInt(process.env.PORT || "7860", 10);

const envSchema = z.object({
  VITE_APP_ID: z.string().default(""),
  JWT_SECRET: z.string().default(""),
  DATABASE_URL: z.string().default(""),
  OAUTH_SERVER_URL: z.string().default(""),
  OWNER_OPEN_ID: z.string().default(""),
  NODE_ENV: z.string().default("development"),
  BUILT_IN_FORGE_API_URL: z.string().default(""),
  BUILT_IN_FORGE_API_KEY: z.string().default(""),
});

const parsed = envSchema.parse({
  VITE_APP_ID: process.env.VITE_APP_ID,
  JWT_SECRET: process.env.JWT_SECRET,
  DATABASE_URL: process.env.DATABASE_URL,
  OAUTH_SERVER_URL: process.env.OAUTH_SERVER_URL,
  OWNER_OPEN_ID: process.env.OWNER_OPEN_ID,
  NODE_ENV: process.env.NODE_ENV,
  BUILT_IN_FORGE_API_URL: process.env.BUILT_IN_FORGE_API_URL,
  BUILT_IN_FORGE_API_KEY: process.env.BUILT_IN_FORGE_API_KEY,
});

export const ENV = {
  appId: parsed.VITE_APP_ID,
  cookieSecret: parsed.JWT_SECRET,
  databaseUrl: parsed.DATABASE_URL,
  oAuthServerUrl: parsed.OAUTH_SERVER_URL,
  ownerOpenId: parsed.OWNER_OPEN_ID,
  isProduction: parsed.NODE_ENV === "production",
  /** True when DATABASE_URL is absent — the app runs with in-memory mock data. */
  isMockMode: !parsed.DATABASE_URL,
  forgeApiUrl: parsed.BUILT_IN_FORGE_API_URL,
  forgeApiKey: parsed.BUILT_IN_FORGE_API_KEY,
  port: PORT,
};

type EnvCheckConfig = {
  databaseUrl: string;
  oAuthServerUrl: string;
  isProduction: boolean;
};

type ValidationDeps = {
  info: (msg: string) => void;
  error: (msg: string) => void;
  exit: (code: number) => void;
};

/**
 * Validate that DATABASE_URL and OAUTH_SERVER_URL are present.
 *
 * - In production: log an error and exit the process when either is missing.
 * - In development / mock mode: log an informational message and continue.
 *
 * Injectable `config` and `deps` parameters make the function unit-testable
 * without spawning a real process or touching real environment variables.
 */
export function validateStartupEnv(
  config: EnvCheckConfig = ENV,
  deps: ValidationDeps = {
    info: (msg) => logger.info(msg),
    error: (msg) => logger.error(msg),
    exit: process.exit,
  }
): void {
  if (!config.databaseUrl) {
    if (config.isProduction) {
      deps.error(
        "Missing required environment variable: DATABASE_URL. " +
          "Set it in your .env file or deployment environment and restart the server."
      );
      deps.exit(1);
      return;
    }
    deps.info("[INFO] Running with in-memory mock DB (no DATABASE_URL set)");
  }

  if (!config.oAuthServerUrl) {
    if (config.isProduction) {
      deps.error(
        "Missing required environment variable: OAUTH_SERVER_URL. " +
          "Set it in your .env file or deployment environment and restart the server."
      );
      deps.exit(1);
      return;
    }
    deps.info(
      "[INFO] OAuth disabled, running in public mode (no OAUTH_SERVER_URL set)"
    );
  }
}
