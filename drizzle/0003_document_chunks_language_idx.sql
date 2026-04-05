-- Migration: add composite index on documentChunks(language, createdAt)
-- Speeds up the per-language, recency-ordered chunk fetch used by getDocumentChunks().

CREATE INDEX `documentChunks_language_createdAt_idx`
  ON `documentChunks` (`language`, `createdAt`);
