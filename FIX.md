# FIX.md — Аналіз багів і план виправлення

> Версія: квітень 2026 · Проект: hdak-lib-chatbot v0.2.0

---

## 🔴 Критичні баги

### C1 · `use-chat.ts` — sessionHeaders читає localStorage при монтуванні, не при кожному запиті

`sessionHeadersRef` ініціалізується один раз. Якщо localStorage недоступний при першому рендері (SSR, приватний режим) — `getSessionId()` повертає `''` і всі запити йдуть без заголовка сесії.

**Файл:** `src/hooks/use-chat.ts:73-76`
**Виправлення:**

```ts
const sessionIdRef = useRef("");
useEffect(() => {
  sessionIdRef.current = getSessionId();
}, []);
const sessionHeaders = () => ({ [SESSION_HEADER]: sessionIdRef.current });
```

---

### C2 · `use-chat.ts` — зайвий `convOffset` state (видалений, але `setConvOffset` ще викликається)

`convOffset` state прибрали на користь `convOffsetRef`, але `setConvOffset` ще викликається — зайві ре-рендери.

**Файл:** `src/hooks/use-chat.ts:57, 130, 290`
**Виправлення:** Видалити `useState(0)` для convOffset, використовувати тільки `convOffsetRef.current`.

---

### ~~C3~~ ✅ · `sanitize.ts` — `data:` видаляється з будь-якого тексту, не тільки з URL

`replace(/data:/gi, '')` видаляє підрядок "data:" з будь-якого тексту, включаючи легітимний ("data: дані про...").

**Файл:** `src/lib/sanitize.ts:10-12`
**Виправлення:** Видаляти небезпечні схеми тільки в контексті href/src атрибутів, або прибрати цей replace для plain text.

---

## 🟠 Високі баги

### H1 · `Sidebar.tsx` — hydration mismatch: `isLibraryOpen()` при SSR vs клієнт

`useState(() => isLibraryOpen())` — при SSR серверний час може відрізнятись від клієнтського → hydration mismatch.

**Файл:** `src/components/chat/Sidebar.tsx:228`
**Виправлення:**

```ts
const [open, setOpen] = useState(false);
useEffect(() => {
  try {
    setOpen(isLibraryOpen());
  } catch {}
}, []);
```

---

### H2 · `use-chat.ts` — `retryLastMessage` не скидає `isTypingRef`

Якщо `handleSend` завершується з помилкою і `isTypingRef.current` залишається `true` — наступний `retryLastMessage` буде заблокований.

**Файл:** `src/hooks/use-chat.ts:490`
**Виправлення:** Додати `isTypingRef.current = false;` перед `handleSend` в `retryLastMessage`.

---

### H3 · `ChatArea.tsx` — `lastMsgHasCatalog` перевіряє останнє повідомлення будь-якої ролі

`last` = останнє повідомлення (може бути USER). Перевірка `[РЕЗУЛЬТАТИ КАТАЛОГУ]` на USER повідомленні завжди false → chips показуються некоректно.

**Файл:** `src/components/chat/ChatArea.tsx:148-160`
**Виправлення:** `hasCatalog` перевіряти по `lastAssistant`, а не по `last`.

---

### H4 · `use-chat.ts` — `loadConversation` не скидає `isTypingRef`

При переключенні розмови `setIsTyping(false)` викликається, але `isTypingRef.current` не скидається → нова розмова може бути заблокована.

**Файл:** `src/hooks/use-chat.ts:140-145`
**Виправлення:** Додати `isTypingRef.current = false;` в `loadConversation`.

---

### H5 · `conversations/route.ts` — GET повертає 200 з порожнім списком при відсутності sessionId

Клієнт вважає що розмов немає і не робить повторний запит після ініціалізації сесії.

**Файл:** `src/app/api/conversations/route.ts:22-25`
**Виправлення:** Повертати флаг `sessionRequired: true` або клієнт повинен гарантувати sessionId до першого fetch.

---

## 🟡 Середні проблеми

### M1 · `ChatInput.tsx` — `aria-describedby` вказує на елемент прихований на мобільних

`input-hint` прихований через `display: none` на мобільних, але `aria-describedby` все ще вказує на нього.

**Файл:** `src/components/chat/ChatInput.tsx:57`
**Виправлення:** Використовувати `.sr-only` замість `display: none` для мобільних.

