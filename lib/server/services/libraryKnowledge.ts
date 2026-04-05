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
    title: "Як записатися до бібліотеки?",
    shortFacts: [
      "Єдиний читацький квиток діє з 1966 року для викладачів, студентів, аспірантів і співробітників.",
      "Після реєстрації доступні абонемент, читальна зала та електронна читальна зала.",
    ],
    policySnippets: [
      "Перед оформленням перевірте правила користування та умови проєкту «Єдина картка читача».",
    ],
    keywords: [
      "як записатися до бібліотеки",
      "записатися до бібліотеки",
      "як зареєструватися в бібліотеці",
      "реєстрація в бібліотеці",
      "читач бібліотеки",
      "как записаться в библиотеку",
      "записаться в библиотеку",
      "как зарегистрироваться в библиотеке",
      "регистрация в библиотеке",
      "how to register for the library",
      "register library",
      "library registration",
    ],
    sourceUrls: [
      "https://lib-hdak.in.ua/project-unified-reader-card.html",
      "https://lib-hdak.in.ua/rules-library.html",
    ],
    sourceBadge: "official-rule",
    suggestedFollowUps: [
      "Які правила користування бібліотекою?",
      "Де контакти бібліотеки?",
    ],
  },
  {
    id: "reader-card",
    topic: "Єдина картка читача",
    title: "Що таке єдина картка читача?",
    shortFacts: [
      "Єдина картка читача використовується в бібліотеці з 1966 року.",
      "Картка відкриває доступ до всіх відділів: абонементу, читальних зал і профільних кабінетів.",
    ],
    policySnippets: [
      "Умови оформлення та обслуговування описані у матеріалах проєкту.",
    ],
    keywords: [
      "єдина картка читача",
      "читацький квиток",
      "картка читача",
      "як отримати читацький квиток",
      "единый читательский билет",
      "читательский билет",
      "как получить читательский билет",
      "unified reader card",
      "reader card",
    ],
    sourceUrls: ["https://lib-hdak.in.ua/project-unified-reader-card.html"],
    sourceBadge: "official-rule",
    suggestedFollowUps: [
      "Як записатися до бібліотеки?",
      "Які правила користування бібліотекою?",
    ],
  },
  {
    id: "library-rules",
    topic: "Правила користування бібліотекою",
    title: "Які правила користування бібліотекою?",
    shortFacts: [
      "Користувачі працюють через абонемент наукової літератури, читальну залу та електронну читальну залу.",
      "Групова видача підручників у бібліотеці організована з 1979 року.",
    ],
    policySnippets: [
      "Перед користуванням сервісами перевірте права та обовʼязки читача у чинних правилах.",
    ],
    keywords: [
      "правила бібліотеки",
      "правила користування бібліотекою",
      "як користуватися бібліотекою",
      "умови користування бібліотекою",
      "правила библиотеки",
      "правила пользования библиотекой",
      "как пользоваться библиотекой",
      "library rules",
      "library usage rules",
      "how to use the library",
    ],
    sourceUrls: ["https://lib-hdak.in.ua/rules-library.html"],
    sourceBadge: "official-rule",
    suggestedFollowUps: [
      "Які правила е-читальної зали?",
      "Де контакти бібліотеки?",
    ],
  },
  {
    id: "reading-room-rules",
    topic: "Е-читальна зала",
    title: "Що доступно в е-читальній залі?",
    shortFacts: [
      "Функції е-читальної зали виконує сектор автоматизації бібліотечних процесів.",
      "У системі АБІС «УФД / Бібліотека» зафіксовано 303 552 бібліографічні записи станом на 01.01.2025.",
    ],
    policySnippets: [
      "Перед роботою з електронними ресурсами перевірте правила е-читальної зали та режим доступу.",
    ],
    keywords: [
      "правила е-читальної зали",
      "електронна читальна зала",
      "е-читальна зала",
      "правила читальної зали",
      "що таке е читальна зала",
      "правила электронного читального зала",
      "электронный читальный зал",
      "e-reading room rules",
      "electronic reading room",
    ],
    sourceUrls: ["https://lib-hdak.in.ua/rules-library-e-reading-room.html"],
    sourceBadge: "official-rule",
    suggestedFollowUps: [
      "Де електронний каталог?",
      "Де знайти наукові ресурси?",
    ],
  },
  {
    id: "catalog",
    topic: "Електронний каталог",
    title: "Де електронний каталог ХДАК?",
    shortFacts: [
      "Електронний каталог працює на АБІС «УФД / Бібліотека» і містить 303 552 записи.",
      "У каталозі можна шукати за автором, назвою, темою та ключовими словами.",
    ],
    policySnippets: [
      "Якщо немає точних даних, починайте із загального запиту і поступово уточнюйте критерії.",
    ],
    keywords: [
      "де електронний каталог",
      "електронний каталог",
      "каталог бібліотеки",
      "пошук у каталозі",
      "пошук книги",
      "где электронный каталог",
      "электронный каталог",
      "каталог библиотеки",
      "поиск в каталоге",
      "where is the electronic catalog",
      "library catalog",
      "electronic catalog",
    ],
    sourceUrls: [OFFICIAL_CATALOG_URL, "https://lib-hdak.in.ua/site-map.html"],
    sourceBadge: "catalog",
    suggestedFollowUps: ["Як знайти книгу?", "Як шукати книги за автором?"],
  },
  {
    id: "find-book",
    topic: "Як знайти книгу",
    title: "Як знайти книгу в бібліотеці ХДАК?",
    shortFacts: [
      "Для пошуку використовуйте алфавітний, систематичний і топографічний каталоги, а також картотеки статей.",
      "Електронний каталог ведеться з 2008 року і дає змогу швидко знайти видання за автором, назвою або темою.",
    ],
    policySnippets: [
      "Починайте з ключових слів, а далі уточнюйте запит прізвищем автора або точною назвою.",
    ],
    keywords: [
      "як знайти книгу",
      "знайти книгу",
      "як шукати книгу",
      "книги з теми",
      "знайти автора",
      "пошук за автором",
      "пошук за назвою",
      "как найти книгу",
      "найти книгу",
      "поиск по автору",
      "поиск по названию",
      "how to find a book",
      "find a book",
      "search by author",
    ],
    sourceUrls: [OFFICIAL_CATALOG_URL],
    sourceBadge: "catalog",
    suggestedFollowUps: [
      "Де електронний каталог?",
      "Як шукати книги за темою?",
    ],
  },
  {
    id: "contacts",
    topic: "Контакти бібліотеки",
    title: "Які контакти бібліотеки ХДАК?",
    shortFacts: [
      "Адреса бібліотеки: Бурсацький узвіз, 4, Харків.",
      "Для консультацій використовуйте телефон (057) 731-27-83, Viber +380661458484 або email library@hdak.edu.ua.",
    ],
    policySnippets: [
      "Для офіційних звернень перевіряйте актуальні канали зв’язку на сайті бібліотеки.",
    ],
    keywords: [
      "контакти бібліотеки",
      "адреса бібліотеки",
      "email бібліотеки",
      "як зв'язатися з бібліотекою",
      "телефон бібліотеки",
      "контакты библиотеки",
      "адрес библиотеки",
      "как связаться с библиотекой",
      "телефон библиотеки",
      "library contacts",
      "library address",
      "library phone",
      "how to contact the library",
    ],
    sourceUrls: [
      "https://lib-hdak.in.ua/",
      "https://lib-hdak.in.ua/site-map.html",
    ],
    sourceBadge: "quick",
    suggestedFollowUps: ["Яка адреса ХДАК?", "Який графік роботи бібліотеки?"],
  },
  {
    id: "library-director",
    topic: "Директор бібліотеки",
    title: "Хто очолює бібліотеку ХДАК?",
    shortFacts: [
      "Бібліотеку очолює Кирпа Тетяна Олександрівна, директор з 2006 року.",
      "У структурі бібліотеки працюють напрямки наукометрії та автоматизації бібліотечних процесів.",
    ],
    policySnippets: [
      "З організаційних питань і довідок використовуйте офіційні контакти бібліотеки.",
    ],
    keywords: [
      "директор бібліотеки",
      "хто директор бібліотеки",
      "кирпа тетяна олександрівна",
    ],
    sourceUrls: ["https://lib-hdak.in.ua/"],
    sourceBadge: "quick",
    suggestedFollowUps: [
      "Яка структура бібліотеки?",
      "Які контакти бібліотеки?",
    ],
  },
  {
    id: "scientific-resources",
    topic: "Наукові ресурси",
    title: "Де знайти наукові ресурси?",
    shortFacts: [
      "Доступ до наукових ресурсів організовано відповідно до наказу МОН №269 про наукометричні бази.",
      "На сайті бібліотеки є блоки пошуку наукової інформації та бібліометричних сервісів НБУВ.",
    ],
    policySnippets: [
      "Для Scopus/WoS і суміжних платформ перевіряйте умови доступу для вашого типу облікового запису.",
    ],
    keywords: [
      "наукові ресурси",
      "де scopus",
      "де web of science",
      "де корисні посилання",
      "наукометрія",
      "научные ресурсы",
      "где scopus",
      "где web of science",
      "научная база данных",
      "scientific resources",
      "where is scopus",
      "research databases",
    ],
    sourceUrls: [
      "https://lib-hdak.in.ua/search-scientific-info.html",
      "https://lib-hdak.in.ua/helpful-links.html",
    ],
    sourceBadge: "quick",
    suggestedFollowUps: [
      "Чи потрібен VPN для доступу?",
      "Де корисні посилання бібліотеки?",
    ],
  },
  {
    id: "library-structure",
    topic: "Структура бібліотеки",
    title: "Яка структура бібліотеки ХДАК?",
    shortFacts: [
      "Основні напрями: відділ обслуговування, комплектування та інформаційно-бібліографічний супровід.",
      "Загальна площа бібліотеки становить 464 м².",
    ],
    policySnippets: [
      "Розподіл функцій між відділами допомагає обрати правильний канал звернення для вашого запиту.",
    ],
    keywords: [
      "структура бібліотеки",
      "відділи бібліотеки",
      "площа бібліотеки",
      "які відділи бібліотеки",
    ],
    sourceUrls: [
      "https://lib-hdak.in.ua/",
      "https://lib-hdak.in.ua/site-map.html",
    ],
    sourceBadge: "quick",
    suggestedFollowUps: ["Який фонд бібліотеки?", "Які контакти бібліотеки?"],
  },
  {
    id: "library-collection",
    topic: "Фонд бібліотеки",
    title: "Який обсяг фонду бібліотеки?",
    shortFacts: [
      "В електронному каталозі бібліотеки обліковується 303 552 записи.",
      "Безінвентарний облік фонду впроваджено з 1974 року.",
    ],
    policySnippets: [
      "Для уточнення наявності конкретного видання перевіряйте картку документа в е-каталозі.",
    ],
    keywords: [
      "фонд бібліотеки",
      "скільки книг у бібліотеці",
      "обсяг фонду",
      "безінвентарний облік",
    ],
    sourceUrls: [OFFICIAL_CATALOG_URL],
    sourceBadge: "quick",
    suggestedFollowUps: ["Як знайти книгу?", "Де електронний каталог?"],
  },
  {
    id: "library-history",
    topic: "Історія бібліотеки",
    title: "Яка історія бібліотеки ХДАК?",
    shortFacts: [
      "Бібліотеку засновано у 1966 році разом із розвитком академії.",
      "Єдиний читацький квиток запроваджено з перших років роботи.",
    ],
    policySnippets: [
      "Історичні довідки та актуальні оголошення публікуються на офіційному сайті бібліотеки.",
    ],
    keywords: [
      "історія бібліотеки",
      "коли заснована бібліотека",
      "рік заснування бібліотеки",
      "історія хдак бібліотеки",
    ],
    sourceUrls: [
      "https://lib-hdak.in.ua/",
      "https://lib-hdak.in.ua/project-unified-reader-card.html",
    ],
    sourceBadge: "quick",
    suggestedFollowUps: [
      "Що таке єдина картка читача?",
      "Яка структура бібліотеки?",
    ],
  },
  {
    id: "news-events",
    topic: "Новини та події",
    title: "Де дивитися новини бібліотеки?",
    shortFacts: [
      "Оголошення про події, сервіси та зміни графіка публікуються на головній сторінці бібліотеки.",
      "Для регулярних оновлень використовуйте головну сторінку та стрічку новин/RSS, якщо доступна.",
    ],
    policySnippets: [
      "Перед відвідуванням перевіряйте останні новини, щоб врахувати можливі зміни в роботі відділів.",
    ],
    keywords: [
      "новини бібліотеки",
      "події бібліотеки",
      "оголошення бібліотеки",
      "rss бібліотеки",
    ],
    sourceUrls: ["https://lib-hdak.in.ua/"],
    sourceBadge: "quick",
    suggestedFollowUps: [
      "Який графік роботи бібліотеки?",
      "Де карта сайту бібліотеки?",
    ],
  },
  {
    id: "documents",
    topic: "Документи бібліотеки",
    title: "Де знайти офіційні документи?",
    shortFacts: [
      "Правила користування, навігаційні матеріали та посилання на каталоги розміщені на офіційних сторінках бібліотеки.",
      "Документи варто завантажувати лише з перевірених розділів сайту ХДАК.",
    ],
    policySnippets: [
      "Для актуальної версії документів перевіряйте дату оновлення сторінки перед використанням.",
    ],
    keywords: [
      "документи бібліотеки",
      "правила та документи",
      "завантажити правила бібліотеки",
      "офіційні документи хдак",
    ],
    sourceUrls: [
      "https://lib-hdak.in.ua/rules-library.html",
      "https://lib-hdak.in.ua/site-map.html",
    ],
    sourceBadge: "official-rule",
    suggestedFollowUps: [
      "Які правила користування бібліотекою?",
      "Де карта сайту бібліотеки?",
    ],
  },
  {
    id: "vpn-access",
    topic: "VPN / корпоративний доступ",
    title: "Чи потрібен VPN для наукових баз?",
    shortFacts: [
      "Для частини ресурсів (зокрема Scopus/WoS) потрібен корпоративний доступ через мережу академії.",
      "Тип доступу залежить від умов постачальника бази та налаштувань закладу.",
    ],
    policySnippets: [
      "Перед підключенням перевіряйте інструкції на сторінці наукових ресурсів або звертайтеся до бібліотеки.",
    ],
    keywords: [
      "чи потрібен vpn",
      "корпоративний доступ",
      "доступ до баз даних",
      "vpn для scopus",
    ],
    sourceUrls: [
      "https://lib-hdak.in.ua/search-scientific-info.html",
      "https://lib-hdak.in.ua/helpful-links.html",
    ],
    sourceBadge: "official-rule",
    suggestedFollowUps: [
      "Де знайти наукові ресурси?",
      "Які контакти бібліотеки?",
    ],
  },
  {
    id: "helpful-links",
    topic: "Корисні посилання",
    title: "Де корисні посилання бібліотеки?",
    shortFacts: [
      "На сторінці корисних посилань зібрані електронні ресурси, бази даних і сервіси наукометрії.",
      "Це найшвидший спосіб перейти до зовнішніх платформ з офіційної навігації бібліотеки.",
    ],
    policySnippets: [
      "Для безпеки використовуйте переходи лише з офіційної сторінки бібліотеки.",
    ],
    keywords: [
      "корисні посилання",
      "електронні ресурси",
      "бази даних бібліотеки",
      "де корисні посилання",
    ],
    sourceUrls: ["https://lib-hdak.in.ua/helpful-links.html"],
    sourceBadge: "quick",
    suggestedFollowUps: [
      "Де знайти наукові ресурси?",
      "Чи потрібен VPN для доступу?",
    ],
  },
  {
    id: "site-map",
    topic: "Карта сайту",
    title: "Де карта сайту бібліотеки?",
    shortFacts: [
      "Карта сайту веде за маршрутом: Головна → Каталог → Правила → Контакти → Ресурси.",
      "Через карту сайту зручно швидко перейти в потрібний розділ без повторного пошуку.",
    ],
    policySnippets: [
      "Використовуйте карту сайту як стартову точку, якщо не знаєте, в якому розділі шукати інформацію.",
    ],
    keywords: [
      "карта сайту",
      "де карта сайту",
      "структура сайту",
      "розділи сайту бібліотеки",
      "навігація сайтом бібліотеки",
    ],
    sourceUrls: ["https://lib-hdak.in.ua/site-map.html"],
    sourceBadge: "quick",
    suggestedFollowUps: ["Де електронний каталог?", "Де контакти бібліотеки?"],
  },
  {
    id: "library-projects",
    topic: "Проєкти бібліотеки",
    title: "Які проєкти веде бібліотека?",
    shortFacts: [
      "Серед ключових напрямів: проєкт «Єдина картка читача», автоматизація бібліотечних процесів і підтримка наукометрії.",
      "Проєктні напрямки повʼязані з доступом до електронних ресурсів та якістю обслуговування читачів.",
    ],
    policySnippets: [
      "Для деталей щодо окремого напряму перевіряйте тематичні сторінки та офіційні оголошення.",
    ],
    keywords: [
      "проєкти бібліотеки",
      "єдина картка читача проєкт",
      "автоматизація бібліотеки",
      "наукометрія хдак",
    ],
    sourceUrls: [
      "https://lib-hdak.in.ua/project-unified-reader-card.html",
      "https://lib-hdak.in.ua/",
    ],
    sourceBadge: "quick",
    suggestedFollowUps: [
      "Що таке єдина картка читача?",
      "Де знайти наукові ресурси?",
    ],
  },
  {
    id: "working-hours",
    topic: "Робочий час",
    title: "Який графік роботи бібліотеки?",
    shortFacts: [
      "Бібліотека працює у будні дні (понеділок–пʼятниця) у стандартні академічні години.",
      "Точний режим окремих відділів може змінюватися під час канікул, сесій або свят.",
    ],
    policySnippets: [
      "Перед візитом перевіряйте актуальний графік на офіційному сайті або уточнюйте телефоном.",
    ],
    keywords: [
      "графік роботи бібліотеки",
      "робочий час бібліотеки",
      "коли працює бібліотека",
      "режим роботи бібліотеки",
      "график работы библиотеки",
      "когда работает библиотека",
      "режим работы библиотеки",
      "library hours",
      "library working hours",
      "when does the library open",
    ],
    sourceUrls: ["https://lib-hdak.in.ua/"],
    sourceBadge: "quick",
    suggestedFollowUps: ["Які контакти бібліотеки?", "Де новини бібліотеки?"],
  },
  {
    id: "hdak-address",
    topic: "Адреса ХДАК",
    title: "Яка адреса ХДАК?",
    shortFacts: [
      "Офіційна адреса ХДАК: Бурсацький узвіз, 4, Харків, 61057.",
      "Телефон академії: (057) 731-13-85; для бібліотеки використовуйте окремі контакти на сайті.",
    ],
    policySnippets: [
      "Для навігації до потрібного підрозділу перевіряйте контакти та схему розділів через сайт бібліотеки.",
    ],
    keywords: [
      "адреса хдак",
      "де знаходиться хдак",
      "телефон хдак",
      "бурсацький узвіз 4",
    ],
    sourceUrls: ["https://lib-hdak.in.ua/"],
    sourceBadge: "quick",
    suggestedFollowUps: [
      "Які контакти бібліотеки?",
      "Який графік роботи бібліотеки?",
    ],
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
