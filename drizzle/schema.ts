import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  language: mysqlEnum("language", ["en", "uk", "ru"]).default("en").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Conversations table - stores chat sessions for each user
 */
export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  language: mysqlEnum("language", ["en", "uk", "ru"]).default("en").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

/**
 * Messages table - stores individual messages in conversations
 */
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * Library Resources table - stores information about available resources
 */
export const libraryResources = mysqlTable("libraryResources", {
  id: int("id").autoincrement().primaryKey(),
  nameEn: varchar("nameEn", { length: 255 }).notNull(),
  nameUk: varchar("nameUk", { length: 255 }).notNull(),
  nameRu: varchar("nameRu", { length: 255 }).notNull(),
  descriptionEn: text("descriptionEn"),
  descriptionUk: text("descriptionUk"),
  descriptionRu: text("descriptionRu"),
  type: mysqlEnum("type", ["electronic_library", "repository", "catalog", "database", "other"]).notNull(),
  url: varchar("url", { length: 500 }),
  keywords: json("keywords"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LibraryResource = typeof libraryResources.$inferSelect;
export type InsertLibraryResource = typeof libraryResources.$inferInsert;

/**
 * Library Contacts table - stores contact information
 */
export const libraryContacts = mysqlTable("libraryContacts", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["email", "phone", "address", "telegram", "viber", "facebook", "instagram", "other"]).notNull(),
  value: varchar("value", { length: 255 }).notNull(),
  labelEn: varchar("labelEn", { length: 255 }),
  labelUk: varchar("labelUk", { length: 255 }),
  labelRu: varchar("labelRu", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LibraryContact = typeof libraryContacts.$inferSelect;
export type InsertLibraryContact = typeof libraryContacts.$inferInsert;

/**
 * Library Info table - stores general information about the library
 */
export const libraryInfo = mysqlTable("libraryInfo", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  valueEn: text("valueEn"),
  valueUk: text("valueUk"),
  valueRu: text("valueRu"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LibraryInfo = typeof libraryInfo.$inferSelect;
export type InsertLibraryInfo = typeof libraryInfo.$inferInsert;

/**
 * User Queries table - logs user queries for analytics
 */
export const userQueries = mysqlTable("userQueries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  conversationId: int("conversationId"),
  query: text("query").notNull(),
  language: mysqlEnum("language", ["en", "uk", "ru"]).notNull(),
  resourcesReturned: json("resourcesReturned"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserQuery = typeof userQueries.$inferSelect;
export type InsertUserQuery = typeof userQueries.$inferInsert;