---

### M2 · `Sidebar.tsx` — активна розмова не має `aria-current`

Screen readers не розуміють яка розмова активна.

**Файл:** `src/components/chat/Sidebar.tsx:175`
**Виправлення:** `<div role="button" aria-current={isActive ? 'page' : undefined} ...>`

---

### M3 · `ChatArea.tsx` — `MessageBubble` без семантичної ролі

Повідомлення рендеряться як `<motion.div>` без `role` — screen readers не розуміють структуру чату.

**Файл:** `src/components/chat/ChatArea.tsx:90`
**Виправлення:** `<motion.div role="article" aria-label={isUser ? 'Ваше повідомлення' : 'Відповідь асистента'} ...>`

---

### M4 · `rate-limit.ts` — `maybePurge` не викликається при нормальному розмірі мапи

При нормальному трафіку expired entries накопичуються між purge-ами (5 хв).

**Файл:** `src/lib/rate-limit.ts:55`
**Виправлення:** Викликати `maybePurge(windowMs)` на початку `checkRateLimitMemory` завжди.

---

### M5 · `catalog-search.ts` — нормальний шлях не повертає `unavailable: false` явно

Споживачі можуть не перевіряти `unavailable` і вважати `books.length === 0` завжди "не знайдено".

**Файл:** `src/lib/catalog-search.ts:155`
**Виправлення:** `return { books, total, unavailable: false as const };`

---

### M6 · `layout.tsx` — Poppins завантажується без weight 500

CSS використовує `font-weight: 500` (sidebar-text, quick-btn-text), але weight 500 не завантажується → браузер синтезує.

**Файл:** `src/app/layout.tsx:12`
**Виправлення:** `weight: ["400", "500", "600", "700"]`

---

### ~~M7~~ ✅ · `next.config.ts` — security headers додані

Security headers є тільки в `next.config.ts`. При деплої через Vercel CLI без Next.js — headers не застосовуються.

**Файл:** `vercel.json`
**Виправлення:** Дублювати критичні headers в `vercel.json` або задокументувати.

---

## 🔵 UI/UX проблеми

### UX1 · Немає skeleton loader при завантаженні списку розмов

При першому відкритті sidebar показує "Розмов ще немає" поки іде fetch.

**Виправлення:** Додати `isLoadingConversations: boolean` в `useChat` і skeleton в sidebar.

---

### UX2 · Кнопка "Показати ще..." без індикатора завантаження

Користувач може клікнути кілька разів — немає feedback.

**Файл:** `src/components/chat/Sidebar.tsx:310`
**Виправлення:** Додати `isLoadingMore` стан і disabled/spinner на кнопці.

---

### UX3 · Кнопка копіювання невидима на мобільних (тільки hover)

`md:opacity-0 md:group-hover:opacity-100` — на touch-пристроях hover не спрацьовує.

**Файл:** `src/components/chat/ChatArea.tsx:107`
**Виправлення:** `className="... opacity-100 md:opacity-0 md:group-hover:opacity-100 ..."`

---

### ~~UX4~~ ✅ · Sidebar на мобільних не закривається свайпом

Стандартний жест drawer (swipe left) не підтримується.

**Виправлення:** Додати `onPan` handler від framer-motion для swipe-to-close.

---

### UX5 · Поле вводу не фокусується при відкритті нової розмови

Користувач повинен клікнути вручну після `createNewConversation` або `loadConversation`.

**Файл:** `src/components/chat/ChatInput.tsx`
**Виправлення:** Додати `autoFocus` prop або `textareaRef.current?.focus()` при зміні `currentConversation`.

---

### UX6 · Статус бібліотеки при `open === false` не враховує суботній графік

Показує "Пн–Пт 9:00–16:45" навіть якщо сьогодні субота.

**Файл:** `src/components/chat/Sidebar.tsx:270`
**Виправлення:** Показувати "Сб: 9:00–13:30" якщо сьогодні субота і бібліотека закрита.

---

### UX7 · Пошук в sidebar тільки при `conversations.length >= 3`

Поріг 3 — довільний. При 2 розмовах пошук недоступний.

**Файл:** `src/components/chat/Sidebar.tsx:295`
**Виправлення:** Показувати пошук при `conversations.length >= 2`.

---

### ~~UX8~~ ✅ · Заголовок розмови в sidebar не оновлюється одразу після першого повідомлення

