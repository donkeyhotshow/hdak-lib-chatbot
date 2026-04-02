import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { pgTable, text, timestamp, index, check, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

let _db: ReturnType<typeof drizzle> | null = null;
let _dbError: Error | null = null;

function getDb(): ReturnType<typeof drizzle> {
  if (_dbError) throw _dbError;
  if (!_db) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      _dbError = new Error("DATABASE_URL environment variable is required. Set it in .env or .env.local");
      throw _dbError;
    }
    const client = neon(connectionString);
    _db = drizzle(client);
  }
  return _db;
}

export const db: ReturnType<typeof drizzle> = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

// Schema definitions
export const conversations = pgTable("conversations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: text("session_id").notNull().default('anonymous'),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  sessionIdx: index("conversations_session_id_idx").on(table.sessionId),
}));

export const messages = pgTable("messages", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
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

// Push subscriptions for book return reminders
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: text("session_id").notNull(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  remindAt: timestamp("remind_at"),
  sent: boolean("sent").notNull().default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => ({
  sessionIdx: index("push_session_idx").on(table.sessionId),
  remindIdx: index("push_remind_at_idx").on(table.remindAt),
}));

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
