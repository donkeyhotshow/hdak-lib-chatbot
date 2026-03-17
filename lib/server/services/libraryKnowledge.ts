import { OFFICIAL_CATALOG_URL } from "./catalogIntent";

export type LibraryKnowledgeTopic = {
  id: string;
  topic: string;
  title?: string;
  shortFacts: string[];
  policySnippets: string[];
  keywords: string[];
  sourceUrls: string[];
  sourceBadge: "quick" | "catalog" | "official-rule";
  suggestedFollowUps?: string[];
  enabled?: boolean;
  updatedAt?: string;
};

export type LibraryKnowledgeLanguage = "uk" | "en" | "ru";

export const LIBRARY_KNOWLEDGE_TOPICS: LibraryKnowledgeTopic[] = [
  {
    id: "signup-library",
    topic: "Запис до бібліотеки",
    shortFacts: [
      "Запис до бібліотеки здійснюється за офіційними правилами користування.",
      "Для оформлення доступна інформація про проєкт «Єдина картка читача».",
    ],
    policySnippets: [
      "Перед записом перевірте умови отримання читацького документа.",
      "За потреби зверніться до бібліотекаря для уточнення процедури.",
    ],
    keywords: [
      "як записатися до бібліотеки",
      "записатися до бібліотеки",
      "як зареєструватися в бібліотеці",
      "реєстрація в бібліотеці",
      "читач бібліотеки",
    ],
    sourceUrls: [
      "https://lib-hdak.in.ua/project-unified-reader-card.html",
      "https://lib-hdak.in.ua/rules-library.html",
    ],
    sourceBadge: "official-rule",
  },
  {
    id: "reader-card",
    topic: "Єдина картка читача",
    shortFacts: [
      "Проєкт «Єдина картка читача» пояснює умови оформлення читацького документа.",
    ],
    policySnippets: [
      "Ознайомтеся з умовами оформлення та використання картки читача.",
    ],
    keywords: [
      "єдина картка читача",
      "читацький квиток",
      "картка читача",
      "як отримати читацький квиток",
    ],
    sourceUrls: ["https://lib-hdak.in.ua/project-unified-reader-card.html"],
    sourceBadge: "official-rule",
  },
  {
    id: "library-rules",
    topic: "Правила користування бібліотекою",
    shortFacts: [
      "Офіційні правила користування бібліотекою опубліковані на окремій сторінці.",
    ],
    policySnippets: [
      "Перевіряйте права та обов’язки користувача перед використанням сервісів.",
    ],
    keywords: [
      "правила бібліотеки",
      "правила користування бібліотекою",
      "як користуватися бібліотекою",
      "умови користування бібліотекою",
    ],
    sourceUrls: ["https://lib-hdak.in.ua/rules-library.html"],
    sourceBadge: "official-rule",
  },
  {
    id: "reading-room-rules",
    topic: "Правила е-читальної зали",
    shortFacts: [
      "Для електронної читальної зали діють окремі правила користування.",
    ],
    policySnippets: [
      "Перед роботою з е-ресурсами перевірте обмеження доступу та використання.",
    ],
    keywords: [
      "правила е-читальної зали",
      "електронна читальна зала",
      "е-читальна зала",
      "правила читальної зали",
    ],
    sourceUrls: ["https://lib-hdak.in.ua/rules-library-e-reading-room.html"],
    sourceBadge: "official-rule",
  },
  {
    id: "catalog",
    topic: "Електронний каталог",
    shortFacts: [
      "Електронний каталог ХДАК доступний на офіційному сайті бібліотеки.",
      "Пошук у каталозі можливий за автором, назвою або темою.",
    ],
    policySnippets: [
      "Якщо точний критерій невідомий, починайте з загального пошуку в каталозі.",
    ],
    keywords: [
      "де електронний каталог",
      "електронний каталог",
      "каталог бібліотеки",
      "пошук у каталозі",
      "пошук книги",
    ],
    sourceUrls: [OFFICIAL_CATALOG_URL, "https://lib-hdak.in.ua/site-map.html"],
    sourceBadge: "catalog",
  },
  {
    id: "find-book",
    topic: "Як знайти книгу",
    shortFacts: [
      "Найзручніше шукати книгу через електронний каталог.",
      "Для кращої точності уточнюйте запит за автором, назвою або темою.",
    ],
    policySnippets: [
      "Починайте з ключових слів, далі деталізуйте запит конкретними даними.",
    ],
    keywords: [
      "як знайти книгу",
      "знайти книгу",
      "як шукати книгу",
      "книги з теми",
      "знайти автора",
      "пошук за автором",
      "пошук за назвою",
    ],
    sourceUrls: [OFFICIAL_CATALOG_URL],
    sourceBadge: "catalog",
  },
  {
    id: "contacts",
    topic: "Контакти бібліотеки",
    shortFacts: ["Контакти бібліотеки розміщені на офіційному сайті."],
    policySnippets: ["Для актуальних контактів перевіряйте офіційні сторінки."],
    keywords: [
      "контакти бібліотеки",
      "адреса бібліотеки",
      "email бібліотеки",
      "як зв'язатися з бібліотекою",
    ],
    sourceUrls: [
      "https://lib-hdak.in.ua/",
      "https://lib-hdak.in.ua/site-map.html",
    ],
    sourceBadge: "quick",
  },
  {
    id: "ask-librarian",
    topic: "Звернення до бібліотекаря",
    shortFacts: [
      "Питання бібліотекарю можна поставити через офіційні контакти бібліотеки.",
    ],
    policySnippets: [
      "Уточнюйте деталі доступу до ресурсів напряму у бібліотекаря.",
    ],
    keywords: [
      "звернення до бібліотекаря",
      "як звернутися до бібліотекаря",
      "поставити запитання бібліотекарю",
    ],
    sourceUrls: ["https://lib-hdak.in.ua/"],
    sourceBadge: "official-rule",
  },
  {
    id: "scientific-resources",
    topic: "Наукові ресурси",
    shortFacts: [
      "Сторінки наукової інформації та корисних посилань містять доступні бази даних.",
    ],
    policySnippets: ["Умови доступу до конкретних баз можуть відрізнятися."],
    keywords: [
      "наукові ресурси",
      "де scopus",
      "де web of science",
      "де корисні посилання",
    ],
    sourceUrls: [
      "https://lib-hdak.in.ua/search-scientific-info.html",
      "https://lib-hdak.in.ua/helpful-links.html",
    ],
    sourceBadge: "quick",
  },
  {
    id: "vpn-access",
    topic: "VPN / корпоративний доступ",
    shortFacts: [
      "Частина міжнародних баз може потребувати корпоративний доступ або VPN.",
    ],
    policySnippets: [
      "Перед підключенням перевіряйте умови доступу на сторінках наукових ресурсів.",
    ],
    keywords: [
      "чи потрібен vpn",
      "корпоративний доступ",
      "доступ до баз даних",
    ],
    sourceUrls: [
      "https://lib-hdak.in.ua/search-scientific-info.html",
      "https://lib-hdak.in.ua/helpful-links.html",
    ],
    sourceBadge: "official-rule",
  },
  {
    id: "site-map",
    topic: "Карта сайту",
    shortFacts: [
      "Карта сайту допомагає знайти офіційні сторінки каталогу, правил і ресурсів.",
    ],
    policySnippets: [
      "Використовуйте карту сайту як універсальну точку навігації бібліотекою.",
    ],
    keywords: [
      "карта сайту",
      "де карта сайту",
      "структура сайту",
      "розділи сайту бібліотеки",
    ],
    sourceUrls: ["https://lib-hdak.in.ua/site-map.html"],
    sourceBadge: "quick",
  },
];