Оновлення через `refreshConversations()` з debounce 300ms — може бути затримка.

**Виправлення:** Оновлювати заголовок в локальному стані одразу після отримання `conversationId` з SSE.

---

## ⚪ Низькі проблеми

| #         | Проблема                                                  | Файл                   | Виправлення                   |
| --------- | --------------------------------------------------------- | ---------------------- | ----------------------------- |
| L1        | `simulated` поле в `Message` ніде не використовується     | `types.ts:6`           | Видалити або реалізувати      |
| L2        | `.sidebar-section-divider` CSS клас не використовується   | `globals.css`          | Видалити                      |
| ~~L3~~ ✅ | `images.minimumCacheTTL: 86400` — встановлено             | `next.config.ts`       | Виправлено                    |
| L4        | `ErrorBoundary` "Спробувати знову" не перезавантажує дані | `ErrorBoundary.tsx:28` | Передавати `onReset` callback |
| L5        | Відсутній `maxDuration` для `faq-save` route              | `vercel.json`          | Додати `"maxDuration": 15`    |

---

## Пріоритетний план виправлення

### Sprint 1 — Критичні + Блокуючі (1 день)

```
C1 — sessionHeaders ініціалізація          use-chat.ts        S
C2 — видалити зайвий convOffset state      use-chat.ts        S
H2 — isTypingRef в retryLastMessage        use-chat.ts        XS
H3 — lastMsgHasCatalog логіка              ChatArea.tsx       S
H4 — isTypingRef в loadConversation        use-chat.ts        XS
```

### Sprint 2 — UX (2 дні)

```
H1 — hydration mismatch Sidebar            Sidebar.tsx        S
UX1 — skeleton loader для розмов           Sidebar.tsx        M
UX2 — loading state "Показати ще"          Sidebar.tsx        S
UX3 — кнопка копіювання на мобільних      ChatArea.tsx       XS
UX5 — автофокус textarea                   ChatInput.tsx      S
UX6 — статус суботи                        Sidebar.tsx        S
```

### Sprint 3 — Accessibility + Low (1 день)

```
M1 — aria-describedby мобільний           ChatInput.tsx      XS
M2 — aria-current активна розмова         Sidebar.tsx        XS
M3 — role="article" повідомлення          ChatArea.tsx       XS
M6 — Poppins weight 500                   layout.tsx         XS
L1 — видалити simulated поле              types.ts           XS
L2 — видалити мертвий CSS                 globals.css        XS
L3 — збільшити image cache TTL            next.config.ts     XS
L5 — maxDuration faq-save                 vercel.json        XS
```

---

## Чеклист перевірки після виправлень

```
□ npm run build — без помилок TypeScript
□ npm run lint — без попереджень
□ sessionId ізоляція: два браузери — розмови не перетинаються
□ Мобільний Chrome: кнопка копіювання видима без hover
□ Safari iOS: sidebar закривається свайпом
□ VoiceOver/NVDA: активна розмова оголошується як "поточна сторінка"
□ Lighthouse Accessibility ≥ 90
□ Після помилки з'єднання retry працює коректно
□ При переключенні розмов isTypingRef скидається
□ Skeleton показується при першому завантаженні розмов
```

---

_Оновлено: квітень 2026_

---

## 🔴 Нові критичні баги (Wave 2)

### C4 · `use-toast.ts` — глобальний стан модуля витікає між запитами при SSR

`memoryState`, `listeners`, `toastTimeouts`, `count` — module-level змінні. В Next.js при server-side rendering або hot reload вони не очищаються між запитами. Toast від одного запиту може з'явитись в іншому.

**Файл:** `src/hooks/use-toast.ts:28, 59, 134`
**Виправлення:** Перенести стан в React context або використовувати `useRef` всередині компонента.

---

### ~~C5~~ ✅ · `use-chat.ts:359` — `refreshConversations()` викликається без `await`

Після успішного стріму `refreshConversations()` викликається fire-and-forget. Якщо компонент розмонтується до завершення debounce (300ms) — `isMountedRef.current = false`, але `refreshDebounceRef.current` вже запущений і виконається.

**Файл:** `src/hooks/use-chat.ts:359`
**Виправлення:** `await refreshConversations()` або перевіряти `isMountedRef` всередині debounce (вже є, але без await результат ігнорується).

