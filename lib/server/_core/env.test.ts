import { afterEach, describe, expect, it, vi } from "vitest";

const ENV_KEYS = [
  "NODE_ENV",
  "PORT",
  "BUILT_IN_FORGE_API_URL",
  "FORGE_API_URL",
  "BUILT_IN_FORGE_API_KEY",
  "FORGE_API_KEY",
  "OPENAI_API_KEY",
  "REDIS_URL",
  "CHAT_PROVIDER_API_KEY",
  "OPENROUTER_HTTP_REFERER",
  "OPENROUTER_X_TITLE",
  "OPENROUTER_FALLBACK_MODELS",
  "LOG_LEVEL",
  "SERVICES_ENABLED",
  "SERVICE_DATA_API_ENABLED",
  "SERVICE_IMAGE_ENABLED",
  "SERVICE_MAP_ENABLED",
  "SERVICE_VOICE_ENABLED",
  "GITHUB_STARS_LIMIT",
  "CIRCUIT_BREAKER_FAILURE_THRESHOLD",
  "CIRCUIT_BREAKER_RESET_TIMEOUT_MS",
] as const;

const originalValues = new Map<string, string | undefined>(
  ENV_KEYS.map(key => [key, process.env[key]])
);

async function importEnvModule() {
  vi.resetModules();
  return import("./env");
}

afterEach(() => {
  for (const key of ENV_KEYS) {
    const original = originalValues.get(key);
    if (original === undefined) delete process.env[key];
    else process.env[key] = original;
  }
});

describe("ENV forge aliases", () => {
  it("uses FORGE_API_URL when BUILT_IN_FORGE_API_URL is missing", async () => {
    delete process.env.BUILT_IN_FORGE_API_URL;
    process.env.FORGE_API_URL = "https://api.openai.com";

    const { ENV } = await importEnvModule();

    expect(ENV.forgeApiUrl).toBe("https://api.openai.com");
  });

  it("prefers BUILT_IN_FORGE_API_KEY over aliases", async () => {
    process.env.BUILT_IN_FORGE_API_KEY = "built-in-key";
    process.env.FORGE_API_KEY = "forge-key";
    process.env.OPENAI_API_KEY = "openai-key";

    const { ENV } = await importEnvModule();

    expect(ENV.forgeApiKey).toBe("built-in-key");
  });

  it("falls back to OPENAI_API_KEY when forge keys are missing", async () => {
    delete process.env.BUILT_IN_FORGE_API_KEY;
    delete process.env.FORGE_API_KEY;
    process.env.OPENAI_API_KEY = "openai-key";

    const { ENV } = await importEnvModule();

    expect(ENV.forgeApiKey).toBe("openai-key");
  });

  it("exposes optional REDIS_URL and CHAT_PROVIDER_API_KEY", async () => {
    process.env.REDIS_URL = "redis://example.test:6379";
    process.env.CHAT_PROVIDER_API_KEY = "provider-key";

    const { ENV } = await importEnvModule();

    expect(ENV.redisUrl).toBe("redis://example.test:6379");
    expect(ENV.chatProviderApiKey).toBe("provider-key");
  });

  it("exposes optional OpenRouter metadata headers", async () => {
    process.env.OPENROUTER_HTTP_REFERER = "https://example.test";
    process.env.OPENROUTER_X_TITLE = "HDAK Chat";
    process.env.OPENROUTER_FALLBACK_MODELS =
      "openrouter/auto, openai/gpt-4o-mini:free";

    const { ENV } = await importEnvModule();

    expect(ENV.openRouterHttpReferer).toBe("https://example.test");
    expect(ENV.openRouterXTitle).toBe("HDAK Chat");
    expect(ENV.openRouterFallbackModels).toEqual([
      "openrouter/auto",
      "openai/gpt-4o-mini:free",
    ]);
  });

  it("parses PORT as number with a stable default", async () => {
    delete process.env.PORT;
    const { ENV } = await importEnvModule();
    expect(ENV.port).toBe(3000);
  });

  it("supports log level, service toggles, stars limit and circuit breaker settings", async () => {
    process.env.LOG_LEVEL = "warn";
    process.env.SERVICES_ENABLED = "false";
    process.env.SERVICE_VOICE_ENABLED = "true";
    process.env.GITHUB_STARS_LIMIT = "250";
    process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD = "8";
    process.env.CIRCUIT_BREAKER_RESET_TIMEOUT_MS = "45000";

    const { ENV } = await importEnvModule();

    expect(ENV.logLevel).toBe("warn");
    expect(ENV.servicesEnabled).toBe(false);
    expect(ENV.serviceEnabled.voice).toBe(true);
    expect(ENV.githubStarsLimit).toBe(250);
    expect(ENV.circuitBreakerFailureThreshold).toBe(8);
    expect(ENV.circuitBreakerResetTimeoutMs).toBe(45000);
  });

  it("reports missing critical env vars for runtime", async () => {
    delete process.env.BUILT_IN_FORGE_API_URL;
    delete process.env.FORGE_API_URL;
    delete process.env.BUILT_IN_FORGE_API_KEY;
    delete process.env.FORGE_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const { getMissingCriticalEnvVars } = await importEnvModule();

    expect(getMissingCriticalEnvVars({ forProductionBoot: false })).toEqual([
      "BUILT_IN_FORGE_API_URL (or FORGE_API_URL)",
      "BUILT_IN_FORGE_API_KEY (or FORGE_API_KEY / OPENAI_API_KEY)",
    ]);
  });

  it("reports production boot requirements when requested", async () => {
    delete process.env.BUILT_IN_FORGE_API_URL;
    delete process.env.FORGE_API_URL;
    delete process.env.BUILT_IN_FORGE_API_KEY;
    delete process.env.FORGE_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.JWT_SECRET;
    delete process.env.OWNER_OPEN_ID;

    const { getMissingCriticalEnvVars } = await importEnvModule();

    expect(getMissingCriticalEnvVars({ forProductionBoot: true })).toEqual([
      "BUILT_IN_FORGE_API_URL (or FORGE_API_URL)",
      "BUILT_IN_FORGE_API_KEY (or FORGE_API_KEY / OPENAI_API_KEY)",
      "JWT_SECRET",
      "OWNER_OPEN_ID",
    ]);
  });
});
