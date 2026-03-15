import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ENV_EXAMPLE_PATH = resolve(process.cwd(), ".env.example");

const EXPECTED_ENV_KEYS = [
  "VITE_APP_ID",
  "JWT_SECRET",
  "OAUTH_SERVER_URL",
  "OWNER_OPEN_ID",
  "VITE_OAUTH_PORTAL_URL",
  "DATABASE_URL",
  "BUILT_IN_FORGE_API_URL",
  "FORGE_API_URL",
  "BUILT_IN_FORGE_API_KEY",
  "FORGE_API_KEY",
  "OPENAI_API_KEY",
  "VITE_FRONTEND_FORGE_API_URL",
  "VITE_FRONTEND_FORGE_API_KEY",
  "AI_MODEL_NAME",
  "PORT",
  "NODE_ENV",
] as const;

describe(".env.example", () => {
  it("defines the exact supported application env variable list", () => {
    const envFile = readFileSync(ENV_EXAMPLE_PATH, "utf8");
    const actualKeys = envFile
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith("#"))
      .map(line => line.match(/^([A-Z][A-Z0-9_]*)=/)?.[1])
      .filter((key): key is string => Boolean(key))
      .sort();

    expect(actualKeys).toEqual([...EXPECTED_ENV_KEYS].sort());
  });
});
