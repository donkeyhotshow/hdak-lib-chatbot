import { defineConfig } from "drizzle-kit";

const connectionString =
  process.env.DATABASE_URL ||
  process.env.NEON_DATABASE_URL ||
  process.env.NEON_POSTGRES_URL ||
  process.env.NEON_POSTGRES_PRISMA_URL ||
  process.env.NEON_POSTGRES_URL_NON_POOLING;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL or a supported Neon fallback variable is required to run drizzle commands"
  );
}

export default defineConfig({
  schema: "./src/lib/db.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
