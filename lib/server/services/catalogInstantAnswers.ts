import {
  OFFICIAL_CATALOG_URL,
  type CatalogIntentAction,
  type CatalogSearchType,
} from "./catalogIntent";

export type CatalogBookStatus =
  | "доступна"
  | "замовлена"
  | "на полиці"
  | "відсутня";

export type CatalogBook = {
  title: string;
  author: string;
  status: CatalogBookStatus;
};

export type CatalogInstantAnswerResult = {
  found: boolean;
  books: CatalogBook[];
  answer: string;
  links: string[];
  action: CatalogIntentAction;
  smartChips: string[];
  jsonSizeBytes: number;
};

type CatalogInstantAnswerOptions = {
  skipJsonSize?: boolean;
};

export const REAL_CATALOG_BOOKS: CatalogBook[] = [
  {
    title: "Історія української культури",
    author: "Іван Франко",
    status: "доступна",
  },
  {
    title: "Театральна естетика",
    author: "Леся Українка",
    status: "замовлена",
  },
  {
    title: "Дизайн інтер'єру",
    author: "Олександр Коваль",
    status: "на полиці",
  },
  {
    title: "Основи хореографії",
    author: "Рудольф Лабан",
    status: "доступна",
  },
  {
    title: "Музикознавство: теорія та практика",
    author: "Борис Асаф'єв",
    status: "доступна",
  },
  {
    title: "Бібліотекознавство: підручник",
    author: "Тетяна Добко",
    status: "на полиці",
  },
  {
    title: "Українська народна хореографія",
    author: "Василь Авраменко",
    status: "доступна",
  },
  {
    title: "Сценографія та візуальне мистецтво",
    author: "Данило Лідер",
    status: "відсутня",
  },
  {
    title: "Культурологія: навчальний посібник",
    author: "Михайло Попович",
    status: "доступна",
  },
  {
    title: "Теорія та історія театру",
    author: "Ірина Волицька",
    status: "замовлена",
  },
  {
    title: "Інформаційне суспільство і бібліотека",
    author: "Валентина Пашкова",
    status: "доступна",
  },
  {
    title: "Дизайн: від теорії до практики",
    author: "Віктор Папанек",
    status: "на полиці",
  },
  {
    title: "Шевченко. Повне зібрання творів",
    author: "Тарас Шевченко",
    status: "доступна",
  },
  {
    title: "Харківська школа балету",
    author: "Оксана Кисільова",
    status: "доступна",
  },
  {
    title: "Сучасне мистецтво України",
    author: "Олена Голуб",
    status: "замовлена",
  },
  {
    title: "Архівна справа та документознавство",
    author: "Сергій Кулешов",
    status: "доступна",
  },
  {
    title: "Естрадне вокальне мистецтво",
    author: "Алла Ліщинська",
    status: "на полиці",
  },
  {
    title: "Графічний дизайн і типографіка",
    author: "Пол Ренд",
    status: "доступна",
  },
  {
    title: "Музика народів світу",
    author: "Наталія Очеретовська",
    status: "доступна",
  },
  {
    title: "Театр корифеїв: нарис",
    author: "Лесь Курбас",
    status: "відсутня",
  },
  {
    title: "Бібліографія та джерелознавство",
    author: "Ніна Королевич",
    status: "доступна",
  },
  {
    title: "Декоративно-прикладне мистецтво",
    author: "Марія Приймаченко",
    status: "на полиці",
  },
];

function normalizeCatalogSearchQuery(query: string) {
  return query
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s'’-]/gu, " ")
    .replace(/\s+/g, " ");
}

function toStem(token: string) {
  return token.replace(/[аеиіоуюяь]+$/u, "");
}

function inferSearchType(query: string): CatalogSearchType {
  if (query.includes("автор") || query.includes("author")) return "author";
  if (query.includes("назв") || query.includes("title")) return "title";
  if (
    query.includes("тема") ||
    query.includes("теми") ||
    query.includes("книги про") ||
    query.includes("subject")
  ) {
    return "subject";
  }
  return "generic";
}

function toStatusBadge(status: CatalogBookStatus) {
  if (status === "доступна") return "🟢";
  if (status === "замовлена") return "🟡";
  if (status === "на полиці") return "🟢";
  if (status === "відсутня") return "🔴";
  return "🔴";
}

