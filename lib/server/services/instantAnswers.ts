import {
  getCatalogIntentAction,
  OFFICIAL_CATALOG_URL,
  type CatalogIntentAction,
} from "./catalogIntent";

export type InstantAnswerLanguage = "uk" | "en" | "ru";

export type LibraryFaqEntry = {
  id: string;
  keywords: string[];
  title: string;
  answer: string;
  bullets: string[];
  links: string[];
};

export type InstantAnswer = {
  intent: string;
  title: string;
  answer: string;
  links: string[];
  action?: CatalogIntentAction;
};

export const LIBRARY_FAQ: LibraryFaqEntry[] = [
  {
    id: "signup-library",
    keywords: [
      "як записатися до бібліотеки",
      "записатися до бібліотеки",
      "як зареєструватися в бібліотеці",
      "реєстрація в бібліотеці",
      "читач бібліотеки",
    ],
    title: "Як записатися до бібліотеки?",
    answer:
      "Щоб записатися до бібліотеки, ознайомтеся з інформацією про проєкт «Єдина картка читача» та правилами користування бібліотекою.",
    bullets: [
      "Перегляньте сторінку проєкту «Єдина картка читача».",
      "Ознайомтеся з правилами користування бібліотекою.",
      "За потреби зверніться до бібліотеки через офіційні контакти.",
    ],
    links: [
      "https://lib-hdak.in.ua/project-unified-reader-card.html",
      "https://lib-hdak.in.ua/rules-library.html",
    ],
  },
  {
    id: "reader-card",
    keywords: [
      "єдина картка читача",
      "читацький квиток",
      "читательский билет",
      "картка читача",
      "як отримати читацький квиток",
    ],
    title: "Як отримати читацький квиток?",
    answer:
      "Інформація про оформлення читацького документа подана на сторінці проєкту «Єдина картка читача».",
    bullets: [
      "Відкрийте сторінку проєкту.",
      "Перевірте умови оформлення та використання.",
      "Уточніть деталі через контакти бібліотеки за потреби.",
    ],
    links: [
      "https://lib-hdak.in.ua/project-unified-reader-card.html",
      "https://lib-hdak.in.ua/",
    ],
  },
  {
    id: "library-rules",
    keywords: [
      "правила бібліотеки",
      "правила користування бібліотекою",
      "як користуватися бібліотекою",
      "умови користування бібліотекою",
    ],
    title: "Які правила користування бібліотекою?",
    answer:
      "Основні правила користування бібліотекою зібрані на окремій офіційній сторінці.",
    bullets: [
      "Перейдіть на сторінку правил бібліотеки.",
      "Перевірте права та обов’язки користувача.",
      "За потреби уточніть конкретний пункт у бібліотекаря.",
    ],
    links: ["https://lib-hdak.in.ua/rules-library.html"],
  },
  {
    id: "reading-room-rules",
    keywords: [
      "правила е-читальної зали",
      "електронна читальна зала",
      "е-читальна зала",
      "правила читальної зали",
    ],
    title: "Які правила е-читальної зали?",
    answer:
      "Правила користування електронною читальною залою винесені на окрему сторінку сайту бібліотеки.",
    bullets: [
      "Відкрийте сторінку правил е-читальної зали.",
      "Перевірте умови доступу до електронних ресурсів.",
      "Зверніть увагу на можливі обмеження використання.",
    ],
    links: ["https://lib-hdak.in.ua/rules-library-e-reading-room.html"],
  },
  {
    id: "catalog",
    keywords: [
      "де електронний каталог",
      "електронний каталог",
      "каталог бібліотеки",
      "знайти книгу",
      "пошук книги",
    ],
    title: "Де електронний каталог?",
    answer:
      "Електронний каталог бібліотеки доступний на окремій сторінці офіційного сайту.",
    bullets: [
      "Відкрийте сторінку електронного каталогу.",
      "Скористайтеся пошуком за автором, назвою або темою.",
      "Для ширшої навігації використайте карту сайту.",
    ],
    links: [
      "https://lib-hdak.in.ua/e-catalog.html",
      "https://lib-hdak.in.ua/site-map.html",
    ],
  },
  {
    id: "find-book",
    keywords: [
      "як знайти книгу",
      "знайти книгу",
      "як шукати книгу",
      "пошук у каталозі",
    ],
    title: "Як знайти книгу?",
    answer: "Найзручніше шукати книгу через електронний каталог бібліотеки.",
    bullets: [
      "Перейдіть в електронний каталог.",
      "Введіть автора, назву або тему.",
      "За потреби уточніть запит більш конкретними словами.",
    ],
    links: ["https://lib-hdak.in.ua/e-catalog.html"],
  },
  {
    id: "contacts",
    keywords: [
      "контакти бібліотеки",
      "адреса бібліотеки",
      "email бібліотеки",
      "як зв'язатися з бібліотекою",
      "як звернутися до бібліотекаря",
      "поставити запитання бібліотекарю",
    ],
    title: "Де контакти бібліотеки?",
    answer:
      "Контактну інформацію бібліотеки найкраще перевіряти на офіційному сайті.",
    bullets: [
      "Відкрийте головну сторінку бібліотеки.",
      "За потреби скористайтеся картою сайту.",
      "Уточніть потрібний розділ через навігацію сайту.",
    ],
    links: ["https://lib-hdak.in.ua/", "https://lib-hdak.in.ua/site-map.html"],
  },
  {
    id: "scientific-resources",
    keywords: [
      "наукові ресурси",
      "де scopus",
      "де web of science",
      "де science direct",
      "де springer",
      "де корисні посилання",
    ],
    title: "Де знайти наукові ресурси?",
    answer:
      "Наукові ресурси та корисні посилання зібрані на офіційних сторінках бібліотеки.",
    bullets: [
      "Перегляньте сторінку пошуку наукової інформації.",
      "Також відкрийте сторінку корисних посилань.",
      "Для окремих баз перевірте умови доступу.",
    ],
    links: [
      "https://lib-hdak.in.ua/search-scientific-info.html",
      "https://lib-hdak.in.ua/helpful-links.html",
    ],
  },
  {
    id: "vpn-access",
    keywords: [
      "чи потрібен vpn",
      "доступ до scopus",
      "доступ до web of science",
      "корпоративний доступ",
      "доступ до баз даних",
    ],
    title: "Чи потрібен VPN або корпоративний доступ?",
    answer:
      "Для частини міжнародних наукових баз доступ може бути обмежений корпоративною мережею або правилами установи.",
    bullets: [
      "Перевірте сторінку наукових ресурсів.",
      "Зверніть увагу на умови доступу до конкретної бази.",
      "За потреби уточніть деталі в бібліотеці.",
    ],
    links: [
      "https://lib-hdak.in.ua/search-scientific-info.html",
      "https://lib-hdak.in.ua/helpful-links.html",
    ],
  },
  {
    id: "site-map",
    keywords: [
      "карта сайту",
      "де карта сайту",
      "структура сайту",
      "розділи сайту бібліотеки",
    ],
    title: "Де карта сайту?",
    answer:
      "Карта сайту допоможе швидко знайти потрібний розділ бібліотеки, включно з правилами, каталогом та ресурсами.",
    bullets: [
      "Відкрийте карту сайту.",
      "Скористайтеся нею для переходу до потрібного розділу.",
      "Через карту сайту зручно шукати сторінки правил і ресурсів.",
    ],
    links: ["https://lib-hdak.in.ua/site-map.html"],
  },
];

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

function findMatchingFaq(normalizedQuery: string): LibraryFaqEntry | null {
  return (
    LIBRARY_FAQ.find(faq =>
      faq.keywords.some(keyword =>
        normalizedQuery.includes(normalizeInstantAnswerQuery(keyword))
      )
    ) ?? null
  );
}

export function getInstantAnswer(
  query: string,
  language: InstantAnswerLanguage = "uk"
): InstantAnswer | null {
  const normalizedQuery = normalizeInstantAnswerQuery(query);
  if (!normalizedQuery) return null;
  const catalogAction = getCatalogIntentAction(
    query,
    language === "en" ? "en" : "uk"
  );

  const faq = findMatchingFaq(normalizedQuery);
  if (faq) {
    return {
      intent: faq.id,
      title: faq.title,
      answer: formatFaqAnswer(faq, language),
      links: faq.links,
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
  };
}
