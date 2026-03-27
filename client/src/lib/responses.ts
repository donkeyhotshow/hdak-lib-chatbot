import { LIBRARY, ALL_LINKS } from "../../../lib/constants";

/**
 * Швидкі відповіді на типові запити користувачів
 * Ключі - це kw-значення (ключові слова для пошуку)
 */
export const RESPONSES: Record<string, { title: string; content: string; link?: string }> = {
  // Каталог
  "catalog": {
    title: "Електронний каталог",
    content: `Ви можете шукати книги в нашому електронному каталозі. Для пошуку перейдіть за посиланням нижче.`,
    link: ALL_LINKS.catalog_search,
  },
  "запись": {
    title: "Як записатися до бібліотеки",
    content: `Для запису до бібліотеки необхідно:
• Студенти — пред'явити студентський квиток
• Викладачі — пред'явити службове посвідчення
• Інші категорії — паспорт

Запис проводиться в читальному залі або абонементі.`,
  },
  "графік": {
    title: "Графік роботи бібліотеки",
    content: `📅 ${LIBRARY.hours.weekdayUk}
📅 ${LIBRARY.hours.saturdayUk}
📅 ${LIBRARY.hours.sundayUk}

⚠️ ${LIBRARY.hours.sanitaryUk}`,
  },
  "контакти": {
    title: "Контакти бібліотеки ХДАК",
    content: `📍 **Адреса:** ${LIBRARY.addressUk}

📞 **Телефон:** ${LIBRARY.phoneFull}

📧 **Email:** ${LIBRARY.email}

💬 **Messenger:** ${LIBRARY.messenger}`,
  },
  "правила": {
    title: "Правила користування бібліотекою",
    content: `Ознайомитися з правилами користування бібліотекою можна на нашому сайті.`,
    link: ALL_LINKS.rules,
  },
  "репозитарій": {
    title: "Репозитарій ХДАК",
    content: `Репозитарій ХДАК — це електронний архів наукових праць викладачів та студентів академії.`,
    link: ALL_LINKS.repository,
  },
  "нові_книги": {
    title: "Нові надходження",
    content: `Переглянути список нових книг можна на сторінці нових надходжень.`,
    link: ALL_LINKS.new_books,
  },
  "виставки": {
    title: "Віртуальні виставки",
    content: `Бібліотека регулярно проводить віртуальні книжкові виставки.`,
    link: ALL_LINKS.exhibitions,
  },
  "наука": {
    title: "Наукова інформація",
    content: `Бібліотека надає доступ до наукових баз даних та ресурсів для дослідників.`,
    link: ALL_LINKS.sci_search,
  },
  "дсту": {
    title: "Оформлення за ДСТУ",
    content: `Бібліотека допомагає з оформленням бібліографічних посилань за ДСТУ 8302:2015. Зверніться до бібліографа або використовуйте функцію збереження книг в чаті.`,
  },
};

/**
 * Пошук відповіді за ключовими словами
 * @param text - текст запиту користувача
 * @returns відповідь або null якщо не знайдено
 */
export function getResponse(text: string): { title: string; content: string; link?: string } | null {
  const lower = text.toLowerCase().trim();
  
  // Перевіряємо прямі ключі
  for (const [key, response] of Object.entries(RESPONSES)) {
    if (lower.includes(key.toLowerCase())) {
      return response;
    }
  }
  
  // Додаткові ключові слова
  if (lower.includes("каталог") || lower.includes("книг") || lower.includes("пошук")) {
    return RESPONSES["catalog"];
  }
  if (lower.includes("реєстр") || lower.includes("читацьк") || lower.includes("абонемент")) {
    return RESPONSES["запись"];
  }
  if (lower.includes("годин") || lower.includes("час") || lower.includes("коли") || lower.includes("відкрито")) {
    return RESPONSES["графік"];
  }
  if (lower.includes("адрес") || lower.includes("телефон") || lower.includes("email") || lower.includes("пошта")) {
    return RESPONSES["контакти"];
  }
  if (lower.includes("правил") || lower.includes("вимог")) {
    return RESPONSES["правила"];
  }
  if (lower.includes("репозит") || lower.includes("публікації") || lower.includes("наукові")) {
    return RESPONSES["репозитарій"];
  }
  if (lower.includes("нові") || lower.includes("надходження")) {
    return RESPONSES["нові_книги"];
  }
  if (lower.includes("виставк")) {
    return RESPONSES["виставки"];
  }
  if (lower.includes("наукова") || lower.includes("scopus") || lower.includes("wos")) {
    return RESPONSES["наука"];
  }
  
  return null;
}

/**
 * Швидкі запити для UI
 */
export const QUICK_MENU = [
  { 
    kw: "графік", 
    label: "Графік роботи", 
    subtitle: "Час роботи бібліотеки",
    icon: "Clock" 
  },
  { 
    kw: "запись", 
    label: "Як записатися?", 
    subtitle: "Отримати читацький квиток",
    icon: "UserPlus" 
  },
  { 
    kw: "catalog", 
    label: "Електронний каталог", 
    subtitle: "Пошук книг в OPAC",
    icon: "Search" 
  },
  { 
    kw: "контакти", 
    label: "Контакти", 
    subtitle: "Адреса та телефони",
    icon: "Phone" 
  },
  { 
    kw: "правила", 
    label: "Правила", 
    subtitle: "Правила користування",
    icon: "Scale" 
  },
  { 
    kw: "репозитарій", 
    label: "Репозитарій", 
    subtitle: "Наукові публікації ХДАК",
    icon: "BookOpen" 
  },
] as const;