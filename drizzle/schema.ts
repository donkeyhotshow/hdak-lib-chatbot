import {
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  json,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Shared PostgreSQL enum types ────────────────────────────────────────────
// Declaring enums at the module level allows multiple tables to reference the
// same native PostgreSQL enum type.

/** User account roles. */
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

/** Supported UI / response languages. */
export const languageEnum = pgEnum("language", ["en", "uk", "ru"]);

/** Chat message authorship. */
export const messageRoleEnum = pgEnum("message_role", ["user", "assistant"]);

/** Library resource categories. */
export const resourceTypeEnum = pgEnum("resource_type", [
  "electronic_library",
  "repository",
  "catalog",
  "database",
  "other",
]);

/** Library contact channel types. */
export const contactTypeEnum = pgEnum("contact_type", [
  "email",
  "phone",
  "address",
  "telegram",
  "viber",
  "facebook",
  "instagram",
  "other",
]);

/** RAG document origin. */
export const sourceTypeEnum = pgEnum("source_type", [
  "catalog",
  "repository",
  "database",
  "other",
]);

/** RAG document processing lifecycle. */
export const processingStatusEnum = pgEnum("processing_status", [
  "processing",
  "completed",
  "failed",
]);

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = pgTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: serial("id").primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  language: languageEnum("language").default("en").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Conversations table - stores chat sessions for each user
 */
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  language: languageEnum("language").default("en").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  /** Soft-delete timestamp. NULL means the conversation is active. */
  deletedAt: timestamp("deletedAt"),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

/**
 * Messages table - stores individual messages in conversations
 */
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversationId").notNull(),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * Library Resources table - stores information about available resources
 */
export const libraryResources = pgTable("libraryResources", {
  id: serial("id").primaryKey(),
  nameEn: varchar("nameEn", { length: 255 }).notNull(),
  nameUk: varchar("nameUk", { length: 255 }).notNull(),
  nameRu: varchar("nameRu", { length: 255 }).notNull(),
  descriptionEn: text("descriptionEn"),
  descriptionUk: text("descriptionUk"),
  descriptionRu: text("descriptionRu"),
  type: resourceTypeEnum("type").notNull(),
  url: varchar("url", { length: 500 }),
  keywords: json("keywords"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  /** Soft-delete timestamp. NULL means the resource is active. */
  deletedAt: timestamp("deletedAt"),
});

export type LibraryResource = typeof libraryResources.$inferSelect;
export type InsertLibraryResource = typeof libraryResources.$inferInsert;

/**
 * Library Contacts table - stores contact information
 */
export const libraryContacts = pgTable("libraryContacts", {
  id: serial("id").primaryKey(),
  type: contactTypeEnum("type").notNull(),
  value: varchar("value", { length: 255 }).notNull(),
  labelEn: varchar("labelEn", { length: 255 }),
  labelUk: varchar("labelUk", { length: 255 }),
  labelRu: varchar("labelRu", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type LibraryContact = typeof libraryContacts.$inferSelect;
export type InsertLibraryContact = typeof libraryContacts.$inferInsert;

/**
 * Library Info table - stores general information about the library
 */
export const libraryInfo = pgTable("libraryInfo", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  valueEn: text("valueEn"),
  valueUk: text("valueUk"),
  valueRu: text("valueRu"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type LibraryInfo = typeof libraryInfo.$inferSelect;
export type InsertLibraryInfo = typeof libraryInfo.$inferInsert;

/**
 * User Queries table - logs user queries for analytics
 */
export const userQueries = pgTable("userQueries", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  conversationId: integer("conversationId"),
  query: text("query").notNull(),
  language: languageEnum("language").notNull(),
  resourcesReturned: json("resourcesReturned"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserQuery = typeof userQueries.$inferSelect;
export type InsertUserQuery = typeof userQueries.$inferInsert;

/**
 * Document Chunks table - stores PDF document chunks for RAG
 */
export const documentChunks = pgTable(
  "documentChunks",
  {
    id: serial("id").primaryKey(),
    documentId: varchar("documentId", { length: 255 }).notNull(),
    documentTitle: varchar("documentTitle", { length: 500 }).notNull(),
    documentUrl: varchar("documentUrl", { length: 1000 }),
    chunkIndex: integer("chunkIndex").notNull(),
    content: text("content").notNull(),
    // Store embedding as JSON array of floats (no native vector type in the free tier)
    embedding: json("embedding"),
    sourceType: sourceTypeEnum("sourceType").notNull(),
    language: languageEnum("language").default("uk").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => ({
    // Supports fast language-filtered fetch ordered by recency (used by getDocumentChunks).
    languageCreatedAtIdx: index("documentChunks_language_createdAt_idx").on(
      table.language,
      table.createdAt
    ),
  })
);

export type DocumentChunk = typeof documentChunks.$inferSelect;
export type InsertDocumentChunk = typeof documentChunks.$inferInsert;

/**
 * Document Metadata table - stores metadata about processed documents
 */
export const documentMetadata = pgTable("documentMetadata", {
  id: serial("id").primaryKey(),
  documentId: varchar("documentId", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 500 }).notNull(),
  url: varchar("url", { length: 1000 }),
  author: varchar("author", { length: 255 }),
  publishedDate: timestamp("publishedDate"),
  sourceType: sourceTypeEnum("sourceType").notNull(),
  language: languageEnum("language").default("uk").notNull(),
  totalChunks: integer("totalChunks").default(0),
  isProcessed: integer("isProcessed").default(0),
  /** Processing lifecycle: 'processing' → 'completed' | 'failed'. */
  status: processingStatusEnum("status").default("processing").notNull(),
  processingError: text("processingError"),
  /**
   * SHA-256 hex digest of the raw document content.
   * Used to detect duplicate uploads: if a document with the same hash already
   * exists the upload is skipped and the existing documentId is returned.
   */
  contentHash: varchar("contentHash", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type DocumentMetadata = typeof documentMetadata.$inferSelect;
export type InsertDocumentMetadata = typeof documentMetadata.$inferInsert;
