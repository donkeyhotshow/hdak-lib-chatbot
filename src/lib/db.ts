import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { pgTable, text, timestamp, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error("DATABASE_URL is required in production");
  }
  console.warn("⚠️ DATABASE_URL is not set. DB operations will fail at runtime.");
}

const client = neon(connectionString || "postgresql://db_user:db_password@db_host:5432/db_name");
export const db = drizzle(client);

// Schema definitions
export const conversations = pgTable("conversations", {
  id: text("id").primaryKey().$defaultFn(() => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }),
  sessionId: text("session_id").notNull().default('anonymous'),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  sessionIdx: index("conversations_session_id_idx").on(table.sessionId),
}));

export const messages = pgTable("messages", {
  id: text("id").primaryKey().$defaultFn(() => {
    // L33: crypto.randomUUID() is available in Node 19+, Next.js edge, and modern browsers
    // For older Node versions, fall back to a manual UUID v4
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }),
  conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  // M11: enforce valid roles at DB level
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  // M10: composite index for fast ORDER BY createdAt within a conversation
  conversationCreatedIdx: index("messages_conv_created_idx").on(table.conversationId, table.createdAt),
  // M11: CHECK constraint — only valid roles accepted
  roleCheck: check("messages_role_check", sql`${table.role} IN ('USER', 'ASSISTANT', 'SYSTEM')`),
}));

export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
