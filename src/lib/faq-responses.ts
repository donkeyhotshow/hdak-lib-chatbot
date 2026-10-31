/**
 * Готові відповіді на часті запитання.
 * Симулюють відповідь LLM — без запиту до API.
 * Підтримує українську та англійську мови.
 */

import { LIBRARY, ALL_LINKS, isLibraryOpen } from "./constants";
import { FAQ_RESPONSES_EN, type FaqResponse } from "./faq-responses-en";

export type { FaqResponse };

function randomThink(min = 500, max = 900): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const FAQ_RESPONSES: Record<string, FaqResponse> = {
  // ─── Графік роботи ───────────────────────────────────────────
  "Який графік роботи бібліотеки?": {
    content: () =>
      [
        `Звісно, ось актуальний графік роботи бібліотеки ХДАК:`,
        ``,
        `| День | Години роботи |`,
        `|------|--------------|`,
        `| Понеділок – П'ятниця | **9:00 – 16:45** _(перерва 13:00–13:45)_ |`,
        `| Субота | **9:00 – 13:30** |`,
        `| Неділя | вихідний |`,
        ``,
        `> ⚠️ **Санітарний день** — остання п'ятниця кожного місяця _(абонементи не працюють)_`,
        ``,
        isLibraryOpen()
          ? `🟢 **Зараз бібліотека відкрита** — чекаємо на вас!`
          : `🔴 **Зараз бібліотека зачинена.** Завітайте в робочі години.`,
        ``,
        `📍 ${LIBRARY.addressUk}`,
        ``,
        `_Якщо маєте додаткові запитання — просто напишіть, я допоможу._`,
      ].join("\n"),
    thinkDelay: 0, // overridden by getFaqResponse() with randomThink()
    charsPerStep: 5,
    stepDelay: 12,
  },

  // ─── Як записатися ───────────────────────────────────────────
  "Як записатися до бібліотеки?": {
    content: [
      `Записатися до бібліотеки ХДАК дуже просто. Ось що потрібно:`,
      ``,
      `**Необхідні документи:**`,
      `- 🪪 Студентський квиток або паспорт`,
      `- 📷 Фото 3×4 см (1 штука)`,
      ``,
      `**Як проходить запис:**`,
      ``,
      `1. Зверніться до **абонементу** (корп. 1, 1-й поверх) або до **читального залу**`,
      `2. Заповніть **читацьку анкету** — це займе кілька хвилин`,
      `3. Отримайте **читацький квиток** — і ви вже читач бібліотеки`,
      ``,
      `> ⏱ Вся процедура займає **10–15 хвилин**.`,
      ``,
      `**Послуги бібліотеки — безкоштовні** для студентів, викладачів та співробітників ХДАК.`,
      ``,
      `---`,
      ``,
      `📞 Телефон: **${LIBRARY.phoneFull}**`,
      `📧 Email: **${LIBRARY.email}**`,
      ``,
      `_Якщо виникнуть питання — звертайтеся, я завжди поруч._`,
    ].join("\n"),
    thinkDelay: 0, // overridden by getFaqResponse() with randomThink()
    charsPerStep: 5,
    stepDelay: 12,
  },

  // ─── Пошук у каталозі ────────────────────────────────────────
  "Як знайти книгу в каталозі?": {
    content: [
      `Знайти потрібну книгу в нашому каталозі — легко. Ось кілька способів:`,
      ``,
      `**🖥️ Електронний каталог (основний спосіб):**`,
      ``,
      `1. Перейдіть на сторінку: [Електронний каталог](${ALL_LINKS.catalog_search})`,
      `2. Введіть **назву книги**, **прізвище автора** або **ключове слово**`,
      `3. Натисніть «Пошук» і оберіть потрібне видання зі списку`,
      ``,
      `> 💡 **Порада:** якщо не знаходите за назвою — спробуйте пошук за **прізвищем автора** або **темою**.`,
      ``,
      `**📱 Мобільний додаток:**`,
      `Зручний пошук прямо зі смартфона — [завантажити для Android](${ALL_LINKS.mobile_app}).`,
      ``,
      `**📚 Нові надходження:**`,
      `Хочете дізнатися, що з'явилося нещодавно? Перегляньте [нові надходження](${ALL_LINKS.new_books}).`,
      ``,
      `**📚 Наукові публікації:**`,
      `Для пошуку наукових праць викладачів ХДАК — [репозитарій](${ALL_LINKS.repository}).`,
      ``,
      `---`,
      ``,
      `_Якщо не можете знайти потрібну книгу — напишіть мені назву або тему, і я спробую допомогти._`,
    ].join("\n"),
    thinkDelay: 0, // overridden by getFaqResponse() with randomThink()
    charsPerStep: 5,
    stepDelay: 12,
  },

  // ─── Контакти ────────────────────────────────────────────────
  "Які контакти бібліотеки?": {
    content: [
      `Ось усі способи зв'язатися з бібліотекою ХДАК:`,
      ``,
      `**📍 Адреса:**`,
      `${LIBRARY.addressUk}`,
      `_(поруч зі ст. метро «Історичний музей»)_`,
      ``,
      `---`,
      ``,
      `**📞 Телефон:** [${LIBRARY.phoneFull}](tel:${LIBRARY.phoneFull.replace(/[\s()\-]/g, "")})`,
      ``,
      `**📧 Email:** [${LIBRARY.email}](mailto:${LIBRARY.email})`,
      ``,
      `**💬 Viber / Telegram:** [${LIBRARY.messenger}](https://t.me/+${LIBRARY.messenger.replace("+", "")})`,
      ``,
      `---`,
      ``,
      `**🌐 Соціальні мережі:**`,
      `- [Instagram](${LIBRARY.instagram}) — новини, анонси виставок та заходів`,
      `- [Facebook Messenger](${LIBRARY.facebook}) — швидкі запитання онлайн`,
      `- [Telegram](${ALL_LINKS.telegram}) — зв'язок у месенджері`,
      ``,
      `**🏫 Офіційний сайт:** [lib-hdak.in.ua](${ALL_LINKS.main})`,
      ``,
      `---`,
      ``,
      `_Оберіть зручний для вас спосіб — ми завжди раді допомогти!_`,
    ].join("\n"),
    thinkDelay: 0, // overridden by getFaqResponse() with randomThink()
    charsPerStep: 5,
    stepDelay: 12,
  },

  // ─── Правила ─────────────────────────────────────────────────
  "Які правила користування бібліотекою?": {
    content: [
      `Ось основні правила, які варто знати кожному читачу бібліотеки ХДАК:`,
      ``,
      `**👤 Хто може користуватися:**`,
      `Студенти, викладачі та співробітники ХДАК. Обслуговування — **за читацьким квитком**, усі послуги **безкоштовні**.`,
      ``,
      `---`,
      ``,
      `**📖 Правила користування виданнями:**`,
      `- Книги видаються на **встановлений термін** — вчасно повертайте`,
      `- Поводьтеся з виданнями **охайно**: не робіть позначок, не загинайте сторінки`,
      `- У разі **втрати або пошкодження** — необхідно відшкодувати вартість`,
      ``,
      `**🔇 У читальних залах:**`,
      `- Дотримуйтеся **тиші** та поважайте інших читачів`,
      `- Телефон — у **беззвучному режимі**`,
      `- Їжа та напої — **заборонені**`,
      ``,
      `**🗓 Санітарний день:**`,
      `Остання п'ятниця місяця — абонементи не працюють.`,
      ``,
      `---`,
      ``,
      `📄 [Повні правила користування](${ALL_LINKS.rules})`,
      `📄 [Правила електронного читального залу](${ALL_LINKS.rules_eroom})`,
      ``,
      `_Дотримання правил — запорука комфорту для всіх читачів. Дякуємо за розуміння!_`,
    ].join("\n"),
    thinkDelay: 0, // overridden by getFaqResponse() with randomThink()
    charsPerStep: 5,
    stepDelay: 12,
  },

  // ─── Електронні ресурси ──────────────────────────────────────
  "Які електронні ресурси доступні?": {
    content: [
      `Бібліотека ХДАК надає доступ до широкого спектру електронних ресурсів. Ось що доступно:`,
      ``,
      `**🔬 Міжнародні наукові бази даних:**`,
      `_(доступ через мережу ХДАК або за зверненням до бібліотекаря)_`,
      ``,
      `- [Scopus](${ALL_LINKS.scopus}) — найбільша реферативна та цитатна база`,
      `- [Web of Science](${ALL_LINKS.wos}) — провідна наукометрична платформа`,
      `- [ScienceDirect](${ALL_LINKS.sciencedirect}) — повнотекстові журнали Elsevier`,
      `- [Springer Nature](${ALL_LINKS.springer}) — книги та журнали Springer`,
      `- [Research4Life](${ALL_LINKS.research4life}) — відкритий доступ для України`,
      ``,
      `**📚 Вітчизняні та відкриті ресурси:**`,
      `- [Електронна бібліотека культури](${ALL_LINKS.elib_culture}) — профільні матеріали`,
      `- [УкрІНТЕІ](${ALL_LINKS.ukrintei}) — науково-технічна інформація`,
      `- [DOAJ](${ALL_LINKS.doaj}) — відкриті рецензовані журнали`,
      ``,
      `**🏛 Ресурси бібліотеки ХДАК:**`,
      `- [Репозитарій ХДАК](${ALL_LINKS.repository}) — наукові праці викладачів`,
      `- [Нові надходження](${ALL_LINKS.new_books}) — останні книги у фонді`,
      `- [Віртуальні виставки](${ALL_LINKS.exhibitions}) — тематичні добірки`,
      `- [Корисні посилання](${ALL_LINKS.helpful_links}) — зібрана добірка ресурсів`,
      ``,
      `---`,
      ``,
      `> 💡 Для доступу до платних баз даних — зверніться до бібліотекаря або скористайтеся **мережею ХДАК**.`,
      ``,
      `_Потрібна допомога з пошуком наукової інформації? Напишіть — підкажу._`,
    ].join("\n"),
    thinkDelay: 0, // overridden by getFaqResponse() with randomThink()
    charsPerStep: 5,
    stepDelay: 12,
  },
};

