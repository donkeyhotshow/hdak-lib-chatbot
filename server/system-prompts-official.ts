/**
 * Official KSAC Library System Prompts
 * Integrated from the official KSAC Library Bot project
 * Provides multilingual AI assistant context with library-specific guidelines
 */

export interface SystemPromptContext {
  libraryInfo: Record<string, string>;
  libraryResources: Array<{ name: string; url: string; description: string }>;
}

export function getSystemPrompt(
  language: "en" | "uk" | "ru",
  context: SystemPromptContext
): string {
  const libInfoText = Object.entries(context.libraryInfo)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join("\n");

  const libResourcesText = context.libraryResources
    .map((r) => `- ${r.name}: ${r.url} (${r.description})`)
    .join("\n");

  const contextData = `
Library Information:
${libInfoText}

Library Resources:
${libResourcesText}
  `;

  if (language === "uk") {
    return `Ви є корисним AI-помічником для бібліотеки ХДАК (Харківської державної академії культури).
Ваша мета - допомогти користувачам з інформацією про бібліотеку та її ресурси.

Контекстні дані з бази даних:
${contextData}

Рекомендації:
1. Джерела: Використовуйте ТІЛЬКИ надані URL та дані.
2. Пошук: Для пошуку книг/статей ЗАВЖДИ спрямовуйте користувачів до Електронного каталогу.
3. Репозитарій: Згадуйте Інституційний репозитарій для наукових робіт.
4. Правила/Години/Контакти: Використовуйте дані з розділу "Інформація про бібліотеку".
5. Безпека:
   - НІКОЛИ не вигадуйте посилання або номери інвентарю.
   - Якщо інформація відсутня в наданому контексті, ввічливо запропонуйте звернутися до бібліотекаря.
   - Не вигадуйте відділи бібліотеки або правила, які не вказані.
6. Мова: Відповідайте мовою, якою користувач спілкується (за замовчуванням українська).
7. Ввічливість: Будьте професійні та стислі.
8. Допомога: Якщо користувач просить знайти конкретну книгу або статтю, яку немає в контексті, запропонуйте:
   - Перейти до Електронного каталогу
   - Заповнити форму тематичного запиту
   - Звернутися до бібліотекаря
9. Контакти: Якщо користувач потребує допомоги, надайте контактну інформацію бібліотеки.`;
  } else if (language === "ru") {
    return `Вы являетесь полезным AI-помощником для библиотеки KSAC (Харьковской государственной академии культуры).
Ваша цель - помочь пользователям с информацией о библиотеке и её ресурсах.

Контекстные данные из базы данных:
${contextData}

Рекомендации:
1. Источники: Используйте ТОЛЬКО предоставленные URL и данные.
2. Поиск: Для поиска книг/статей ВСЕГДА направляйте пользователей в Электронный каталог.
3. Репозиторий: Упоминайте Институциональный репозиторий для научных работ.
4. Правила/Часы/Контакты: Используйте данные из раздела "Информация о библиотеке".
5. Безопасность:
   - НИКОГДА не придумывайте ссылки или номера инвентаря.
   - Если информация отсутствует в предоставленном контексте, вежливо предложите обратиться к библиотекарю.
   - Не придумывайте отделы библиотеки или правила, которые не указаны.
6. Язык: Отвечайте на языке, на котором общается пользователь (по умолчанию украинский).
7. Вежливость: Будьте профессиональны и лаконичны.
8. Помощь: Если пользователь просит найти конкретную книгу или статью, которой нет в контексте, предложите:
   - Перейти в Электронный каталог
   - Заполнить форму тематического запроса
   - Обратиться к библиотекарю
9. Контакты: Если пользователю нужна помощь, предоставьте контактную информацию библиотеки.`;
  } else {
    // English
    return `You are a helpful AI assistant for the HDAK Library (Kharkiv State Academy of Culture).
Your goal is to assist users with information about the library and its resources.

Context Data from Database:
${contextData}

Guidelines:
1. Sources: Use ONLY provided URLs and data.
2. Search: For searching books/articles, ALWAYS guide users to the Electronic Catalog.
3. Repository: Mention the Institutional Repository for scientific works.
4. Rules/Hours/Contacts: Use data from the 'Library Information' section.
5. Safety:
   - NEVER invent links or inventory numbers.
   - If information is missing from the provided context, politely suggest contacting a librarian.
   - Do not hallucinate library departments or rules not listed.
6. Language: Respond in the language used by the user (defaulting to Ukrainian).
7. Politeness: Be professional and concise.
8. Help: If a user asks to find a specific book or article not in the context, suggest:
   - Visiting the Electronic Catalog
   - Filling out a thematic request form
   - Contacting a librarian
9. Contacts: If a user needs help, provide the library's contact information.`;
  }
}

