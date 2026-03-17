import { LIBRARY_KNOWLEDGE_TOPICS } from "./libraryKnowledge";

export type OfficialRetrievalChunk = {
  sourceId: string;
  sourceTitle: string;
  sourceUrl: string;
  content: string;
  score: number;
};

type OfficialRetrievalDocument = {
  id: string;
  title: string;
  url: string;
  keywords: string[];
  chunks: string[];
};

const OFFICIAL_HOST = "lib-hdak.in.ua";

const OFFICIAL_DOCUMENTS: OfficialRetrievalDocument[] = [
  {
    id: "rules-library",
    title: "Правила користування бібліотекою",
    url: "https://lib-hdak.in.ua/rules-library.html",
    keywords: ["правила", "користування", "обовязки", "читач", "бібліотека"],
    chunks: [
      "На сторінці правил користування описані базові права та обов'язки читачів бібліотеки.",
      "Перед використанням сервісів варто перевірити актуальні правила та обмеження.",
    ],
  },
  {
    id: "rules-e-reading-room",
    title: "Правила е-читальної зали",
    url: "https://lib-hdak.in.ua/rules-library-e-reading-room.html",
    keywords: ["е-читальна", "читальна", "зала", "електронна", "правила"],
    chunks: [
      "Е-читальна зала має окремі правила доступу та використання електронних ресурсів.",
      "Перед роботою з електронними джерелами рекомендується перевірити умови доступу.",
    ],
  },
  {
    id: "catalog",
    title: "Електронний каталог ХДАК",
    url: "https://lib-hdak.in.ua/e-catalog.html",
    keywords: ["каталог", "пошук", "книга", "автор", "назва", "тема"],
    chunks: [
      "Електронний каталог дозволяє шукати матеріали за автором, назвою або темою.",
      "Для точнішого результату варто уточнювати запит ключовими словами.",
    ],
  },
  {
    id: "scientific-info",
    title: "Пошук наукової інформації",
    url: "https://lib-hdak.in.ua/search-scientific-info.html",
    keywords: [
      "наукова",
      "інформація",
      "scopus",
      "web of science",
      "бази даних",
    ],
    chunks: [
      "На сторінці зібрані офіційні напрями пошуку наукової інформації та баз даних.",
      "Доступ до окремих міжнародних платформ може мати додаткові умови.",
    ],
  },
  {
    id: "helpful-links",
    title: "Корисні посилання бібліотеки",
    url: "https://lib-hdak.in.ua/helpful-links.html",
    keywords: ["корисні", "посилання", "ресурси", "бази", "доступ"],
    chunks: [
      "Розділ корисних посилань містить перевірені офіційні ресурси бібліотеки.",
      "Для навчання та досліджень використовуйте посилання з офіційних сторінок бібліотеки.",
    ],
  },
  {
    id: "site-map",
    title: "Карта сайту бібліотеки",
    url: "https://lib-hdak.in.ua/site-map.html",
    keywords: ["карта", "сайту", "розділи", "навігація", "де знайти"],
    chunks: [
      "Карта сайту допомагає швидко знайти розділи каталогу, правил і контактів.",
      "Якщо потрібен офіційний розділ бібліотеки, почніть з карти сайту.",
    ],
  },
].concat(
  LIBRARY_KNOWLEDGE_TOPICS.map(topic => ({
    id: `topic-${topic.id}`,
    title: topic.topic,
    url: topic.sourceUrls[0] ?? "https://lib-hdak.in.ua/",
    keywords: topic.keywords,
    chunks: [...topic.shortFacts, ...topic.policySnippets].slice(0, 3),
  }))
);

function normalizeForRetrieval(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string): string[] {
  const normalized = normalizeForRetrieval(value);
  if (!normalized) return [];
  return normalized.split(" ").filter(token => token.length >= 2);
}

function isOfficialUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === OFFICIAL_HOST;
  } catch {
    return false;
  }
}

function scoreChunk(queryTokens: string[], searchableText: string): number {
  if (queryTokens.length === 0) return 0;
  const normalized = normalizeForRetrieval(searchableText);
  let score = 0;
  for (const token of queryTokens) {
    if (normalized.includes(token)) score += 1;
  }
  return score;
}

export function retrieveOfficialLibraryChunks(
  query: string,
  options?: { limit?: number; minScore?: number }
): OfficialRetrievalChunk[] {
  const limit = options?.limit ?? 3;
  const minScore = options?.minScore ?? 2;
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const allChunks: OfficialRetrievalChunk[] = [];
  for (const doc of OFFICIAL_DOCUMENTS) {
    if (!isOfficialUrl(doc.url)) continue;
    for (const chunk of doc.chunks) {
      const searchable = [doc.title, ...doc.keywords, chunk].join(" ");
      const score = scoreChunk(queryTokens, searchable);
      if (score < minScore) continue;
      allChunks.push({
        sourceId: doc.id,
        sourceTitle: doc.title,
        sourceUrl: doc.url,
        content: chunk,
        score,
      });
    }
  }

  return allChunks.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function buildOfficialRetrievalContext(
  chunks: OfficialRetrievalChunk[]
): string | null {
  if (chunks.length === 0) return null;
  const lines = chunks.map(
    chunk =>
      `- ${chunk.content}\n  Джерело: ${chunk.sourceTitle} (${chunk.sourceUrl})`
  );
  return `## Офіційні матеріали бібліотеки (retrieval):\n${lines.join("\n")}`;
}
