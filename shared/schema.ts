
import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/chat";

// Stores factual library data: hours, address, contacts, rules, services
// value_uk / value_ru / value_en allow multilingual answers without hallucination
export const libraryInfo = pgTable("library_info", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(), // e.g. 'address', 'hours', 'contacts', 'rules', 'services'
  value_uk: text("value_uk").notNull(),
  value_ru: text("value_ru").notNull().default(""),
  value_en: text("value_en").notNull().default(""),
  category: text("category").notNull(), // 'contacts' | 'hours' | 'rules' | 'services' | 'general'
  source: text("source").notNull().default("admin"), // who last updated: 'library' | 'admin'
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

// Stores official external resources the bot may reference
export const libraryResources = pgTable("library_resources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'catalog' | 'repository' | 'site' | 'db'
  url: text("url").notNull(),
  description_uk: text("description_uk").notNull(),
  description_ru: text("description_ru").notNull().default(""),
  description_en: text("description_en").notNull().default(""),
  is_official: boolean("is_official").notNull().default(true),
  requires_auth: boolean("requires_auth").notNull().default(false),
});

export const insertLibraryInfoSchema = createInsertSchema(libraryInfo).omit({ id: true, updated_at: true });
export const insertLibraryResourceSchema = createInsertSchema(libraryResources).omit({ id: true });

export type LibraryInfo = typeof libraryInfo.$inferSelect;
export type LibraryResource = typeof libraryResources.$inferSelect;
