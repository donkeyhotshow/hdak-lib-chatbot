import { z } from "zod";

const optionalString = z
  .string()
  .optional()
  .transform(value => value?.trim() ?? "");

const envSchema = z.object({
  VITE_APP_ID: optionalString,
  VITE_OAUTH_PORTAL_URL: optionalString,
  VITE_FRONTEND_FORGE_API_URL: optionalString,
  VITE_FRONTEND_FORGE_API_KEY: optionalString,
  JWT_SECRET: optionalString,
  DATABASE_URL: optionalString,
  REDIS_URL: optionalString,
  OAUTH_SERVER_URL: optionalString,
  OWNER_OPEN_ID: optionalString,
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  AI_MODEL_NAME: z.string().min(1).default("gemini-2.0-flash"),
  BUILT_IN_FORGE_API_URL: optionalString,
  BUILT_IN_FORGE_API_KEY: optionalString,
  FORGE_API_URL: optionalString,
  FORGE_API_KEY: optionalString,
  OPENAI_API_KEY: optionalString,
  CHAT_PROVIDER_API_KEY: optionalString,
});

const parsed = envSchema.parse({
  VITE_APP_ID: process.env.VITE_APP_ID,
  JWT_SECRET: process.env.JWT_SECRET,
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  OAUTH_SERVER_URL: process.env.OAUTH_SERVER_URL,
  OWNER_OPEN_ID: process.env.OWNER_OPEN_ID,
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  AI_MODEL_NAME: process.env.AI_MODEL_NAME,
  BUILT_IN_FORGE_API_URL: process.env.BUILT_IN_FORGE_API_URL,
  BUILT_IN_FORGE_API_KEY: process.env.BUILT_IN_FORGE_API_KEY,
  FORGE_API_URL: process.env.FORGE_API_URL,
  FORGE_API_KEY: process.env.FORGE_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  CHAT_PROVIDER_API_KEY: process.env.CHAT_PROVIDER_API_KEY,
  VITE_OAUTH_PORTAL_URL: process.env.VITE_OAUTH_PORTAL_URL,
  VITE_FRONTEND_FORGE_API_URL: process.env.VITE_FRONTEND_FORGE_API_URL,
  VITE_FRONTEND_FORGE_API_KEY: process.env.VITE_FRONTEND_FORGE_API_KEY,
});

export const ENV = {
  appId: parsed.VITE_APP_ID,
  oauthPortalUrl: parsed.VITE_OAUTH_PORTAL_URL,
  frontendForgeApiUrl: parsed.VITE_FRONTEND_FORGE_API_URL,
  frontendForgeApiKey: parsed.VITE_FRONTEND_FORGE_API_KEY,
  cookieSecret: parsed.JWT_SECRET,
  databaseUrl: parsed.DATABASE_URL,
  redisUrl: parsed.REDIS_URL,
  oAuthServerUrl: parsed.OAUTH_SERVER_URL,
  ownerOpenId: parsed.OWNER_OPEN_ID,
  nodeEnv: parsed.NODE_ENV,
  isProduction: parsed.NODE_ENV === "production",
  aiModelName: parsed.AI_MODEL_NAME,
  forgeApiUrl: parsed.BUILT_IN_FORGE_API_URL || parsed.FORGE_API_URL,
  forgeApiKey:
    parsed.BUILT_IN_FORGE_API_KEY ||
    parsed.FORGE_API_KEY ||
    parsed.OPENAI_API_KEY,
  chatProviderApiKey: parsed.CHAT_PROVIDER_API_KEY,
  port: parsed.PORT,
};

export function getMissingCriticalEnvVars(options?: {
  forProductionBoot?: boolean;
}): string[] {
  const missing: string[] = [];
  if (!ENV.forgeApiUrl) {
    missing.push("BUILT_IN_FORGE_API_URL (or FORGE_API_URL)");
  }
  if (!ENV.forgeApiKey) {
    missing.push("BUILT_IN_FORGE_API_KEY (or FORGE_API_KEY / OPENAI_API_KEY)");
  }
  if (options?.forProductionBoot ?? ENV.isProduction) {
    if (!ENV.cookieSecret) missing.push("JWT_SECRET");
    if (!ENV.ownerOpenId) missing.push("OWNER_OPEN_ID");
  }
  return missing;
}
