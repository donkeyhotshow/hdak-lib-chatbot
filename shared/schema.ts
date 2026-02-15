
import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/chat";

export const libraryInfo = pgTable("library_info", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  category: text("category").notNull(), // 'contacts', 'hours', 'rules', 'general'
});

export const libraryResources = pgTable("library_resources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  description: text("description").notNull(),
});

export const insertLibraryInfoSchema = createInsertSchema(libraryInfo).omit({ id: true });
export const insertLibraryResourceSchema = createInsertSchema(libraryResources).omit({ id: true });

export type LibraryInfo = typeof libraryInfo.$inferSelect;
export type LibraryResource = typeof libraryResources.$inferSelect;
