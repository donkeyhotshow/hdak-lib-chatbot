/**
 * Session Store
 *
 * Provides a lightweight, in-memory per-user dialog state store backed by
 * NodeCache.  Each entry is scoped to a (userId, conversationId?) pair and
 * automatically expires after 30 minutes of inactivity.
 *
 * The store tracks contextual information accumulated during a single
 * conversation session:
 *   - detected language (so we don't re-detect on every message)
 *   - current topic (for multi-step dialogs)
 *   - message count (for analytics / context window management)
 *   - a free-form `context` map for any additional dialog state
 *
 * Concurrency note: Node.js executes JavaScript on a single thread, so all
 * cache reads and writes are effectively atomic and no additional locking is
 * needed.  Long-running I/O (AI API calls, DB writes) happens asynchronously
 * and does not block the event loop.
 *
 * Replacing this with Redis / Memcached:
 *   1. Replace NodeCache with an ioredis / memjs client.
 *   2. Serialise entries with JSON.stringify; deserialise with JSON.parse.
 *   3. Keep the exported function signatures identical.
 */

import NodeCache from "node-cache";
import { logger } from "../_core/logger";

/** Inactivity TTL for a session entry (30 minutes). */
const SESSION_TTL_SECONDS = 30 * 60;

/**
 * The detected / user-selected language for a session.
 * Matches the SupportedLanguage type used throughout the pipeline.
 */
export type SessionLanguage = "en" | "uk" | "ru";

/**
 * The dialog-level state tracked for a single conversation session.
 *
 * `context` is intentionally typed as `Record<string, unknown>` so that any
 * caller can attach lightweight multi-step state without adding new fields.
 */
export type DialogState = {
  /** High-level topic label inferred from the conversation so far. */
  currentTopic?: string;
  /** Language detected / confirmed for this session. */
  sessionLanguage?: SessionLanguage;
  /** Total number of user messages sent in this session. */
  messageCount: number;
  /** ISO-8601 timestamp of the last activity for this session. */
  lastActiveAt: string;
  /** Arbitrary key-value context for multi-step dialog flows. */
  context: Record<string, unknown>;
};

/** A complete session entry stored in the cache. */
export type SessionEntry = {
  userId: number;
  conversationId?: number;
  dialogState: DialogState;
};

const sessionCache = new NodeCache({
  stdTTL: SESSION_TTL_SECONDS,
  checkperiod: 60,
  useClones: false,
});

function makeSessionKey(userId: number, conversationId?: number): string {
  return conversationId != null
    ? `session:${userId}:${conversationId}`
    : `session:${userId}`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Retrieve the current session entry for a user.
 * Returns `undefined` when no session exists or the TTL has expired.
 */
export function getSessionState(
  userId: number,
  conversationId?: number
): SessionEntry | undefined {
  const key = makeSessionKey(userId, conversationId);
  return sessionCache.get<SessionEntry>(key);
}

/**
 * Create or partially update the session state for a user.
 *
 * Existing fields not mentioned in `update` are preserved.  The
 * `lastActiveAt` timestamp is always refreshed to the current time.
 * Calling this function also resets the inactivity TTL.
 */
export function setSessionState(
  userId: number,
  update: Partial<Omit<SessionEntry, "userId">>,
  conversationId?: number
): SessionEntry {
  const key = makeSessionKey(userId, conversationId);
  const existing = sessionCache.get<SessionEntry>(key);
  const now = new Date().toISOString();

  const mergedDialogState: DialogState = {
    messageCount: 0,
    lastActiveAt: now,
    context: {},
    ...existing?.dialogState,
    ...update.dialogState,
  };
  // Always stamp the current time, regardless of what the caller passed.
  mergedDialogState.lastActiveAt = now;

  const merged: SessionEntry = {
    userId,
    conversationId: update.conversationId ?? existing?.conversationId,
    dialogState: mergedDialogState,
  };

  sessionCache.set(key, merged);

  logger.debug("[sessionStore] Session updated", {
    userId,
    conversationId,
    messageCount: merged.dialogState.messageCount,
    sessionLanguage: merged.dialogState.sessionLanguage,
  });

  return merged;
}

/**
 * Refresh the TTL for an existing session without modifying its content.
 * Returns `true` when the session existed and its TTL was reset,
 * or `false` when no session was found for the given key.
 */
export function touchSession(userId: number, conversationId?: number): boolean {
  const key = makeSessionKey(userId, conversationId);
  return sessionCache.ttl(key, SESSION_TTL_SECONDS);
}

/**
 * Delete the session for a user (e.g. on logout or conversation deletion).
 */
export function clearSession(userId: number, conversationId?: number): void {
  const key = makeSessionKey(userId, conversationId);
  sessionCache.del(key);
  logger.debug("[sessionStore] Session cleared", { userId, conversationId });
}

/**
 * Flush every session from the store.
 * Intended for use in tests only.
 */
export function clearAllSessions(): void {
  sessionCache.flushAll();
}

/** Return the number of active (non-expired) sessions currently in the store. */
export function getActiveSessionCount(): number {
  return sessionCache.keys().length;
}
