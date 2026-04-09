/**
 * Database initialisation script for HDAK Library Chatbot (PostgreSQL / Neon).
 *
 * Applies the initial migration that creates the three tables required by the
 * application: conversations, messages, push_subscriptions.
 *
 * Usage:
 *   DATABASE_URL=<neon-connection-string> node seed-db.mjs
 *
 * Or via npm script:
 *   pnpm db:seed
 */

import { readFile } from "fs/promises";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error(
    "❌  DATABASE_URL is required. Set it before running this script."
  );
  process.exit(1);
}

const sql = neon(databaseUrl);
const migrationPath = new URL(
  "./drizzle/migrations/0000_initial_schema.sql",
  import.meta.url
);

async function seed() {
  console.log("Applying initial schema migration…");
  try {
    const ddl = await readFile(migrationPath, "utf8");
    // neon() tag-template executes raw SQL
    await sql.transaction(txSql =>
      ddl
        .split(/;\s*\n/)
        .map(stmt => stmt.trim())
        .filter(Boolean)
        .map(stmt => txSql`${txSql.unsafe(stmt)}`)
    );
    console.log("✅  Schema applied successfully.");
  } catch (err) {
    console.error("❌  Migration failed:", err);
    process.exit(1);
  }
}

seed();
