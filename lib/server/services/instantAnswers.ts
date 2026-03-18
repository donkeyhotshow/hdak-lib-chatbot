import {
  getCatalogIntentAction,
  OFFICIAL_CATALOG_URL,
  type CatalogIntentAction,
} from "./catalogIntent";
import {
  LIBRARY_KNOWLEDGE_TOPICS,
  findLibraryKnowledgeTopicInTopics,
  type LibraryKnowledgeTopic,
} from "./libraryKnowledge";

export type InstantAnswerLanguage = "uk" | "en" | "ru";

export type LibraryFaqEntry = {
  id: string;
  keywords: string[];
  title: string;
  answer: string;
  bullets: string[];
  links: string[];
  sourceBadge: "quick" | "catalog" | "official-rule";
};

export type InstantAnswer = {
  intent: string;
  title: string;
  answer: string;
  links: string[];
  suggestedFollowUps?: string[];
  action?: CatalogIntentAction;
  sourceBadge?: "quick" | "catalog" | "official-rule";
};

const MAX_FAQ_BULLETS = 2;

function toFaqEntry(topic: LibraryKnowledgeTopic): LibraryFaqEntry {
  const answerSentences = topic.shortFacts.slice(0, 2);
  const bulletCandidates = [
    ...topic.shortFacts.slice(2),
    ...topic.policySnippets,
  ];
  return {
    id: topic.id,
    keywords: topic.keywords,
    title: topic.title ?? topic.topic,
    answer: answerSentences.join(" ") || topic.topic,
    bullets: bulletCandidates.slice(0, MAX_FAQ_BULLETS),
    links: topic.sourceUrls,
    sourceBadge: topic.sourceBadge,
  };
}

export const LIBRARY_FAQ: LibraryFaqEntry[] =
  LIBRARY_KNOWLEDGE_TOPICS.map(toFaqEntry);

export const SUGGESTED_PROMPTS = [
  "Як записатися до бібліотеки?",
  "Де електронний каталог?",
  "Які правила користування бібліотекою?",
  "Які правила е-читальної зали?",
  "Де контакти бібліотеки?",
  "Де знайти наукові ресурси?",
];

export const QUICK_PROMPTS: Record<"uk" | "en", string[]> = {
  uk: SUGGESTED_PROMPTS,
  en: [
    "How to register for the library?",
    "Where is the electronic catalog?",
    "What are the library rules?",
    "What are e-reading room rules?",
    "Where can I find contacts?",
    "Where can I find scientific resources?",
  ],
};

export function normalizeInstantAnswerQuery(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toSourceLabel(language: InstantAnswerLanguage): string {
  if (language === "en") return "Official source";
  if (language === "ru") return "Официальный источник";
  return "Офіційне джерело";
}

function formatFaqAnswer(
  faq: LibraryFaqEntry,
  language: InstantAnswerLanguage
): string {
  const bulletList = faq.bullets.map(item => `- ${item}`).join("\n");
  const links = faq.links.map(link => `- ${link}`).join("\n");
  return `**${faq.title}**\n\n${faq.answer}\n\n${bulletList}\n\n${toSourceLabel(language)}:\n${links}`;
}

function formatCatalogIntentAnswer(
  action: CatalogIntentAction,
  language: InstantAnswerLanguage
): string {
  if (language === "en") {
    const queryHint = action.searchQuery
      ? `Search query: **${action.searchQuery}**.`
      : "If needed, enter an author, title, or subject in the search field.";
    return `**${action.title}**\n\n${action.description}\n\n- You can search by author, title, or subject.\n- ${queryHint}\n- For better precision, refine the query with keywords.\n\nOfficial source:\n- ${OFFICIAL_CATALOG_URL}`;
  }

  if (language === "ru") {
    const queryHint = action.searchQuery
      ? `Поисковый запрос: **${action.searchQuery}**.`
      : "При необходимости введите автора, название или тему в поле поиска.";
    return `**${action.title}**\n\n${action.description}\n\n- В каталоге можно искать по автору, названию или теме.\n- ${queryHint}\n- Для точности уточняйте запрос ключевыми словами.\n\nОфициальный источник:\n- ${OFFICIAL_CATALOG_URL}`;
  }

  const queryHint = action.searchQuery
    ? `Пошуковий запит: **${action.searchQuery}**.`
    : "За потреби введіть автора, назву або тему у полі пошуку.";
  return `**${action.title}**\n\n${action.description}\n\n- Шукати можна за автором, назвою або темою.\n- ${queryHint}\n- Якщо потрібна точність — уточніть запит ключовими словами.\n\nОфіційне джерело:\n- ${OFFICIAL_CATALOG_URL}`;
}

function findMatchingFaq(
  normalizedQuery: string,
  knowledgeTopics: LibraryKnowledgeTopic[]
): LibraryFaqEntry | null {
  const topic = findLibraryKnowledgeTopicInTopics(
    normalizedQuery,
    knowledgeTopics
  );
  return topic ? toFaqEntry(topic) : null;
}

export function getInstantAnswer(
  query: string,
  language: InstantAnswerLanguage = "uk",
  options?: { knowledgeTopics?: LibraryKnowledgeTopic[] }
): InstantAnswer | null {
  const normalizedQuery = normalizeInstantAnswerQuery(query);
  if (!normalizedQuery) return null;
  const knowledgeTopics =
    options?.knowledgeTopics?.filter(topic => topic.enabled !== false) ??
    LIBRARY_KNOWLEDGE_TOPICS;
  const catalogAction = getCatalogIntentAction(
    query,
    language === "en" ? "en" : "uk"
  );
  if (catalogAction && catalogAction.searchType !== "generic") {
    return {
      intent: "catalog-intent",
      title: catalogAction.title,
      answer: formatCatalogIntentAnswer(catalogAction, language),
      links: [OFFICIAL_CATALOG_URL],
      action: catalogAction,
      sourceBadge: "catalog",
    };
  }

  const faq = findMatchingFaq(normalizedQuery, knowledgeTopics);
  const matchedTopic = findLibraryKnowledgeTopicInTopics(
    normalizedQuery,
    knowledgeTopics
  );
  if (faq) {
    return {
      intent: faq.id,
      title: faq.title,
      answer: formatFaqAnswer(faq, language),
      links: faq.links,
      suggestedFollowUps: matchedTopic?.suggestedFollowUps ?? [],
      sourceBadge: faq.sourceBadge,
      action:
        faq.id === "catalog" || faq.id === "find-book"
          ? (catalogAction ?? undefined)
          : undefined,
    };
  }

  if (!catalogAction) return null;

  return {
    intent: "catalog-intent",
    title: catalogAction.title,
    answer: formatCatalogIntentAnswer(catalogAction, language),
    links: [OFFICIAL_CATALOG_URL],
    action: catalogAction,
    sourceBadge: "catalog",
  };
}
