/**
 * Database initialisation script for HDAK Library Chatbot (PostgreSQL / Neon).
 *
 * Applies the initial migration that creates the three tables required by the
 * application: conversations, messages, push_subscriptions.
 *
 * Usage (TypeScript via tsx):
 *   DATABASE_URL=<neon-connection-string> npx tsx seed-db.ts
 */

import { readFileSync } from "fs";
import { join } from "path";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error(
    "❌  DATABASE_URL is required. Set it before running this script."
  );
  process.exit(1);
}

const sql = neon(databaseUrl);
const migrationPath = join(
  __dirname,
  "drizzle/migrations/0000_initial_schema.sql"
);

async function seed(): Promise<void> {
  console.log("Applying initial schema migration…");
  try {
    const ddl = readFileSync(migrationPath, "utf8");
    const statements = ddl
      .split(/;\s*\n/)
      .map(s => s.trim())
      .filter(Boolean);

    for (const stmt of statements) {
      await sql.unsafe(stmt);
    }
    console.log("✅  Schema applied successfully.");
  } catch (err) {
    console.error("❌  Migration failed:", err);
    process.exit(1);
  }
}

seed();
