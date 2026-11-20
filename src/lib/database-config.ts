const DATABASE_URL_KEYS = [
  "DATABASE_URL",
  "HDAK_DATABASE_URL",
  "NEON_DATABASE_URL",
  "NEON_POSTGRES_URL",
  "NEON_POSTGRES_PRISMA_URL",
  "NEON_POSTGRES_URL_NON_POOLING",
  "HDAK_POSTGRES_URL",
  "HDAK_POSTGRES_PRISMA_URL",
  "HDAK_POSTGRES_URL_NON_POOLING",
] as const;

export function getDatabaseUrl(
  env: NodeJS.ProcessEnv = process.env
): string | undefined {
  if (env.NODE_ENV === "test") {
    return env.TEST_DATABASE_URL?.trim() || undefined;
  }

  for (const key of DATABASE_URL_KEYS) {
    const value = env[key]?.trim();
    if (value) return value;
  }

  return undefined;
}

export function isDatabaseConfigured(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return Boolean(getDatabaseUrl(env));
}
