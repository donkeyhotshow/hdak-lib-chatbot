-- Seed library info data
INSERT INTO library_info (key, value_uk, value_en, category, source) VALUES
  ('address', 'вул. Бурсацький узвіз, 4, Харків, 61057, Україна', '4 Bursatsky Descent, Kharkiv, 61057, Ukraine', 'contacts', 'library'),
  ('phone', '+38 (057) 707-53-35', '+38 (057) 707-53-35', 'contacts', 'library'),
  ('email', 'library@hdak.edu.ua', 'library@hdak.edu.ua', 'contacts', 'library'),
  ('hours', 'Понеділок – П''ятниця: 9:00–17:00. Субота та неділя — вихідні.', 'Monday – Friday: 9:00–17:00. Saturday and Sunday are days off.', 'hours', 'library'),
  ('rules', 'Користування бібліотекою безкоштовне для студентів, аспірантів та викладачів ХДАК. Для запису потрібен студентський квиток або посвідчення співробітника. Книги видаються на термін, встановлений бібліотекарем.', 'Library services are free for HDAK students, postgraduates, and staff. A student ID or staff card is required for registration.', 'rules', 'library'),
  ('services', 'Послуги: видача книг додому, читальний зал, доступ до електронного каталогу, інституційного репозитарію, консультації бібліотекаря. Міжбібліотечний абонемент — лише за попередньою домовленістю.', 'Services: home lending, reading room, access to electronic catalog, institutional repository, librarian consultations. Interlibrary loan by prior arrangement only.', 'services', 'library'),
  ('about', 'Наукова бібліотека Харківської державної академії культури (ХДАК) — структурний підрозділ академії. Забезпечує доступ до наукової, навчальної та методичної літератури для студентів і викладачів.', 'The Scientific Library of Kharkiv State Academy of Culture (HDAK) is a structural unit of the academy providing access to academic, educational and methodological literature.', 'general', 'library')
ON CONFLICT (key) DO NOTHING;

-- Seed library resources data
INSERT INTO library_resources (name, type, url, description_uk, description_en, is_official, requires_auth) VALUES
  ('Офіційний сайт бібліотеки', 'site', 'https://lib-hdak.in.ua/', 'Головна сторінка бібліотеки ХДАК. Новини, анонси заходів, загальна інформація.', 'HDAK Library main website. News, events, general information.', true, false),
  ('Електронний каталог', 'catalog', 'https://library-service.com.ua:8443/khkhdak/DocumentSearchForm', 'Пошук книг, журналів та інших документів у фонді бібліотеки ХДАК. Для пошуку введіть автора, назву або ключові слова.', 'Search books, journals and other documents in the HDAK library collection.', true, false),
  ('Інституційний репозитарій', 'repository', 'http://repo.hdak.edu.ua/', 'Відкритий архів наукових праць, дисертацій, монографій та статей викладачів і студентів ХДАК. Доступний без реєстрації.', 'Open archive of scientific papers, dissertations, monographs by HDAK faculty and students. No registration required.', true, false)
ON CONFLICT DO NOTHING;
