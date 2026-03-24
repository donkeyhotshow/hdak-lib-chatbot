/**
 * Єдине джерело правди — контактні дані та інформація бібліотеки ХДАК.
 * Усі компоненти та API мають імпортувати звідси.
 */

export const LIBRARY = {
  name:    'Бібліотека ХДАК',
  nameEn:  'HDAK Library',

  address:    'вул. Бурсацький узвіз, 4, Харків, 61003',
  addressUk:  '61003, м. Харків, Бурсацький узвіз, 4 (біля ст. метро «Історичний музей»)',
  addressEn:  '4 Bursatsky Descent, Kharkiv, 61003, Ukraine',

  phone:       '(057) 731-27-83',
  phoneFull:   '+38 (057) 731-27-83',
  messenger:   '+380661458484',
  email:       'bibliohdak@gmail.com',

  instagram:   'https://www.instagram.com/library_hdak',
  facebook:    'https://www.facebook.com/library.hdak',

  /** Короткий рядок для статус-бaru */
  statusBar: 'вул. Бурсацький узвіз, 4, Харків · (057) 731-27-83 · +380 66 145 84 84',

  hours: {
    weekdayUk: 'Пн-Пт: 9:00–16:45 (перерва 13:00–13:45)',
    weekdayEn: 'Mon-Fri: 9:00–16:45 (break 13:00–13:45)',
    saturdayUk: 'Сб: 9:00–13:30',
    saturdayEn: 'Sat: 9:00–13:30',
    sundayUk: 'Нд — вихідний',
    sundayEn: 'Sun — closed',
    sanitaryUk: 'Останній четвер місяця — санітарний день',
    sanitaryEn: 'Last Thursday of the month — cleaning day',
  },

  resources: {
    site:       'https://lib-hdak.in.ua/',
    catalog:    'https://library-service.com.ua:8443/khkhdak/DocumentSearchForm',
    repository: 'https://repository.ac.kharkov.ua/',
    eCatalog:   'https://lib-hdak.in.ua/e-catalog.html',
    newBooks:   'https://lib-hdak.in.ua/new-acquisitions.html',
    science:    'https://lib-hdak.in.ua/search-scientific-info.html',
  },
} as const;

/** Перевірка: чи зараз бібліотека відкрита (Пн-Пт 9-16:45, Сб 9-13:30) */
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
