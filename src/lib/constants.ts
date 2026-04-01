/**
 * Єдине джерело правди — контактні дані та інформація бібліотеки ХДАК.
 */

export const LIBRARY = {
  name:    'Бібліотека ХДАК',
  nameEn:  'HDAK Library',

  address:    'вул. Бурсацький узвіз, 4, Харків, 61057',
  addressUk:  '61057, м. Харків, Бурсацький узвіз, 4 (біля ст. метро «Історичний музей»)',
  addressEn:  '4 Bursatsky Descent, Kharkiv, 61057, Ukraine',

  phone:       '(057) 731-27-83',
  phoneFull:   '+38 (057) 731-27-83',
  messenger:   '+380661458484',
  email:       'abon@xdak.ukr.education',

  instagram:   'https://www.instagram.com/hdak_lib',
  facebook:    'https://m.me/641740969354328',

  /** Короткий рядок для статус-бару */
  statusBar: 'вул. Бурсацький узвіз, 4, Харків · (057) 731-27-83 · +380 66 145 84 84',

  hours: {
    weekdayUk: 'Пн-Пт: 9:00–16:45 (перерва 13:00–13:45)',
    saturdayUk: 'Сб: 9:00–13:30',
    sundayUk: 'Нд — вихідний',
    sanitaryUk: 'Остання п\'ятниця місяця — санітарний день (абонементи)',
  },

  /** Детальні графіки для промпту */
  schedule: {
    abonement: [
      '- Пн–Пт: 9:00–16:45 (перерва 13:00–13:45)',
      '- Субота, неділя — вихідні',
      '- Санітарний день — остання п\'ятниця місяця',
    ].join('\n'),
    readingRoom: [
      '- Пн–Пт: 9:00–16:45',
      '- Субота: 9:00–13:30',
      '- Санітарний день — останній четвер місяця',
    ].join('\n'),
    automation: [
      '- Пн–Пт: 9:00–16:45 (перерва 13:00–13:45)',
      '- Субота, неділя — вихідні',
      '- Санітарний день — останній четвер місяця',
    ].join('\n'),
  },

  links: {
    catalogSearch:  'https://library-service.com.ua:8443/khkhdak/DocumentSearchForm',
    repository:     'https://repository.ac.kharkov.ua/home',
    site:           'https://lib-hdak.in.ua/',
    rules:          'https://lib-hdak.in.ua/rules-library.html',
    newAcquisitions:'https://lib-hdak.in.ua/new-acquisitions.html',
    exhibitions:    'https://lib-hdak.in.ua/virtual-exhibitions.html',
    scienceInfo:    'https://lib-hdak.in.ua/search-scientific-info.html',
    authorProfiles: 'https://lib-hdak.in.ua/author-profiles-instructions.html',
    helpfulLinks:   'https://lib-hdak.in.ua/helpful-links.html',
  }
} as const;

/**
 * Чи бібліотека зараз відкрита.
 * Санітарний день абонементів — остання п'ятниця місяця (зачинено весь день).
 * Враховує обідню перерву 13:00–13:45 та таймзону Europe/Kyiv.
 */
