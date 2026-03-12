import { z } from "zod";

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
  forgeApiUrl: parsed.BUILT_IN_FORGE_API_URL,
  forgeApiKey: parsed.BUILT_IN_FORGE_API_KEY,
};
