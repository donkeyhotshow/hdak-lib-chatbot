-- Initial schema migration for HDAK Library Chatbot (PostgreSQL / Neon)
-- Apply with: pnpm db:migrate

CREATE TABLE IF NOT EXISTS "conversations" (
  "id" text PRIMARY KEY NOT NULL,
  "session_id" text NOT NULL DEFAULT 'anonymous',
  "title" text NOT NULL,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS "conversations_session_id_idx"
  ON "conversations" ("session_id");

CREATE TABLE IF NOT EXISTS "messages" (
  "id" text PRIMARY KEY NOT NULL,
  "conversation_id" text NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "role" text NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "messages_role_check" CHECK ("role" IN ('USER', 'ASSISTANT', 'SYSTEM'))
);

CREATE INDEX IF NOT EXISTS "messages_conv_created_idx"
  ON "messages" ("conversation_id", "created_at");

CREATE TABLE IF NOT EXISTS "push_subscriptions" (
  "id" text PRIMARY KEY NOT NULL,
  "session_id" text NOT NULL,
  "endpoint" text NOT NULL UNIQUE,
  "p256dh" text NOT NULL,
  "auth" text NOT NULL,
  "remind_at" timestamp,
  "sent" boolean NOT NULL DEFAULT false,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS "push_session_idx"
  ON "push_subscriptions" ("session_id");

CREATE INDEX IF NOT EXISTS "push_remind_at_idx"
  ON "push_subscriptions" ("remind_at");
