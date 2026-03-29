import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { pgTable, serial, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Using a non-empty fallback URL for build-time safety to satisfy neon() validation.
// This will not connect until a query is actually performed.
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("⚠️ DATABASE_URL is not set. Using build-time placeholder.");
}

const client = neon(connectionString || "postgresql://db_user:db_password@db_host:5432/db_name");
export const db = drizzle(client);

// Schema definitions
export const conversations = pgTable("conversations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const messages = pgTable("messages", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