---

### C6 · `use-chat.ts:480` — FAQ save fetch з `.catch(() => {})` — помилки повністю ігноруються

Якщо `/api/faq-save` повертає помилку або мережа недоступна — розмова не зберігається в БД, але користувач не отримує жодного feedback. Розмова зникне після перезавантаження.

**Файл:** `src/hooks/use-chat.ts:480`
**Виправлення:** Логувати помилку або показувати toast "Розмову не вдалося зберегти".

---

## 🟠 Нові високі баги (Wave 2)

### H6 · `use-chat.ts:450` — `typeIntervalRef.current!` — non-null assertion може крашнути

`clearInterval(typeIntervalRef.current!)` — якщо `typeIntervalRef.current` вже `null` (наприклад, `handleStop` очистив його між перевіркою і викликом) — `clearInterval(null!)` не крашне, але `!` приховує потенційну проблему.

**Файл:** `src/hooks/use-chat.ts:450`
**Виправлення:** `if (typeIntervalRef.current) { clearInterval(typeIntervalRef.current); typeIntervalRef.current = null; }`

---

### H7 · `prompts.ts:22` — `_promptCache!.value` — non-null assertion після перевірки

`if (cacheValid) return _promptCache!.value` — `cacheValid` перевіряє `_promptCache &&`, тому `!` зайвий, але якщо логіка зміниться — може крашнути.

**Файл:** `src/lib/prompts.ts:22`
**Виправлення:** `return _promptCache?.value ?? ''` або `return (_promptCache as NonNullable<typeof _promptCache>).value`

---

### H8 · `catalog-search.ts:157` — `parseInt(countMatch[2])` без radix

`parseInt(countMatch[2])` без другого аргументу. Якщо рядок починається з `0` — в старих браузерах може парситись як octal.

**Файл:** `src/lib/catalog-search.ts:157`
**Виправлення:** `parseInt(countMatch[2], 10)`

---

### H9 · `use-mobile.ts` — `window.matchMedia` без SSR guard

`useIsMobile` викликає `window.matchMedia` в `useEffect` — це нормально. Але `useState<boolean>(false)` ініціалізується `false` на сервері і `true` на клієнті якщо мобільний → hydration mismatch.

**Файл:** `src/hooks/use-mobile.ts:6`
**Виправлення:** `useState<boolean | undefined>(undefined)` і повертати `undefined` до mount.

---

### H10 · `chat/route.ts:157` — `parseInt(contentLength)` без radix

`parseInt(contentLength)` — Content-Length завжди десятковий, але краще явно.

**Файл:** `src/app/api/chat/route.ts:157`
**Виправлення:** `parseInt(contentLength, 10)`

---

## 🟡 Нові середні проблеми (Wave 2)

### M8 · `use-chat.ts` — `isLoadingConversations` state є, але не передається в Sidebar

`setIsLoadingConversations` встановлюється в `true` при монтуванні, але `isLoadingConversations` не повертається з `useChat` і не передається в `Sidebar`. Skeleton loader (UX1) неможливо реалізувати без цього.

**Файл:** `src/hooks/use-chat.ts:57`, `src/hooks/use-chat.ts:UseChatReturn`
**Виправлення:** Додати `isLoadingConversations` в `UseChatReturn` і передавати в `Sidebar`.

---

### M9 · `ChatArea.tsx:198` — `style={{ animationDelay }}` в JSX — inline object при кожному рендері

`style={{ animationDelay: \`${i \* 0.1}s\` }}` — новий об'єкт при кожному рендері. Для 3 елементів — 3 нових об'єкти. Незначно, але порушує принцип.

**Файл:** `src/components/chat/ChatArea.tsx:198`
**Виправлення:** Винести в CSS клас або `useMemo`.

---

### M10 · `use-chat.ts:171` — `loadConversation` catch без типізації помилки

`} catch {` без змінної — не можна перевірити тип помилки (наприклад, `AbortError` при переключенні розмов).

**Файл:** `src/hooks/use-chat.ts:171`
**Виправлення:**

```ts
} catch (err) {
  if (err instanceof Error && err.name === 'AbortError') return;
  setError('Немає з\'єднання...');
}
```

---

### M11 · `use-chat.ts:527` — `loadMoreConversations` catch без типізації

Аналогічно — `} catch {` без перевірки `AbortError`.