export function isLibraryOpen(now = new Date()): boolean {
  // H8: correct timezone conversion — extract parts directly from Intl formatter
  // toLocaleString → new Date() is broken on non-Kyiv servers (Vercel us-east-1)
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Kyiv',
    hour: 'numeric', minute: 'numeric',
    weekday: 'short', day: 'numeric', month: 'numeric', year: 'numeric',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map(p => [p.type, p.value]));

  const dayName = parts.weekday; // 'Mon', 'Tue', ... 'Sun'
  const hour = parseInt(parts.hour, 10);
  const min = parseInt(parts.minute, 10);
  const dayNum = parseInt(parts.day, 10);
  const monthNum = parseInt(parts.month, 10);
  const yearNum = parseInt(parts.year, 10);

  // Map weekday name to 0-6 (Sun=0)
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const day = dayMap[dayName] ?? -1;

  // Check if today is the last Friday of the month (санітарний день абонементів)
  if (day === 5) {
    const nextFriday = new Date(Date.UTC(yearNum, monthNum - 1, dayNum + 7));
    const nextFridayMonth = nextFriday.getUTCMonth() + 1;
    if (nextFridayMonth !== monthNum) return false;
  }

  // Check if today is the last Thursday of the month (санітарний день читального залу та автоматизації)
  // isLibraryOpen() reflects the general "is anything open" status — if abonement is closed
  // but reading room is open (Thursday), we still return true for the general status.
  // The system prompt lists both schedules separately for accurate per-department info.

  // Lunch break 13:00–13:45 (weekdays only)
  // Lunch break: 13:00 (inclusive) to 13:45 (exclusive)
  const isLunch = hour === 13 && min < 45;

  if (day >= 1 && day <= 5) {
    if (isLunch) return false;
    return hour >= 9 && (hour < 16 || (hour === 16 && min < 45));
  }
  if (day === 6) {
    return hour >= 9 && (hour < 13 || (hour === 13 && min < 30));
  }
  return false;
}

/**
 * Усі посилання бібліотеки ХДАК
 */
export const ALL_LINKS = {
  // КАТАЛОГИ — M15: use LIBRARY.links.catalogSearch as single source of truth
  catalog_search:  LIBRARY.links.catalogSearch,
  catalog_page:    'https://lib-hdak.in.ua/e-catalog.html',
  mobile_app:      'https://play.google.com/store/apps/details?id=ush.libclient',
  repository:      'https://repository.ac.kharkov.ua/home',

  // ГОЛОВНІ СТОРІНКИ
  main:            'https://lib-hdak.in.ua/',
  contacts:        'https://lib-hdak.in.ua/contacts.html',
  structure:       'https://lib-hdak.in.ua/structure-library.html',
  rules:           'https://lib-hdak.in.ua/rules-library.html',
  rules_eroom:     'https://lib-hdak.in.ua/rules-library-e-reading-room.html',

  // ЧИТАЧАМ
  new_books:       'https://lib-hdak.in.ua/new-acquisitions.html',
  new_archive:     'https://lib-hdak.in.ua/new-acquisitions-archive.html',
  exhibitions:     'https://lib-hdak.in.ua/virtual-exhibitions.html',
  artifacts:       'https://lib-hdak.in.ua/artifacts.html',
  gallery:         'https://lib-hdak.in.ua/gallery-all.html',
  unified_card:    'https://lib-hdak.in.ua/project-unified-reader-card.html',

  // НАУКА
  sci_search:      'https://lib-hdak.in.ua/search-scientific-info.html',
  author_profiles: 'https://lib-hdak.in.ua/author-profiles-instructions.html',
  publications:    'https://lib-hdak.in.ua/scientists-publications.html',
  doaj:            'https://lib-hdak.in.ua/catalog-doaj.html',
  helpful_links:   'https://lib-hdak.in.ua/helpful-links.html',

  // ЗОВНІШНІ НАУКОВІ БАЗИ
  scopus:          'https://www.scopus.com/',
  wos:             'https://www.webofscience.com/',
  sciencedirect:   'https://www.sciencedirect.com/',
  springer:        'https://link.springer.com/',
  research4life:   'https://login.research4life.org/tacsgr1portal_research4life_org/',
  elib_culture:    'http://elib.nplu.org/',
  ukrintei:        'http://nrat.ukrintei.ua/',

  // СОЦМЕРЕЖІ
  facebook:        'https://m.me/641740969354328',
  instagram:       'https://www.instagram.com/hdak_lib/',
  telegram:        'https://t.me/+380661458484',
  viber:           'viber://chat/?number=%2B380661458484',

  // ХДАК
  hdak_main:       'http://www.ic.ac.kharkov.ua/',
} as const;
