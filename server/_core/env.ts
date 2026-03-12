import { z } from "zod";

// env.ts is loaded very early — before the logger module can be safely imported
// (logger itself imports ENV). We use console.info here intentionally to avoid
// a circular-dependency issue; all other startup messages use logger.
const _consoleInfo = console.info;

const envSchema = z.object({
  VITE_APP_ID: z.string().default(""),
  JWT_SECRET: z.string().default(""),
  DATABASE_URL: z.string().default(""),
  OAUTH_SERVER_URL: z.string().default(""),
  OWNER_OPEN_ID: z.string().default(""),
  NODE_ENV: z.string().default("development"),
  BUILT_IN_FORGE_API_URL: z.string().default(""),
  BUILT_IN_FORGE_API_KEY: z.string().default(""),
  /** Chat/completion model name. Falls back to gpt-4o-mini when not set. */
  LLM_MODEL: z.string().default("gpt-4o-mini"),
  // ── Optional fallback AI provider ────────────────────────────────────────
  /** Base URL for the fallback OpenAI-compatible provider (e.g. Groq). */
  FALLBACK_API_URL: z.string().default(""),
  /** API key for the fallback provider. */
  FALLBACK_API_KEY: z.string().default(""),
  /** Model name for the fallback provider. */
  FALLBACK_MODEL: z.string().default("llama-3.1-8b-instant"),
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
  LLM_MODEL: process.env.LLM_MODEL,
  FALLBACK_API_URL: process.env.FALLBACK_API_URL,
  FALLBACK_API_KEY: process.env.FALLBACK_API_KEY,
  FALLBACK_MODEL: process.env.FALLBACK_MODEL,
});

// Warn once at startup when no fallback provider is configured.
if (!parsed.FALLBACK_API_KEY) {
  console.info(
    "No fallback AI provider configured — running with primary only"
  );
}

export const ENV = {
  appId: parsed.VITE_APP_ID,
  cookieSecret: parsed.JWT_SECRET,
  databaseUrl: parsed.DATABASE_URL,
  oAuthServerUrl: parsed.OAUTH_SERVER_URL,
  ownerOpenId: parsed.OWNER_OPEN_ID,
  isProduction: parsed.NODE_ENV === "production",
  forgeApiUrl: parsed.BUILT_IN_FORGE_API_URL,
  forgeApiKey: parsed.BUILT_IN_FORGE_API_KEY,
  /** LLM model name used for all chat completions. Configurable via LLM_MODEL env var. */
  llmModel: parsed.LLM_MODEL,
  // ── Optional fallback AI provider ────────────────────────────────────────
  fallbackApiUrl: parsed.FALLBACK_API_URL,
  fallbackApiKey: parsed.FALLBACK_API_KEY,
  fallbackModel: parsed.FALLBACK_MODEL,
};
