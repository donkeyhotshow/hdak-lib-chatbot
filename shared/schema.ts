
import { pgTable, text, serial, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export * from "./models/chat";

// Stores factual library data: hours, address, contacts, rules, services
// value_uk — основна мова; value_en — для англомовних запитів
export const libraryInfo = pgTable("library_info", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(), // 'address' | 'phone' | 'email' | 'hours' | 'rules' | 'services' | 'about'
  value_uk: text("value_uk").notNull(),
  value_en: text("value_en").notNull().default(""),
  category: text("category").notNull(), // 'contacts' | 'hours' | 'rules' | 'services' | 'general'
  source: text("source").notNull().default("admin"), // 'library' | 'admin'
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

// Stores official external resources the bot may reference
export const libraryResources = pgTable("library_resources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'catalog' | 'repository' | 'site' | 'db'
  url: text("url").notNull(),
  description_uk: text("description_uk").notNull(),
  description_en: text("description_en").notNull().default(""),
  is_official: boolean("is_official").notNull().default(true),
  requires_auth: boolean("requires_auth").notNull().default(false),
});

export const insertLibraryInfoSchema = createInsertSchema(libraryInfo).omit({ id: true, updated_at: true });
export const insertLibraryResourceSchema = createInsertSchema(libraryResources).omit({ id: true });

export type LibraryInfo = typeof libraryInfo.$inferSelect;
export type LibraryResource = typeof libraryResources.$inferSelect;
