import {
  findLibraryKnowledgeTopicInTopics,
  LIBRARY_KNOWLEDGE_TOPICS,
  normalizeLibraryKnowledgeQuery,
  type LibraryKnowledgeLanguage,
  type LibraryKnowledgeTopic,
} from "./libraryKnowledge";
import { OFFICIAL_CATALOG_URL } from "./catalogIntent";

export type KnowledgeFallback = {
  answer: string;
  links: string[];
  sourceBadge: "generated";
};

const FALLBACK_LINKS = [
  OFFICIAL_CATALOG_URL,
  "https://lib-hdak.in.ua/rules-library.html",
  "https://lib-hdak.in.ua/site-map.html",
];

function hasSoftKnowledgeSignal(query: string): boolean {
  const normalized = normalizeLibraryKnowledgeQuery(query);
  if (!normalized) return false;
  const tokens = normalized.split(" ").filter(Boolean);
  return (
    tokens.some(token =>
      ["бібліот", "каталог", "правил", "читач", "контакт", "ресурс"].some(
        seed => token.includes(seed)
      )
    ) || tokens.length >= 4
  );
}

export function buildKnowledgeAssistedFallback(
  query: string,
  language: LibraryKnowledgeLanguage,
  options?: { knowledgeTopics?: LibraryKnowledgeTopic[] }
): KnowledgeFallback | null {
  const knowledgeTopics =
    options?.knowledgeTopics?.filter(topic => topic.enabled !== false) ??
    LIBRARY_KNOWLEDGE_TOPICS;
  const topic = findLibraryKnowledgeTopicInTopics(query, knowledgeTopics);
  if (!topic && !hasSoftKnowledgeSignal(query)) {
    return null;
  }

  const title =
    language === "en"
      ? "Helpful reference answer"
      : language === "ru"
        ? "Справочный ответ"
        : "Довідкова відповідь";
  const baseText =
    topic?.shortFacts[0] ??
    (language === "en"
      ? "I prepared a short answer from official HDAK library pages."
      : language === "ru"
        ? "Я подготовил краткий ответ на основе официальных страниц библиотеки ХГАК."
        : "Я підготував коротку відповідь на основі офіційних сторінок бібліотеки ХДАК.");
  const guidance =
    language === "en"
      ? "If needed, clarify the request and I will narrow down the catalog/rules section."
      : language === "ru"
        ? "Если нужно, уточните запрос — я сужу ответ до нужного раздела каталога или правил."
        : "За потреби уточніть запит — я звужу відповідь до потрібного розділу каталогу або правил.";
  const links = topic?.sourceUrls?.length ? topic.sourceUrls : FALLBACK_LINKS;

  const linksHeading =
    language === "en"
      ? "Official links:"
      : language === "ru"
        ? "Официальные ссылки:"
        : "Офіційні посилання:";

  return {
    answer: `**${title}**\n\n${baseText}\n\n- ${guidance}\n\n${linksHeading}\n${links
      .map(link => `- ${link}`)
      .join("\n")}`,
    links,
    sourceBadge: "generated",
  };
}

export function buildSafeLlmUnavailableFallback(
  language: LibraryKnowledgeLanguage
): string {
  const headline =
    language === "en"
      ? "Temporary service issue"
      : language === "ru"
        ? "Временная проблема сервиса"
        : "Тимчасова проблема сервісу";
  const body =
    language === "en"
      ? "I cannot generate a full answer right now, but you can continue with official library resources below."
      : language === "ru"
        ? "Сейчас не удаётся сгенерировать полный ответ, но можно воспользоваться официальными ресурсами библиотеки ниже."
        : "Зараз не вдається згенерувати повну відповідь, але ви можете скористатися офіційними ресурсами бібліотеки нижче.";
  const prompt =
    language === "en"
      ? "Try asking: “Where is the electronic catalog?” or “What are the library rules?”"
      : language === "ru"
        ? "Попробуйте спросить: «Где электронный каталог?» или «Какие правила библиотеки?»"
        : "Спробуйте запитати: «Де електронний каталог?» або «Які правила користування бібліотекою?»";

  return `**${headline}**\n\n${body}\n\n${FALLBACK_LINKS.map(link => `- ${link}`).join("\n")}\n\n${prompt}`;
}