**Файл:** `src/hooks/use-chat.ts:527`
**Виправлення:** Аналогічно M10.

---

### M12 · `robots.txt` — hardcoded URL `hdak-lib-chatbot.vercel.app`

Sitemap URL захардкоджений. При зміні домену — robots.txt буде вказувати на старий URL.

**Файл:** ~~`public/robots.txt:5`~~ ✅ видалено, використовується `src/app/robots.ts`
**Виправлення:** Генерувати динамічно через `src/app/robots.ts` (Next.js metadata API).

---

### M13 · `sitemap.xml` — відсутній `<lastmod>` і hardcoded URL

Без `<lastmod>` пошукові системи не знають коли сторінка оновлювалась. URL захардкоджений.

**Файл:** `public/sitemap.xml`
**Виправлення:** Генерувати через `src/app/sitemap.ts` (Next.js metadata API).

---

### M14 · `use-toast.ts` — `TOAST_REMOVE_DELAY = 2000` конфліктує з `duration` prop

`useChat` передає `toast({ duration: 2000 })`. Radix Toast використовує `duration` для auto-dismiss. `TOAST_REMOVE_DELAY` — окремий таймер для видалення з DOM після dismiss. Якщо `duration < TOAST_REMOVE_DELAY` — toast зникне з UI але залишиться в DOM ще 2s.

**Файл:** `src/hooks/use-toast.ts:12`
**Виправлення:** Синхронізувати `TOAST_REMOVE_DELAY` з `duration` або збільшити до 3000ms.

---

### M15 · `constants.ts` — URL каталогу дублюється в двох місцях

`LIBRARY.links.catalogSearch` і `ALL_LINKS.catalog_search` — однаковий URL в двох місцях. При зміні URL — треба оновлювати обидва.

**Файл:** `src/lib/constants.ts:51, 121`
**Виправлення:** `catalog_search: LIBRARY.links.catalogSearch` або видалити `LIBRARY.links`.

---

### M16 · `ChatInput.tsx` — `prevValueRef` ініціалізується значенням `inputValue` при першому рендері

Якщо компонент монтується з непорожнім `inputValue` (наприклад, при SSR або тестах) — `prevValueRef.current !== ''` буде `true` і при першому очищенні висота скинеться некоректно.

**Файл:** `src/components/chat/ChatInput.tsx:20`
**Виправлення:** `const prevValueRef = useRef<string | null>(null)` і перевіряти `prevValueRef.current !== null && prevValueRef.current !== ''`.

---

## 🔵 Нові UX проблеми (Wave 2)

### UX9 · `toast.tsx` — кнопка закриття toast невидима без hover (`opacity-0`)

`ToastClose` має `opacity-0` і `group-hover:opacity-100`. На мобільних hover не спрацьовує — toast не можна закрити вручну.

**Файл:** `src/components/ui/toast.tsx:68`
**Виправлення:** `opacity-100` на мобільних або завжди показувати кнопку закриття.

---

### UX10 · `Sidebar.tsx` — пошук розмов чутливий до регістру тільки для латиниці

`c.title.toLowerCase().includes(search.toLowerCase())` — `toLowerCase()` для кирилиці працює коректно в JS, але `toLocaleLowerCase('uk')` більш надійний для українських символів.

**Файл:** `src/components/chat/Sidebar.tsx:240`
**Виправлення:** `c.title.toLocaleLowerCase('uk').includes(search.toLocaleLowerCase('uk'))`

---

### ~~UX11~~ ✅ · `ChatArea.tsx` — `isLoadingConversation` показує dots без тексту опису

Loading indicator показує 3 крапки і "Завантаження..." але не вказує що саме завантажується. При повільному з'єднанні — незрозуміло.

**Файл:** `src/components/chat/ChatArea.tsx:193`
**Виправлення:** "Завантаження розмови..." або додати назву розмови.

---

### ~~UX12~~ ✅ · `page.tsx` — `window.innerWidth` замінений на `useIsMobile()`

`if (window.innerWidth < 768)` в обробнику click і keydown — перевіряється при кожному кліку. Краще використовувати `useIsMobile()` хук.

**Файл:** `src/app/page.tsx:36, 41`
**Виправлення:** Замінити на `const isMobile = useIsMobile()` і перевіряти `isMobile`.

---

## ⚪ Нові низькі проблеми (Wave 2)