/**
 * Нормалізує рядок для порівняння: нижній регістр, без зайвих пробілів і пунктуації.
 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[?!.,;:…«»"'""'']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Детектує мову запиту.
 * Якщо є кирилиця — українська, інакше — англійська.
 */
function detectLang(query: string): "uk" | "en" {
  return /[а-яёіїєґА-ЯЁІЇЄҐ]/u.test(query) ? "uk" : "en";
}

const FAQ_UK_NORMALIZED = new Map<string, FaqResponse>(
  Object.entries(FAQ_RESPONSES).map(([k, v]) => [normalize(k), v])
);

const FAQ_EN_NORMALIZED = new Map<string, FaqResponse>(
  Object.entries(FAQ_RESPONSES_EN).map(([k, v]) => [normalize(k), v])
);

const FAQ_UK_ALIASES: Record<string, string[]> = {
  "Який графік роботи бібліотеки?": [
    "коли працює бібліотека",
    "до котрої бібліотека",
    "бібліотека відкрита",
    "розклад бібліотеки",
    "години роботи",
  ],
  "Як записатися до бібліотеки?": [
    "як стати читачем",
    "як отримати читацький квиток",
    "що потрібно для запису",
    "реєстрація в бібліотеці",
  ],
  "Як знайти книгу в каталозі?": [
    "де знайти книгу",
    "пошук книги",
    "знайти книжку",
    "каталог книг",
    "пошук за автором",
  ],
  "Які контакти бібліотеки?": [
    "номер телефону бібліотеки",
    "як зв'язатися",
    "адреса бібліотеки",
    "електронна пошта бібліотеки",
  ],
  "Які правила користування бібліотекою?": [
    "правила бібліотеки",
    "як користуватися книгами",
    "чи можна їсти в читальній залі",
    "термін повернення книги",
  ],
  "Які електронні ресурси доступні?": [
    "наукові бази даних",
    "де знайти статті",
    "електронні ресурси",
    "доступ до scopus",
    "репозитарій",
  ],
};

