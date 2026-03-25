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
  facebook:    'http://m.me/641740969354328',

  /** Короткий рядок для статус-бару */
  statusBar: 'вул. Бурсацький узвіз, 4, Харків · (057) 731-27-83 · +380 66 145 84 84',

  hours: {
    weekdayUk: 'Пн-Пт: 9:00–16:45 (перерва 13:00–13:45)',
    saturdayUk: 'Сб: 9:00–13:30',
    sundayUk: 'Нд — вихідний',
    sanitaryUk: 'Остання п\'ятниця місяця — санітарний день (абонементи)',
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

export function isLibraryOpen(now = new Date()): boolean {
  const day  = now.getDay();
  const hour = now.getHours();
  const min  = now.getMinutes();

  if (day >= 1 && day <= 5) {
    return (hour > 9 || (hour === 9 && min >= 0)) && (hour < 16 || (hour === 16 && min < 45));
  }
  if (day === 6) {
    return (hour > 9 || (hour === 9 && min >= 0)) && (hour < 13 || (hour === 13 && min < 30));
  }
  return false;
}
