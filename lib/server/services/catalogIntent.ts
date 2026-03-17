export const OFFICIAL_CATALOG_URL = "https://lib-hdak.in.ua/e-catalog.html";

export type CatalogSearchType = "generic" | "author" | "title" | "subject";

export type CatalogIntentAction = {
  type: "catalog";
  title: string;
  description: string;
  searchType: CatalogSearchType;
  searchQuery: string;
  url: string;
  buttonLabel: string;
};

type CatalogIntentLanguage = "uk" | "en";

const GENERIC_CATALOG_KEYWORDS = [
  "де електронний каталог",
  "відкрий каталог",
  "каталог бібліотеки",
  "пошук у каталозі",
  "як знайти книгу",
  "знайти книгу",
  "пошук за автором",
  "пошук за назвою",
  "find in catalog",
  "open catalog",
  "library catalog",
];

function stripPunctuation(value: string) {
  /**
   * Keeps only Unicode letters (\p{L}), numbers (\p{N}) and whitespace.
   * This makes intent matching resilient to punctuation noise in user queries.
   */
  return value.replace(/[^\p{L}\p{N}\s]/gu, " ");
}

export function normalizeCatalogIntentQuery(query: string): string {
  return stripPunctuation(query.toLowerCase()).replace(/\s+/g, " ").trim();
}

function buildCatalogUrl(searchQuery: string): string {
  if (!searchQuery.trim()) return OFFICIAL_CATALOG_URL;
  return `${OFFICIAL_CATALOG_URL}#query=${encodeURIComponent(searchQuery.trim())}`;
}

function extractSearchQuery(
  normalizedQuery: string,
  patterns: RegExp[]
): string {
  for (const pattern of patterns) {
    const matched = normalizedQuery.match(pattern);
    const extracted = matched?.[1]?.trim();
    if (extracted) return extracted;
  }
  return "";
}

function getCatalogButtonLabel(
  language: CatalogIntentLanguage,
  searchQuery: string
) {
  if (language === "en") {
    return searchQuery ? "Search in catalog" : "Open catalog";
  }
  return searchQuery ? "Шукати в каталозі" : "Відкрити каталог";
}

export function getCatalogIntentAction(
  query: string,
  language: CatalogIntentLanguage = "uk"
): CatalogIntentAction | null {
  const normalizedQuery = normalizeCatalogIntentQuery(query);
  if (!normalizedQuery) return null;

  const authorQuery = extractSearchQuery(normalizedQuery, [
    /(?:знайти автора|пошук за автором|author)\s+(.+)$/,
  ]);
  if (authorQuery) {
    return {
      type: "catalog",
      title: "Пошук автора в електронному каталозі",
      description:
        "Відкрийте електронний каталог ХДАК і виконайте пошук у полі автора.",
      searchType: "author",
      searchQuery: authorQuery,
      url: buildCatalogUrl(authorQuery),
      buttonLabel: getCatalogButtonLabel(language, authorQuery),
    };
  }

  const titleQuery = extractSearchQuery(normalizedQuery, [
    /(?:пошук за назвою|знайти видання|назва|title)\s+(.+)$/,
  ]);
  if (titleQuery) {
    return {
      type: "catalog",
      title: "Пошук видання за назвою",
      description:
        "Перейдіть у каталог і використайте поле назви для точнішого пошуку.",
      searchType: "title",
      searchQuery: titleQuery,
      url: buildCatalogUrl(titleQuery),
      buttonLabel: getCatalogButtonLabel(language, titleQuery),
    };
  }

  const subjectQuery = extractSearchQuery(normalizedQuery, [
    /(?:книги з теми|книги про|знайди книжки про)\s+(.+)$/,
  ]);
  if (subjectQuery) {
    return {
      type: "catalog",
      title: "Пошук книжок за темою",
      description:
        "Використайте тематичний або предметний пошук в електронному каталозі.",
      searchType: "subject",
      searchQuery: subjectQuery,
      url: buildCatalogUrl(subjectQuery),
      buttonLabel: getCatalogButtonLabel(language, subjectQuery),
    };
  }

  const hasGenericCatalogIntent = GENERIC_CATALOG_KEYWORDS.some(keyword =>
    normalizedQuery.includes(keyword)
  );
  if (!hasGenericCatalogIntent) return null;

  return {
    type: "catalog",
    title: "Електронний каталог ХДАК",
    description: "У каталозі можна шукати книги за автором, назвою або темою.",
    searchType: "generic",
    searchQuery: "",
    url: OFFICIAL_CATALOG_URL,
    buttonLabel: getCatalogButtonLabel(language, ""),
  };
}
