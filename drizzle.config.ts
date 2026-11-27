import { defineConfig } from "drizzle-kit";

import { getDatabaseUrl } from "./src/lib/database-config";

const connectionString = getDatabaseUrl();

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