const FAQ_EN_ALIASES: Record<string, string[]> = {
  "What are the library hours?": [
    "when is the library open",
    "library schedule",
    "what time does the library close",
  ],
  "How to register at the library?": [
    "how to become a reader",
    "library card",
    "what do i need to register",
  ],
  "How to find a book in the catalog?": [
    "where can i find a book",
    "book search",
    "search by author",
  ],
  "What are the library contacts?": [
    "library phone number",
    "how can i contact the library",
    "library address",
  ],
  "What are the library rules?": [
    "library policy",
    "borrowing rules",
    "how long can i keep a book",
  ],
  "What electronic resources are available?": [
    "research databases",
    "where can i find papers",
    "scopus access",
    "online resources",
  ],
};

const STOP_WORDS = new Set(
  "а і й та це як що де до для з у на про чи не можна який яка які бібліотека library the are what how can i find to a an of is in do you the".split(
    " "
  )
);

function queryTokens(value: string): string[] {
  return normalize(value)
    .split(" ")
    .filter(token => token.length > 2 && !STOP_WORDS.has(token));
}

function findSimilarFaq(
  query: string,
  entries: Record<string, FaqResponse>,
  aliases: Record<string, string[]>
): FaqResponse | null {
  const normalizedQuery = normalize(query);
  let best: { score: number; entry: FaqResponse } | null = null;
  const queryWords = new Set(queryTokens(query));

  for (const [question, entry] of Object.entries(entries)) {
    const normalizedQuestion = normalize(question);
    const questionWords = queryTokens(question);
    const sharedWords = questionWords.filter(word =>
      queryWords.has(word)
    ).length;
    const matchingAlias = aliases[question]?.find(alias =>
      normalizedQuery.includes(normalize(alias))
    );
    const score = matchingAlias
      ? 100
      : sharedWords / Math.max(questionWords.length, 1);

    if (score >= 0.34 && (!best || score > best.score)) {
      best = { score, entry };
    }
  }

  return best?.entry ?? null;
}

/**
 * Finds a curated answer by exact phrase, aliases, or meaningful keyword overlap.
 * Unknown questions return null and continue through the live AI fallback.
 */
export function getFaqResponse(
  query: string
): (Omit<FaqResponse, "content"> & { content: string }) | null {
  const key = normalize(query);
  const lang = detectLang(query);
  const primary = lang === "en" ? FAQ_EN_NORMALIZED : FAQ_UK_NORMALIZED;
  const fallback = lang === "en" ? FAQ_UK_NORMALIZED : null;
  const primaryEntries = lang === "en" ? FAQ_RESPONSES_EN : FAQ_RESPONSES;
  const primaryAliases = lang === "en" ? FAQ_EN_ALIASES : FAQ_UK_ALIASES;

  const entry =
    primary.get(key) ??
    findSimilarFaq(query, primaryEntries, primaryAliases) ??
    (fallback ? findSimilarFaq(query, FAQ_RESPONSES, FAQ_UK_ALIASES) : null);

  if (!entry) return null;

  return {
    ...entry,
    content:
      typeof entry.content === "function" ? entry.content() : entry.content,
    thinkDelay: randomThink(),
  };
}
