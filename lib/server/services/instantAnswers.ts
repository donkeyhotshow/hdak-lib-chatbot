type SupportedLanguage = "uk" | "en";

type InstantAnswer = {
  intent: string;
  answer: string;
};

type InstantAnswerRule = {
  intent: string;
  match: (normalizedQuery: string) => boolean;
  answer: Record<SupportedLanguage, string>;
};

const OFFICIAL_LINKS = {
  home: "https://lib-hdak.in.ua/",
  catalog: "https://lib-hdak.in.ua/e-catalog.html",
  sitemap: "https://lib-hdak.in.ua/site-map.html",
  helpful: "https://lib-hdak.in.ua/helpful-links.html",
  scientific: "https://lib-hdak.in.ua/search-scientific-info.html",
  rules: "https://lib-hdak.in.ua/rules-library.html",
  readerCard: "https://lib-hdak.in.ua/project-unified-reader-card.html",
  contacts: "https://lib-hdak.in.ua/site-map.html",
};

export const QUICK_PROMPTS: Record<SupportedLanguage, string[]> = {
  uk: [
    "Як записатися до бібліотеки?",
    "Де електронний каталог?",
    "Які правила користування бібліотекою?",
    "Де контакти бібліотеки?",
    "Де карта сайту?",
  ],
  en: [
    "How to register for the library?",
    "Where is the electronic catalog?",
    "What are the library rules?",
    "Where can I find contacts?",
    "Where is the site map?",
  ],
};

function includesAll(query: string, tokens: string[]): boolean {
  return tokens.every(token => query.includes(token));
}

function includesAny(query: string, tokens: string[]): boolean {
  return tokens.some(token => query.includes(token));
}

export function normalizeInstantAnswerQuery(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const INSTANT_ANSWER_RULES: InstantAnswerRule[] = [
  {
    intent: "registration",
    match: query =>
      includesAny(query, [
        "як записатися",
        "як зареєструватися",
        "читацький квиток",
        "reader card",
        "register library",
      ]),
    answer: {
      uk: `**Як стати читачем бібліотеки ХДАК**\n\n1. Ознайомтеся з умовами оформлення читацького квитка.\n2. Підготуйте документ, що посвідчує особу.\n3. Уточніть деталі у бібліотекаря.\n\n• Єдиний читацький квиток: ${OFFICIAL_LINKS.readerCard}\n• Сайт бібліотеки: ${OFFICIAL_LINKS.home}`,
      en: `**How to get a library reader card**\n\n1. Check registration requirements.\n2. Prepare an identity document.\n3. Confirm details with a librarian.\n\n• Reader card page: ${OFFICIAL_LINKS.readerCard}\n• Library website: ${OFFICIAL_LINKS.home}`,
    },
  },
  {
    intent: "catalog",
    match: query =>
      includesAny(query, [
        "електронний каталог",
        "де каталог",
        "знайти книгу",
        "e catalog",
        "find book",
      ]),
    answer: {
      uk: `**Електронний каталог бібліотеки**\n\nШукати книги можна в офіційному е-каталозі:\n${OFFICIAL_LINKS.catalog}\n\nПорада: додайте автора або ключове слово для точнішого пошуку.`,
      en: `**Electronic catalog**\n\nUse the official e-catalog to find books:\n${OFFICIAL_LINKS.catalog}\n\nTip: add an author name or keywords for better results.`,
    },
  },
  {
    intent: "rules",
    match: query =>
      includesAny(query, [
        "правила бібліотеки",
        "правила користування",
        "library rules",
      ]),
    answer: {
      uk: `**Правила користування бібліотекою**\n\nОфіційні правила доступні на сторінці:\n${OFFICIAL_LINKS.rules}\n\nТам є порядок запису, користування фондами та терміни повернення.`,
      en: `**Library rules**\n\nOfficial usage rules are available here:\n${OFFICIAL_LINKS.rules}\n\nThe page includes registration, borrowing, and return terms.`,
    },
  },
  {
    intent: "contacts",
    match: query =>
      includesAny(query, [
        "контакти бібліотеки",
        "зв'язатися з бібліотекарем",
        "поставити запитання бібліотекарю",
        "contacts",
        "ask librarian",
      ]),
    answer: {
      uk: `**Контакти та звʼязок з бібліотекою**\n\n• Сайт бібліотеки: ${OFFICIAL_LINKS.home}\n• Розділи сайту (включно з контактами): ${OFFICIAL_LINKS.sitemap}\n\nТакож можна використати кнопку «Написати листа» під відповіддю.`,
      en: `**Library contacts**\n\n• Library website: ${OFFICIAL_LINKS.home}\n• Site map (including contacts pages): ${OFFICIAL_LINKS.sitemap}\n\nYou can also use the “Write to librarian” action button.`,
    },
  },
  {
    intent: "helpful-links",
    match: query =>
      includesAny(query, [
        "корисні посилання",
        "наукові ресурси",
        "scientific info",
        "helpful links",
      ]),
    answer: {
      uk: `**Корисні посилання та наукові ресурси**\n\n• Корисні посилання: ${OFFICIAL_LINKS.helpful}\n• Пошук наукової інформації: ${OFFICIAL_LINKS.scientific}`,
      en: `**Helpful links and scientific resources**\n\n• Helpful links: ${OFFICIAL_LINKS.helpful}\n• Scientific information search: ${OFFICIAL_LINKS.scientific}`,
    },
  },
  {
    intent: "site-navigation",
    match: query =>
      includesAny(query, [
        "де сайт бібліотеки",
        "де карта сайту",
        "сайт бібліотеки",
        "site map",
        "library website",
      ]) || includesAll(query, ["карта", "сайту"]),
    answer: {
      uk: `**Навігація сайтом бібліотеки ХДАК**\n\n• Головна сторінка: ${OFFICIAL_LINKS.home}\n• Карта сайту: ${OFFICIAL_LINKS.sitemap}`,
      en: `**HDAK library website navigation**\n\n• Main website: ${OFFICIAL_LINKS.home}\n• Site map: ${OFFICIAL_LINKS.sitemap}`,
    },
  },
];

export function getInstantAnswer(
  query: string,
  language: SupportedLanguage = "uk"
): InstantAnswer | null {
  const normalizedQuery = normalizeInstantAnswerQuery(query);
  if (!normalizedQuery) return null;

  const matchedRule = INSTANT_ANSWER_RULES.find(rule =>
    rule.match(normalizedQuery)
  );

  if (!matchedRule) return null;
  return {
    intent: matchedRule.intent,
    answer: matchedRule.answer[language],
  };
}