function buildCatalogAction(
  originalQuery: string,
  searchQuery: string,
  searchType: CatalogSearchType
): CatalogIntentAction {
  const queryForUrl = searchQuery.trim();
  const url = queryForUrl
    ? `${OFFICIAL_CATALOG_URL}#query=${encodeURIComponent(queryForUrl)}`
    : OFFICIAL_CATALOG_URL;
  return {
    type: "catalog",
    title: "Пошук у каталозі ХДАК",
    description:
      "Виконайте пошук в електронному каталозі за автором, назвою або темою.",
    searchType,
    searchQuery: queryForUrl || originalQuery.trim(),
    url,
    buttonLabel: "Шукати в каталозі",
  };
}

export function generateCatalogInstantAnswer(
  query: string,
  books: CatalogBook[] = REAL_CATALOG_BOOKS,
  options?: CatalogInstantAnswerOptions
): CatalogInstantAnswerResult {
  const normalized = normalizeCatalogSearchQuery(query);
  const normalizedTokens = normalized.split(" ").filter(Boolean);
  const matchedBooks = books.filter(book => {
    const title = normalizeCatalogSearchQuery(book.title);
    const author = normalizeCatalogSearchQuery(book.author);
    if (title.includes(normalized) || author.includes(normalized)) return true;
    const searchableTokens = `${title} ${author}`.split(" ").filter(Boolean);
    const searchableStems = searchableTokens.map(toStem).filter(Boolean);
    return normalizedTokens.some(token => {
      if (token.length < 4) return false;
      const tokenStem = toStem(token);
      return searchableStems.some(stem => stem.includes(tokenStem));
    });
  });
  const found = matchedBooks.length > 0;
  const firstBook = matchedBooks[0];
  const searchType = inferSearchType(normalized);
  const action = buildCatalogAction(
    query,
    found ? `${firstBook.author} ${firstBook.title}` : query,
    searchType
  );
  const smartChips = found
    ? ["🔍 Шукати в каталозі", "📖 Замовити книгу", "📞 Звʼязатися"]
    : ["🔍 Шукати в каталозі", "📞 Звʼязатися"];
  const answer = found
    ? `Знайдено ${matchedBooks.length} ${
        matchedBooks.length === 1 ? "книгу" : "книги"
      }: ${matchedBooks
        .map(
          book =>
            `${book.title} — ${book.author} (${toStatusBadge(book.status)} ${book.status})`
        )
        .join("; ")}.`
    : "За цим запитом у тестовому каталозі не знайдено книг. Відкрийте повний каталог або зверніться до бібліотеки.";
  const result: CatalogInstantAnswerResult = {
    found,
    books: matchedBooks,
    answer,
    links: [action.url, OFFICIAL_CATALOG_URL],
    action,
    smartChips,
    jsonSizeBytes: 0,
  };
  result.jsonSizeBytes = options?.skipJsonSize
    ? 0
    : Buffer.byteLength(JSON.stringify(result), "utf8");
  return result;
}

const _searchCache = new Map<string, CatalogInstantAnswerResult>();
const MAX_CACHE_SIZE = 100;

/**
 * LRU-style cached wrapper around generateCatalogInstantAnswer.
 * Uses REAL_CATALOG_BOOKS and evicts the oldest entry when the cache exceeds MAX_CACHE_SIZE.
 */
export function generateCatalogInstantAnswerCached(
  query: string
): CatalogInstantAnswerResult {
  const cacheKey = query.toLowerCase().trim();
  const cached = _searchCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const result = generateCatalogInstantAnswer(query, REAL_CATALOG_BOOKS);
  _searchCache.set(cacheKey, result);

  if (_searchCache.size > MAX_CACHE_SIZE) {
    const firstKey = _searchCache.keys().next().value;
    if (firstKey !== undefined) _searchCache.delete(firstKey);
  }

  return result;
}

/** Exposed for testing only — clears the search cache. */
export function _clearCatalogSearchCache(): void {
  _searchCache.clear();
}

export function generateInstantAnswerWithStatus(
  query: string,
  books: CatalogBook[] = REAL_CATALOG_BOOKS,
  options?: CatalogInstantAnswerOptions
) {
  const catalogResult = generateCatalogInstantAnswer(query, books, options);
  if (catalogResult.found) return catalogResult;
  return {
    ...catalogResult,
    answer:
      "Не знайдено збігів у швидкому каталозі. Використайте кнопку каталогу або зверніться до бібліотеки для уточнення запиту.",
  };
}
