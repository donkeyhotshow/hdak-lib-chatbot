import { z } from "zod/v4";
import { logger } from "../_core/logger";
import type { ToolRegistryEntry } from "./registry";

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
      const qs = new URLSearchParams();
      if (author) qs.set("author", author);
      if (title) qs.set("title", title);
      if (topic) qs.set("topic", topic);
      const base = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";
      const url = `${base}/api/catalog?${qs}`;
      try {
        const res = await fetch(url, {
          signal: AbortSignal.timeout(10000),
        });
        return await res.json();
      } catch (err) {
        logger.warn("[searchCatalog] Catalog fetch failed", {
          error: err instanceof Error ? err.message : String(err),
        });
        return {
          ok: false,
          results: [],
          search_url: url,
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
