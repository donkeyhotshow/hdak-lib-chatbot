# HDAK Library Chatbot — Roadmap

> Поточна версія: `0.2.0` · Стек: Next.js 16 · TypeScript · Drizzle ORM · Neon PostgreSQL · Groq/Qwen LLM

---

## Статус фіч

| #   | Фіча                                 | Статус         | Пріоритет |
| --- | ------------------------------------ | -------------- | --------- |
| 1   | Голосовий ввід                       | ✅ Реалізовано | High      |
| 2   | Мультимовний FAQ (EN)                | ✅ Реалізовано | High      |
| 3   | Розширений пошук в каталозі          | ✅ Реалізовано | Medium    |
| 5   | Push-нагадування про повернення книг | ✅ Реалізовано | Medium    |
| 6   | Рекомендації книг                    | ✅ Реалізовано | Medium    |
| 7   | PWA / Офлайн-режим                   | ✅ Реалізовано | Low       |

---

## 1. Голосовий ввід (Web Speech API)

**Мета:** Кнопка мікрофона в ChatInput — диктовка питань замість набору тексту.

### Файли

- `src/hooks/use-speech.ts` — новий хук
- `src/components/chat/ChatInput.tsx` — додати кнопку

### Кроки реалізації

```
1. Створити хук use-speech.ts
   - SpeechRecognition API з fallback на webkitSpeechRecognition
   - Стани: idle | listening | processing | error
   - lang: 'uk-UA' за замовчуванням, fallback 'en-US'
   - onResult(text) → передає в setInputValue
   - onError → показує toast

2. ChatInput.tsx
   - Додати кнопку мікрофона поруч з Send
   - Анімація пульсації під час запису
   - Disabled якщо isTyping або API недоступний
   - Перевірка navigator.mediaDevices.getUserMedia перед активацією
```

### Чеклист перевірки

- [ ] Chrome desktop: диктовка → текст з'являється в полі
- [ ] Safari iOS: кнопка видима, при кліку запит дозволу
- [ ] Firefox: кнопка прихована (API не підтримується) — graceful degradation
- [ ] Натиснути мікрофон під час стрімінгу відповіді — кнопка disabled
- [ ] Відмовити дозвіл → toast з поясненням
- [ ] Тихе середовище → timeout після 10s → повернення в idle

---

## 2. Мультимовний FAQ (англійська)

**Мета:** FAQ відповіді англійською для іноземних студентів.

### Файли

- `src/lib/faq-responses.ts` — оновити `getFaqResponse()`
- `src/lib/faq-responses-en.ts` — новий файл
- `src/components/chat/ChatArea.tsx` — локалізовані кнопки

### Кроки реалізації

```
1. Створити faq-responses-en.ts
   - Ті самі 6 ключів але англійською
   - Ключі: 'What are the library hours?', 'How to register?', etc.

2. faq-responses.ts — оновити getFaqResponse()
   - Детектувати мову запиту: /[а-яёіїєґ]/i → uk, інакше → en
   - Шукати в відповідній Map
   - Якщо не знайдено в en → fallback на uk Map

3. ChatArea.tsx — QUICK_MENU і QUICK_CHIPS
   - Додати стан locale (uk/en)
   - Показувати кнопки на відповідній мові
   - Детектувати з navigator.language при монтуванні
```

### Чеклист перевірки

- [ ] Написати "What are the library hours?" → англійська FAQ відповідь
- [ ] Написати "Який графік?" → українська відповідь
- [ ] Написати "What are the rules?" → англійська відповідь
- [ ] Нормалізація: "what are the library hours" (без ?) → знаходить
- [ ] Браузер з en-US locale → кнопки Quick Menu англійською
- [ ] Браузер з uk-UA locale → кнопки українською

---

## 3. Розширений пошук в каталозі

**Мета:** Пошук по ключових словах, темі, УДК — через розширені параметри каталогу.