export function normalizeLibraryKnowledgeQuery(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function findLibraryKnowledgeTopic(
  query: string
): LibraryKnowledgeTopic | null {
  return findLibraryKnowledgeTopicInTopics(query, LIBRARY_KNOWLEDGE_TOPICS);
}

export function findLibraryKnowledgeTopicInTopics(
  query: string,
  topics: LibraryKnowledgeTopic[]
): LibraryKnowledgeTopic | null {
  const normalizedQuery = normalizeLibraryKnowledgeQuery(query);
  if (!normalizedQuery) return null;

  return (
    topics.find(
      topic =>
        topic.enabled !== false &&
        topic.keywords.some(keyword =>
          normalizedQuery.includes(normalizeLibraryKnowledgeQuery(keyword))
        )
    ) ?? null
  );
}

export function buildLibraryKnowledgeContext(
  query: string,
  language: LibraryKnowledgeLanguage,
  topics: LibraryKnowledgeTopic[] = LIBRARY_KNOWLEDGE_TOPICS
): string | null {
  return buildLibraryKnowledgeContextFromTopics(query, language, topics);
}

export function buildLibraryKnowledgeContextFromTopics(
  query: string,
  language: LibraryKnowledgeLanguage,
  topics: LibraryKnowledgeTopic[]
): string | null {
  const topic = findLibraryKnowledgeTopicInTopics(query, topics);
  if (!topic) return null;

  const facts = topic.shortFacts.map(fact => `- ${fact}`).join("\n");
  const snippets = topic.policySnippets
    .map(snippet => `- ${snippet}`)
    .join("\n");
  const sources = topic.sourceUrls.map(url => `- ${url}`).join("\n");

  const header =
    language === "en"
      ? "Knowledge-backed library context"
      : language === "ru"
        ? "Справочный контекст библиотеки"
        : "Довідковий контекст бібліотеки";
  const closingInstruction =
    language === "en"
      ? "Use this context as authoritative and prefer official links only."
      : language === "ru"
        ? "Используйте этот контекст как авторитетный и отдавайте приоритет только официальным ссылкам."
        : "Використовуйте цей контекст як авторитетний і надавайте пріоритет лише офіційним посиланням.";

  return `${header} (${topic.topic}):\nFacts:\n${facts}\nPolicy snippets:\n${snippets}\nSources:\n${sources}\n${closingInstruction}`;
}