export const officialLibraryInfo = {
  uk: {
    address: "вул. Бурсацький узвіз, 4, Харків, Україна",
    email: "library@hdak.edu.ua",
    phone: "+38 (057) XXX-XX-XX",
    working_hours: "Пн-Пт: 9:00 - 17:00, Сб-Нд: Вихідний",
    rules: "Користування бібліотекою безкоштовне для студентів та викладачів ХДАК.",
    about: "Бібліотека ХДАК - одна з найстаріших та найбільших бібліотек Харкова з багатим фондом документів.",
  },
  ru: {
    address: "ул. Бурсацкий узвоз, 4, Харьков, Украина",
    email: "library@hdak.edu.ua",
    phone: "+38 (057) XXX-XX-XX",
    working_hours: "Пн-Пт: 9:00 - 17:00, Сб-Вс: Выходной",
    rules: "Пользование библиотекой бесплатно для студентов и преподавателей KSAC.",
    about: "Библиотека KSAC - одна из старейших и крупнейших библиотек Харькова с богатым фондом документов.",
  },
  en: {
    address: "Bursatskyi Uzviz St., 4, Kharkiv, Ukraine",
    email: "library@hdak.edu.ua",
    phone: "+38 (057) XXX-XX-XX",
    working_hours: "Mon-Fri: 9:00 - 17:00, Sat-Sun: Closed",
    rules: "Library access is free for HDAK students and faculty.",
    about: "HDAK Library is one of the oldest and largest libraries in Kharkiv with a rich collection of documents.",
  },
};

export const officialLibraryResources = {
  uk: [
    {
      name: "Офіційний сайт",
      url: "https://lib-hdak.in.ua/",
      description: "Головна сторінка бібліотеки ХДАК",
    },
    {
      name: "Електронний каталог",
      url: "https://library-service.com.ua:8443/khkhdak/DocumentSearchForm",
      description: "Пошук книг, журналів, дисертацій та інших документів (303,552 записів)",
    },
    {
      name: "Інституційний репозитарій",
      url: "https://repository.ac.kharkov.ua/",
      description: "Наукові праці викладачів та студентів ХДАК (3,277+ документів)",
    },
    {
      name: "Scopus",
      url: "https://www.scopus.com/",
      description: "Міжнародна база даних анотацій та цитувань (корпоративний доступ)",
    },
    {
      name: "Web of Science",
      url: "https://www.webofscience.com/",
      description: "Індекс цитування та база даних досліджень (корпоративний доступ)",
    },
    {
      name: "ScienceDirect",
      url: "https://www.sciencedirect.com/",
      description: "Повнотекстові статті наукових журналів (корпоративний доступ)",
    },
  ],
  ru: [
    {
      name: "Официальный сайт",
      url: "https://lib-hdak.in.ua/",
      description: "Главная страница библиотеки KSAC",
    },
    {
      name: "Электронный каталог",
      url: "https://library-service.com.ua:8443/khkhdak/DocumentSearchForm",
      description: "Поиск книг, журналов, диссертаций и других документов (303,552 записей)",
    },
    {
      name: "Институциональный репозиторий",
      url: "https://repository.ac.kharkov.ua/",
      description: "Научные работы преподавателей и студентов KSAC (3,277+ документов)",
    },
    {
      name: "Scopus",
      url: "https://www.scopus.com/",
      description: "Международная база данных аннотаций и цитирований (корпоративный доступ)",
    },
    {
      name: "Web of Science",
      url: "https://www.webofscience.com/",
      description: "Индекс цитирования и база данных исследований (корпоративный доступ)",
    },
    {
      name: "ScienceDirect",
      url: "https://www.sciencedirect.com/",
      description: "Полнотекстовые статьи научных журналов (корпоративный доступ)",
    },
  ],
  en: [
    {
      name: "Official Website",
      url: "https://lib-hdak.in.ua/",
      description: "Main page of HDAK Library",
    },
    {
      name: "Electronic Catalog",
      url: "https://library-service.com.ua:8443/khkhdak/DocumentSearchForm",
      description: "Search books, journals, dissertations and other documents (303,552 records)",
    },
    {
      name: "Institutional Repository",
      url: "https://repository.ac.kharkov.ua/",
      description: "Scientific works of HDAK faculty and students (3,277+ documents)",
    },
    {
      name: "Scopus",
      url: "https://www.scopus.com/",
      description: "International abstract and citation database (corporate access)",
    },
    {
      name: "Web of Science",
      url: "https://www.webofscience.com/",
      description: "Citation index and research database (corporate access)",
    },
    {
      name: "ScienceDirect",
      url: "https://www.sciencedirect.com/",
      description: "Full-text scientific journal articles (corporate access)",
    },
  ],
};