### Файли

- `src/lib/catalog-search.ts` — нові типи і параметри
- `src/app/api/catalog-search/route.ts` — нові query params

### Кроки реалізації

```
1. catalog-search.ts — нові параметри searchCatalog()
   - Додати searchType: 'keyword' | 'udc' | 'subject'
   - keyword → параметр 'keywords' в formData
   - udc → параметр 'udc' в formData
   - subject → параметр 'subject' в formData

2. detectSearchIntent() — нові патерни
   - УДК: /УДК\s*([\d.]+)/i → searchType: 'udc'
   - Тема: /тема[:\s]+(.{3,60})/i → searchType: 'subject'
   - Ключові слова: /ключов[іе]\s+слов[аи][:\s]+(.+)/i

3. API route — додати параметри udc, subject, keyword
   - Валідація: тільки цифри і крапки для УДК
   - Передавати в searchCatalog()
```

### Чеклист перевірки

- [ ] "Знайди за УДК 78.01" → пошук по УДК
- [ ] "Книги на тему: джаз" → subject пошук
- [ ] `GET /api/catalog-search?udc=78.01` → 200 з результатами
- [ ] `GET /api/catalog-search?udc=<script>` → 400 (валідація)
- [ ] Каталог недоступний → `unavailable: true` → правильне повідомлення
- [ ] Порожній результат по УДК → "нічого не знайдено" (не "недоступний")

---

## 5. Push-нагадування про повернення книг

**Мета:** Користувач вводить дату повернення → push-нагадування за день до дедлайну.

### Файли

- `public/sw.js` — Service Worker (push handler)
- `src/hooks/use-push.ts` — новий хук
- `src/app/api/push/subscribe/route.ts` — новий endpoint
- `src/app/api/push/remind/route.ts` — cron endpoint
- `src/lib/db.ts` — нова таблиця `push_subscriptions`

### Кроки реалізації

```
1. public/sw.js — Service Worker
   - Обробник push event
   - Показ notification з title/body/icon
   - Click → відкриває сайт

2. use-push.ts хук
   - Реєстрація SW: navigator.serviceWorker.register('/sw.js')
   - Запит дозволу: Notification.requestPermission()
   - Підписка: registration.pushManager.subscribe({
       userVisibleOnly: true,
       applicationServerKey: VAPID_PUBLIC_KEY
     })
   - Відправка subscription на /api/push/subscribe

3. API /api/push/subscribe (POST)
   - Зберігати { endpoint, keys, sessionId, remindAt } в БД
   - Нова таблиця: push_subscriptions

4. API /api/push/remind (POST, cron)
   - Знаходити підписки де remindAt <= now + 24h
   - Відправляти push через web-push npm пакет
   - Видаляти після відправки

5. ChatArea / UI
   - Розпізнавати фрази "поверну книгу 15 квітня"
   - Показувати кнопку "Нагадати мені"
   - При кліку → запит дозволу → підписка
```

### Нові env vars

```
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:abon@xdak.ukr.education
```

### Чеклист перевірки

- [ ] Chrome desktop: підписка → отримати push через 1 хв (тест)
- [ ] Safari iOS 16.4+: підписка працює
- [ ] Firefox: підписка працює
- [ ] Відмовити дозвіл → graceful, без помилок
- [ ] Відписатись (unsubscribe) → endpoint видаляється з БД
- [ ] Cron endpoint без авторизації → 401
- [ ] Expired subscription → web-push повертає 410 → видаляємо з БД

---

## 6. Рекомендації книг

**Мета:** LLM пропонує схожі книги з каталогу на основі теми розмови.

### Файли

- `src/app/api/chat/route.ts` — паралельний пошук
- `src/lib/prompts.ts` — інструкція для LLM
- `src/lib/catalog-search.ts` — допоміжна функція

### Кроки реалізації

