-- Reconcile an existing push_subscriptions table created by an older schema.
-- Additive only: no rows are deleted or rewritten.

ALTER TABLE "push_subscriptions"
  ADD COLUMN IF NOT EXISTS "session_id" text NOT NULL DEFAULT 'anonymous';

ALTER TABLE "push_subscriptions"
  ADD COLUMN IF NOT EXISTS "remind_at" timestamp;

ALTER TABLE "push_subscriptions"
  ADD COLUMN IF NOT EXISTS "sent" boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "push_session_idx"
  ON "push_subscriptions" ("session_id");

CREATE INDEX IF NOT EXISTS "push_remind_at_idx"
  ON "push_subscriptions" ("remind_at");
