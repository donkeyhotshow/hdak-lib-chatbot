import { z } from "zod/v4";
import { logger } from "../_core/logger";
import type { ToolRegistryEntry } from "./registry";
import { searchCatalogDirect } from "../services/catalogSearch";

const searchCatalogSchema = z.object({
  author: z.string().optional(),
  title: z.string().optional(),
  topic: z.string().optional(),
});

export const catalogTools = [
  {
    name: "searchCatalog",
    description:
      "Search HDAK library catalog. Call when user asks about books, authors, or reading lists.",
    schema: searchCatalogSchema,
    inputSchema: z.object({
      author: z
        .string()
        .optional()
        .describe("Author name to search for in the library catalog"),
      title: z
        .string()
        .optional()
        .describe("Book title to search for in the library catalog"),
      topic: z
        .string()
        .optional()
        .describe("Topic or subject to search for in the library catalog"),
    }),
    execute: async ({
      author,
      title,
      topic,
    }: {
      author?: string;
      title?: string;
      topic?: string;
    }) => {
      try {
        return await searchCatalogDirect({ author, title, topic });
      } catch (err) {
        logger.warn("[searchCatalog] Unexpected error calling catalog service", {
          error: err instanceof Error ? err.message : String(err),
        });
        return {
          ok: false,
          results: [],
          search_url: "https://lib-hdak.in.ua/e-catalog.html",
          error_type: "unavailable" as const,
          fallback: [
            {
              label: "Відкрити каталог",
              url: "https://lib-hdak.in.ua/e-catalog.html",
            },
          ],
        };
      }
    },
  } satisfies ToolRegistryEntry<typeof searchCatalogSchema>,
] as ToolRegistryEntry[];