```
1. chat/route.ts — після отримання відповіді LLM
   - Якщо відповідь містить тему (культурологія, музика, etc.)
   - Запустити додатковий searchCatalog() паралельно з LLM
   - Додати результати в кінець відповіді як "Також може зацікавити:"

2. prompts.ts — інструкція для LLM
   - Додати секцію: якщо є [РЕКОМЕНДАЦІЇ] — показати список
   - LLM сам вирішує чи доречно рекомендувати

3. Альтернатива (простіше):
   - Після кожної відповіді з каталогу — автоматично шукати
     схожі книги по першому результату
   - Показувати як окремий блок під відповіддю
```

### Чеклист перевірки

- [ ] "Розкажи про культурологію" → в кінці відповіді є рекомендації
- [ ] "Який графік роботи?" → рекомендацій немає (не релевантно)
- [ ] Каталог недоступний → відповідь без рекомендацій (не ламається)
- [ ] Рекомендації не дублюють вже знайдені книги
- [ ] Не більше 3 рекомендацій (не захаращує відповідь)

---

## 7. PWA / Офлайн-режим

**Мета:** Додаток встановлюється на телефон, FAQ відповіді доступні без інтернету.

### Файли

- `public/manifest.json` — новий
- `public/sw.js` — Service Worker (кешування)
- `public/icons/` — іконки 192x192, 512x512 PNG
- `src/app/layout.tsx` — підключення manifest + реєстрація SW
- `next.config.ts` — headers для SW

### Кроки реалізації

```
1. public/manifest.json
   - name: "ХДАК Бібліотека"
   - short_name: "ХДАК"
   - icons: [192x192, 512x512]
   - theme_color: '#B87830'
   - background_color: '#FDFBF7'
   - display: 'standalone'
   - start_url: '/'

2. public/sw.js — стратегії кешування
   - Install: кешувати статику (/, CSS, JS, fonts)
   - Fetch: Cache First для статики, Network First для API
   - Офлайн fallback: показати кешовану сторінку

3. layout.tsx
   - <link rel="manifest" href="/manifest.json" />
   - <meta name="theme-color" content="#B87830" />
   - Реєстрація SW в useEffect

4. next.config.ts
   - headers для SW: Service-Worker-Allowed: /

5. Офлайн UX
   - SW кешує FAQ відповіді
   - При офлайні — показувати кешовані FAQ відповіді
   - Індикатор "Офлайн режим" в header
```

### Чеклист перевірки

- [ ] Chrome DevTools → Application → Manifest: всі поля коректні
- [ ] "Add to Home Screen" на Android → іконка з'являється
- [ ] iOS Safari → "Add to Home Screen" → standalone режим
- [ ] DevTools → Network → Offline → сторінка завантажується
- [ ] Офлайн → FAQ кнопки працюють (кешовані відповіді)
- [ ] Офлайн → спроба надіслати повідомлення → помилка з поясненням
- [ ] Онлайн після офлайну → SW оновлює кеш
- [ ] Lighthouse PWA score ≥ 90

---

## Загальний чеклист перед кожним PR

```
□ npm run build — без помилок TypeScript
□ npm run lint — без попереджень
□ Lighthouse: Performance ≥ 85, Accessibility ≥ 90
□ Mobile Chrome (Android) — ручне тестування
□ Safari iOS — ручне тестування
□ sessionId ізоляція не зламана (чужі розмови недоступні)
□ Rate limiting не блокує нові endpoints
□ CSP headers дозволяють нові ресурси (SW, push, нові домени)
□ Нові env vars задокументовані в .env.example
□ Нові DB таблиці: drizzle-kit push виконано
```

---

## Залежності (npm пакети)

| Фіча             | Пакет                    | Версія |
| ---------------- | ------------------------ | ------ |
| Push-нагадування | `web-push`               | `^3.6` |
| PWA              | `next-pwa` або ручний SW | —      |

---

_Оновлено: квітень 2026_
