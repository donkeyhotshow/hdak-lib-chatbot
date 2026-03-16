import { z } from "zod/v4";
import * as db from "../db";
import { hdakResources } from "../system-prompts-official";
import { sanitizeUntrustedContent } from "../services/aiPipeline";
import type { ToolRegistryEntry } from "./registry";

const searchLibraryResourcesSchema = z.object({ query: z.string() });
const getCatalogSearchLinkSchema = z.object({
  searchTerm: z.string(),
  searchType: z.enum(["author", "title", "subject", "keyword"]),
});
const findUpcomingLibraryEventsSchema = z.object({
  keyword: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const dataTools = [
  {
    name: "searchLibraryResources",
    description:
      "Search library databases and resources by keyword, topic, or author.",
    schema: searchLibraryResourcesSchema,
    inputSchema: z.object({
      query: z
        .string()
        .describe(
          "Search query — author name, subject, database name, topic, etc."
        ),
    }),
    execute: async ({ query }) => {
      const dbResources = await db.searchResources(query);
      const q = query.toLowerCase();
      const siteResources = hdakResources.filter(
        r =>
          r.name.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q)
      );
      return {
        query,
        dbResources: dbResources.slice(0, 5).map(r => ({
          name: sanitizeUntrustedContent(r.nameUk || r.nameEn || ""),
          description: sanitizeUntrustedContent(
            r.descriptionUk || r.descriptionEn || ""
          ),
          url: r.url,
          type: r.type,
        })),
        siteResources: siteResources.slice(0, 4),
        found: dbResources.length + siteResources.length,
      };
    },
  } satisfies ToolRegistryEntry<typeof searchLibraryResourcesSchema>,
  {
    name: "getCatalogSearchLink",
    description:
      "Get the HDAK electronic catalog URL and instructions for searching by author, title, or subject.",
    schema: getCatalogSearchLinkSchema,
    inputSchema: z.object({
      searchTerm: z
        .string()
        .describe("The author name, book title, or subject to search for"),
      searchType: z
        .enum(["author", "title", "subject", "keyword"])
        .default("author")
        .describe("Type of search field to use"),
    }),
    execute: async ({ searchTerm, searchType }) => {
      const fieldLabel: Record<string, string> = {
        author: "Автор / Author",
        title: "Назва / Title",
        subject: "Тематика / Subject",
        keyword: "Ключові слова / Keywords",
      };
      return {
        catalogUrl: "https://lib-hdak.in.ua/e-catalog.html",
        catalogPageUrl: "https://lib-hdak.in.ua/e-catalog.html",
        repositoryUrl: "https://lib-hdak.in.ua/scientists-publications.html",
        searchTerm,
        searchType,
        searchFieldLabel: fieldLabel[searchType] ?? fieldLabel.author,
        steps: [
          "Відкрийте електронний каталог ХДАК: https://lib-hdak.in.ua/e-catalog.html",
          'Натисніть кнопку "Пошук" або перейдіть за посиланням: https://lib-hdak.in.ua/e-catalog.html',
          `У полі "${fieldLabel[searchType]}" введіть: ${searchTerm}`,
          "Натисніть кнопку пошуку та перегляньте результати.",
        ],
        repositoryNote:
          "Якщо шукаєте публікації вчених ХДАК — скористайтесь репозитарієм: https://lib-hdak.in.ua/scientists-publications.html",
      };
    },
  } satisfies ToolRegistryEntry<typeof getCatalogSearchLinkSchema>,
  {
    name: "findUpcomingLibraryEvents",
    description:
      "Find upcoming or recent events, exhibitions, lectures, and announcements at the HDAK library.",
    schema: findUpcomingLibraryEventsSchema,
    inputSchema: z.object({
      keyword: z
        .string()
        .optional()
        .describe("Optional keyword/topic for filtering events."),
      dateFrom: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
      dateTo: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
    }),
    execute: async ({ keyword, dateFrom, dateTo }) => {
      const allInfo = await db.getAllLibraryInfo();
      const kw = keyword?.toLowerCase() ?? "";
      const from = dateFrom ? new Date(dateFrom) : null;
      const to = dateTo ? new Date(dateTo) : null;

      const events = allInfo.filter(entry => {
        const isEvent =
          entry.key.toLowerCase().startsWith("event") ||
          entry.key.toLowerCase().includes("announcement") ||
          entry.key.toLowerCase().includes("exhibition") ||
          (kw &&
            ((entry.valueUk ?? "").toLowerCase().includes(kw) ||
              (entry.valueEn ?? "").toLowerCase().includes(kw) ||
              (entry.valueRu ?? "").toLowerCase().includes(kw)));
        if (!isEvent) return false;
        if (from || to) {
          const dateMatch = entry.key.match(/(\d{4}-\d{2}-\d{2})/);
          if (dateMatch) {
            const d = new Date(dateMatch[1]);
            if (from && d < from) return false;
            if (to && d > to) return false;
          }
        }
        return true;
      });

      return {
        found: events.length,
        eventsPageUrl: "https://lib-hdak.in.ua/news.html",
        events: events.slice(0, 8).map(e => ({
          key: e.key,
          uk: e.valueUk,
          en: e.valueEn,
          ru: e.valueRu,
        })),
        note:
          events.length === 0
            ? "No matching events found in the library info registry. Check the library news page: https://lib-hdak.in.ua/news.html"
            : undefined,
      };
    },
  } satisfies ToolRegistryEntry<typeof findUpcomingLibraryEventsSchema>,
] as ToolRegistryEntry[];