| #          | Проблема                                                                                                                   | Файл                                  | Виправлення                                                 |
| ---------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------- |
| ~~L6~~ ✅  | `use-mobile.ts` використовується в `page.tsx`                                                                              | `src/hooks/use-mobile.ts`             | Виправлено (UX12)                                           |
| L7         | `tw-animate-css` в dependencies, але не в devDependencies                                                                  | `package.json`                        | Перенести в devDependencies                                 |
| L8         | `sharp` в dependencies — потрібен тільки для image optimization                                                            | `package.json`                        | Перенести в devDependencies або optionalDependencies        |
| L9         | `clsx` і `tailwind-merge` — обидва встановлені, але `cn()` вже об'єднує їх                                                 | `package.json`                        | Нормально, але можна замінити на `clsx` + inline merge      |
| ~~L10~~ ✅ | `tsconfig.json` — `allowJs` видалено (немає .js файлів в src/)                                                             | `tsconfig.json`                       | Виправлено                                                  |
| L11        | `drizzle.config.ts` — `verbose: true` в production                                                                         | `drizzle.config.ts`                   | Встановити `verbose: process.env.NODE_ENV !== 'production'` |
| L12        | `catalog-search.ts` — URL каталогу в `constants.ts` і в `catalog-search.ts` — різні (одна для форми, інша для результатів) | `src/lib/catalog-search.ts:6-7`       | Задокументувати різницю                                     |
| L13        | `ErrorBoundary` не логує в production monitoring (Sentry, etc.)                                                            | `src/components/ErrorBoundary.tsx:26` | Додати інтеграцію з error tracking                          |

---

## Оновлений пріоритетний план

### Sprint 1 — Критичні (1 день)

```
C4 — use-toast глобальний стан SSR leak        use-toast.ts       M
C5 — refreshConversations без await            use-chat.ts        XS
C6 — FAQ save silent catch                     use-chat.ts        S
+ всі попередні C1-C3
```

### Sprint 2 — Нові High (1 день)

```
H6 — non-null assertion typeIntervalRef        use-chat.ts        XS
H7 — non-null assertion _promptCache           prompts.ts         XS
H8 — parseInt без radix в catalog-search       catalog-search.ts  XS
H9 — useIsMobile hydration mismatch            use-mobile.ts      S
H10 — parseInt без radix в chat route          chat/route.ts      XS
```

### Sprint 3 — Середні (1 день)

```
M8 — isLoadingConversations не передається     use-chat.ts        S
M10/M11 — catch без AbortError check           use-chat.ts        S
M12/M13 — robots.txt і sitemap динамічні       public/            M
M14 — TOAST_REMOVE_DELAY синхронізація         use-toast.ts       S
M15 — дублювання URL каталогу                  constants.ts       S
UX9 — toast close button мобільні              toast.tsx          XS
UX10 — toLocaleLowerCase для пошуку            Sidebar.tsx        XS
```

### Sprint 4 — Low (0.5 дня)

```
L6 — видалити use-mobile або використати       use-mobile.ts      XS
L7/L8 — package.json dependencies             package.json       XS
L10 — tsconfig checkJs                         tsconfig.json      XS
L11 — drizzle verbose                          drizzle.config.ts  XS
```

---

## Повний чеклист перевірки (оновлений)

```
□ npm run build — без помилок TypeScript
□ npm run lint — без попереджень
□ npm run type-check — без помилок
□ sessionId ізоляція: два браузери — розмови не перетинаються
□ Мобільний Chrome: кнопка копіювання видима без hover
□ Мобільний Chrome: toast можна закрити вручну
□ Safari iOS: sidebar закривається свайпом
□ VoiceOver/NVDA: активна розмова оголошується як "поточна сторінка"
□ Lighthouse Accessibility ≥ 90
□ Lighthouse Performance ≥ 85
□ Після помилки з'єднання retry працює коректно
□ При переключенні розмов isTypingRef скидається
□ Skeleton показується при першому завантаженні розмов
□ FAQ save помилка показує toast користувачу
□ Toast auto-dismiss через duration ms
□ Пошук розмов працює з кириличними символами
□ robots.txt і sitemap.xml вказують на правильний домен
```

---

_Оновлено: квітень 2026 (Wave 2 — додано 6 критичних/high, 9 medium, 8 low)_
