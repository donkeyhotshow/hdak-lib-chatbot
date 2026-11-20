import { afterEach, describe, expect, it, vi } from "vitest";
import { getDatabaseUrl, isDatabaseConfigured } from "@/lib/database-config";

describe("database configuration", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses the documented environment variable priority", () => {
    expect(
      getDatabaseUrl({
        DATABASE_URL: "  postgres://primary ",
        HDAK_DATABASE_URL: "postgres://hdak",
        NEON_DATABASE_URL: "postgres://neon",
      } as NodeJS.ProcessEnv)
    ).toBe("postgres://primary");

    expect(
      getDatabaseUrl({
        HDAK_DATABASE_URL: "postgres://hdak",
        NEON_DATABASE_URL: "postgres://neon",
      } as NodeJS.ProcessEnv)
    ).toBe("postgres://hdak");
  });

  it("does not silently use deployment credentials in tests", () => {
    expect(
      getDatabaseUrl({
        NODE_ENV: "test",
        DATABASE_URL: "postgres://production",
        NEON_DATABASE_URL: "postgres://production-alias",
      } as NodeJS.ProcessEnv)
    ).toBeUndefined();
    expect(
      getDatabaseUrl({
        NODE_ENV: "test",
        DATABASE_URL: "postgres://production",
        TEST_DATABASE_URL: "postgres://isolated-test",
      } as NodeJS.ProcessEnv)
    ).toBe("postgres://isolated-test");
  });

  it("reports configuration without exposing connection values", () => {
    expect(isDatabaseConfigured({} as NodeJS.ProcessEnv)).toBe(false);
    expect(
      isDatabaseConfigured({
        HDAK_DATABASE_URL: "postgres://configured",
      } as NodeJS.ProcessEnv)
    ).toBe(true);
  });
});
