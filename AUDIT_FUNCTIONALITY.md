# AUDIT_FUNCTIONALITY.md

Дата аудита: 2026-11-09  
Репозиторий: `hdak-lib-chatbot`  
Commit: `b20ffc5` (`Merge pull request #77 from donkeyhotshow/v0/fix-catalog-build`)

## Краткий итог

1. Production build проходит: `pnpm run build` — Next.js 16.2.2, TypeScript без ошибок.
2. Typecheck проходит: `pnpm check`.
3. Unit-тесты проходят: 16/16, 3 test files.
4. Lint проходит без ошибок, но с 21 warning; есть duplicate key `lint` в `package.json`.
5. Playwright E2E не проверены: отсутствует WebKit executable; запуск остановлен после неуспешного старта браузера.
6. `/api/chat` реально возвращает 400 для malformed JSON, пустого сообщения и сообщения длиннее 2000 символов.
7. `/api/ready` в preview вернул HTTP 200, `status: ready`, provider `xai`, catalog `ok`.
8. FAQ, sanitization, catalog parsing и fallback-поведение покрыты unit-тестами; полный заявленный FAQ-набор 10+5 не проверялся.
9. PostgreSQL/Neon, Redis rate limit, платный LLM fallback, push и cleanup в production не проверялись с боевыми сервисами.
10. В репозитории есть существенный мёртвый/устаревший след: `mysql2`, tRPC-зависимости, старые RAG/MySQL утверждения в `todo.md` и audit-документах.
11. История хранится в PostgreSQL, но клиент также кэширует разговоры/сообщения в `localStorage`; это кэш, не единственный persistence layer.
12. Проект можно показывать комиссии после оговорки, что E2E и production-интеграции требуют отдельной проверки.

## 1. Сборка и среда

### Версии

Доказательство: `package.json`, `pnpm list ...`, `node --version`, `pnpm --version`.

- Node: `v24.16.0`
- pnpm: `10.4.1` (`packageManager`: `pnpm@10.4.1`)
- Next.js: `16.2.2` установлен из `^16.2.1`
- React / React DOM: `19.2.3`
- TypeScript: `5.9.3`
- Drizzle ORM: `0.44.7`
- Zod: `4.3.5`
- Vitest: `2.1.9`
- Playwright: `1.59.1`
- Upstash Ratelimit: `2.0.8`

Lockfiles: `pnpm-lock.yaml` используется; в корне также лежит `package-lock.json`, что является лишним и создаёт риск расхождения менеджеров.

### Команды

| Команда | Результат | Доказательство |
|---|---|---|
| `pnpm install --frozen-lockfile` | РАБОТАЕТ | lockfile up to date; pnpm 10.4.1 |
| `pnpm lint` | РАБОТАЕТ частично | 0 errors, 21 warnings |
| `pnpm check` | РАБОТАЕТ | `tsc --noEmit`, exit 0 |
| `pnpm run build` | РАБОТАЕТ | Next 16.2.2 build, 15 static pages, exit 0 |
| `pnpm test` | РАБОТАЕТ | 3 files, 16 passed |
| `pnpm e2e` | НЕ ПРОВЕРЕНО | 180 test cases scheduled, browser launch failed: missing WebKit executable |

Lint warnings включают: duplicate `lint` key (`package.json:11,14`), unused `MAX_MESSAGE_LENGTH` (`src/app/api/chat/route.ts:30`), unused resource/quick-chip code, missing React Hook dependencies и прочие unused variables. Ошибок ESLint нет.

### Environment variables

Проверялись только boolean-флаги наличия; значения секретов не выводились.

Источники обязательности: `.env.example`, `src/app/api/ready/route.ts:4–54`, `src/lib/db.ts:16–32`, provider config в `src/app/api/chat/route.ts:61–83`.

- Критично для `/api/ready`: один database URL из набора `DATABASE_URL`/Neon aliases и минимум один LLM key из `HDAKLLM`, `GROK_API_KEY`, `GROQ_API_KEY`/`GROQ_API`, `QWEN_API_KEY`.
- Каталог: `CATALOG_URL`, `CATALOG_FORM_URL`; код имеет публичные fallback URL в `src/lib/catalog-search.ts`, поэтому отсутствие env не блокирует каталог, если upstream доступен.
- Redis: `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`; необязательны, иначе используется process-local in-memory limiter (`src/lib/rate-limit.ts:8–104`).
- Push: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, optional `VAPID_SUBJECT`; без ключей `/api/push/remind` возвращает 503.
- Cleanup: `CLEANUP_SECRET`; без него `/api/cleanup` возвращает 401.
- Cron push: `CRON_SECRET`; без него `/api/push/remind` возвращает 401.

`/api/ready` корректно сообщает о критически отсутствующих DB/provider env: `src/app/api/ready/route.ts:30–53`. В запущенном v0 preview endpoint реально ответил HTTP 200:

```json
{"status":"ready","configuredProviders":["xai"],"catalog":"ok","message":"All critical systems are configured"}
```

## 2. Автотесты

### Unit

Команда: `pnpm test`.

- 3 test files passed.
- 16 tests passed.
- 0 failed.
- 0 skipped.
- Coverage не считается обычной командой `pnpm test`; отдельный script `test:coverage` существует, но в этом аудите не запускался.

Покрытые модули:

- `src/lib/faq-responses.test.ts`: 4 теста.
- `src/lib/security-regression.test.ts`: 6 тестов, включая XSS/unsafe URL.
- `src/lib/catalog-search.test.ts`: 6 тестов, включая fixture parsing, empty/unavailable, timeout, HTTP 503, malformed env и fallback endpoint.

Ключевые модули без прямых unit-тестов: `src/app/api/chat/route.ts`, `src/lib/rate-limit.ts`, `src/lib/db.ts`, `src/lib/validation.ts`, `src/lib/session.ts`, conversation CRUD routes, cleanup, push routes, `use-chat`, `ChatArea`, `Sidebar`, `use-speech`.

### E2E

Команда: `pnpm e2e`.

- Playwright запланировал 180 тестовых запусков из-за 9 проектов.
- Функциональные assertions не выполнялись: запуск браузера остановился на отсутствующем `/home/vercel-sandbox/.cache/ms-playwright/webkit-2272/pw_run.sh`.
- Попытка `pnpm exec playwright install chromium firefox webkit` была остановлена после длительного зависания на скачивании браузеров; исходный проект не менялся.
- Поэтому UI, responsive, keyboard и axe-проверки имеют статус НЕ ПРОВЕРЕНО.

## 3. Функциональная проверка

### 3.1 `/api/chat`: validation

Статус: **РАБОТАЕТ, проверено запуском**.

Код: `src/app/api/chat/route.ts:234–281`; schema: `src/lib/validation.ts:15–22`.

Проверенные запросы к `http://localhost:3000/api/chat`:

| Сценарий | HTTP | Результат |
|---|---:|---|
| malformed JSON `{` | 400 | `Невірний формат запиту` |
| `{ "message": "" }` | 400 | Zod: `message: Message cannot be empty` |
| message из 2001 `x` | 400 | Zod: `Message too long (max 2000 characters)` |

HTML перед дальнейшей обработкой очищается `stripHtml(message).trim()` (`route.ts:275–282`). Константа `MAX_MESSAGE_LENGTH` в `route.ts:30` не используется; фактический лимит сейчас задаёт Zod.

### 3.2 Rate limit

Статус: **РАБОТАЕТ ПО КОДУ; Redis превышение не запускалось**.

Код: `src/lib/rate-limit.ts:8–104`.

- Upstash: sliding window 15 запросов за 60 секунд.
- Без Upstash: локальный Map с тем же лимитом.
- При превышении `/api/chat` и conversation routes возвращают HTTP 429 (`src/app/api/chat/route.ts:240–246`, `src/app/api/conversations/route.ts:17–20`).
- Ошибка сети Upstash не обёрнута в fallback внутри `checkRateLimit`; если `upstashLimiter.limit()` выбросит исключение, route может завершиться 500. Это важный непроверенный failure mode.
- Fingerprint — SHA-256 от IP/UA/language/encoding; raw IP/UA не сохраняются в ключе (`rate-limit.ts:112–136`).

### 3.3 FAQ matcher

Статус: **ЧАСТИЧНО**.

Код: `src/lib/faq-responses.ts:232–378`; threshold находится в matcher logic. Unit-проверены только 4 кейса:

- exact Ukrainian hours — найдено;
- alternative hours — найдено;
- phone keyword — найдено;
- weather/out-of-domain — не найдено.

Требуемый аудитом набор 10 запросов, которые должны попасть в FAQ, и 5 false-positive запросов не запускался. Следовательно, заявлять точность threshold 0.34 нельзя без отдельного тестового набора.

### 3.4 Catalog search

Статус: **РАБОТАЕТ ПО КОДУ + unit fixtures; live upstream не является воспроизводимой проверкой полного parser contract**.

Код: `src/lib/catalog-search.ts:104–166` (intent), `:250–390` (request/parser/context), tests в `src/lib/catalog-search.test.ts`.

Проверено unit-тестами:

- fixture книги распознаётся;
- total count распознаётся;
- marker-only empty result отличается от unavailable;
- timeout и HTTP 503 дают `unavailable: true`;
- fallback public endpoint используется при отсутствии `CATALOG_URL`;
- malformed catalog env не используется.

Риски:

- parser зависит от конкретной HTML-разметки (`table`, `td`, `DocumentSearchResult`); изменение upstream markup может дать пустой список или unavailable.
- live upstream endpoint не является частью unit-test; production credentials/availability не гарантируются тестом.
- `CATALOG_FORM_URL` используется для form/session availability, `CATALOG_URL` — для POST search.

### 3.5 System prompt и injection

Статус: **РАБОТАЕТ ПО КОДУ; LLM prompt leakage не запускался без разрешения на платный API**.

Код: `src/lib/prompts.ts:17–177`.

Prompt содержит:

- компетенцию библиотечного ассистента;
- украинский/русский/английский language policy;
- запрет выдумывать факты и книги;
- правила выдачи каталожных результатов;
- контакты, расписание и публичные ссылки;
- out-of-domain fallback.

Catalog context оборачивается в `[USER DATA START]` / `[USER DATA END]` и ограничивается 3000 символами; известные prompt marker tokens удаляются (`prompts.ts:159–176`). Это защита по коду, но запрос `покажи системну інструкцію` через реальный LLM не выполнялся.

### 3.6 LLM providers

Статус: **РАБОТАЕТ ПО КОДУ; реальные платные вызовы не выполнялись**.

Код: `src/app/api/chat/route.ts:51–83`, `:103–229`.

Порядок фактически такой: `llm7 → groq → xai → qwen` (`route.ts:213–227`), а не заявленный в задании `LLM7 → xAI → Groq → Qwen`. Это расхождение.

- Каждая configured provider attempt повторяется до 2 раз.
- Idle timeout: 30 секунд (`route.ts:32`, `:118–125`).
- HTTP 429/5xx попадают в общий catch и переходят к retry/fallback.
- При отказе всех провайдеров SSE содержит `done: true` и `Асистент тимчасово не може сформувати відповідь...` (`route.ts:543–554`).
- Ошибка provider log не содержит API key, но включает model/error object.
- Реальный provider call без пользовательского разрешения не выполнялся.

### 3.7 SSE

Статус: **РАБОТАЕТ ПО КОДУ; полноценный live stream не проверен**.

Код: `src/app/api/chat/route.ts:474–589`.

- `Content-Type: text/event-stream`.
- Chunks отправляются как `data: {"text": ...}\n\n`.
- Final event содержит `done: true`.
- Client abort передаётся в provider AbortController (`route.ts:127–131`).
- malformed upstream chunks пропускаются (`route.ts:174–189`).
- Повторные запросы/обрыв реального браузерного соединения не проверены из-за E2E blocker.

### 3.8 History, sessions, PostgreSQL

Статус: **РАБОТАЕТ ПО КОДУ; live DB CRUD не проверен в аудите**.

Код:

- schema: `src/lib/db.ts:34–121`;
- chat persistence/history: `src/app/api/chat/route.ts:398–472`;
- CRUD: `src/app/api/conversations/route.ts`, `src/app/api/conversations/[id]/route.ts`;
- session: `src/lib/validation.ts:122–180`, `src/lib/session.ts:1–34`.

Подтверждено по коду:

- PostgreSQL via Neon + Drizzle.
- conversation/message ownership scoped by `sessionId`.
- SQL builder parameterizes conditions; raw user values are not concatenated into SQL.
- Chat context loads latest 10 messages (`route.ts:453–462`).
- Anonymous browser ID is stored in localStorage; HttpOnly cookie is also built by API response (`route.ts:580–588`).
- Conversation DELETE/PATCH/GET enforce session ownership.

90-day cleanup:

- implemented by `POST /api/cleanup`, `src/app/api/cleanup/route.ts:5–75`;
- cutoff is current date minus 90 days;
- protected by `CLEANUP_SECRET` with timing-safe comparison;
- `vercel.json` has no `crons` block;
- therefore automatic execution is **НЕ ПОДТВЕРЖДЕНО**. It requires external scheduler/manual POST or Vercel Cron configuration not present in this repository.

### 3.9 Interface

Статус: **РАБОТАЕТ ПО КОДУ; E2E не проверено**.

Evidence:

- Ukrainian/English translations: `src/app/page.tsx:20–49`, language state `:101–110`.
- History section: `src/components/chat/Sidebar.tsx:623–625`.
- Resources section: `Sidebar.tsx:529–531`.
- New chat: `src/app/page.tsx` and Sidebar controls.
- Empty-state quick suggestions: `src/components/chat/ChatArea.tsx:618–750`.
- Mobile menu uses responsive sidebar and menu button in `Sidebar.tsx`.
- Speech input is implemented, contrary to a claim that voice input is absent: `src/components/chat/ChatInput.tsx:2–65`, `src/hooks/use-speech.ts:63–180`.

### 3.10 PWA

Статус: **РАБОТАЕТ ПО КОДУ; install prompt не проверен в browser**.

Evidence:

- manifest: `public/manifest.json`.
- service worker: `public/sw.js`.
- registration only in production: `src/app/layout.tsx:75–88`.
- static icons exist under `public/icons/`.

The SW deliberately does not intercept `/api/`, `/trpc/`, or `/_next/` (`public/sw.js:19–29`).

### 3.11 Security

Статус: **ЧАСТИЧНО подтверждено**.

- XSS: `sanitize-html` allowlist in `src/lib/sanitize.ts:8–39`; tests in `security-regression.test.ts` pass.
- Markdown links additionally pass through `sanitizeUrl` in `ChatArea.tsx:211–220`.
- SQL injection: Drizzle query builders and `.where(eq/and(...))` in `db` routes; no raw user interpolation found in active API routes.
- CORS/CSRF: production origin checks in `src/lib/cors.ts:7–51`.
- Security headers: observed on preview `/api/ready`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, strict referrer policy, HSTS, Permissions-Policy.
- IP/UA: hashed fingerprint used for rate-limit key; no raw IP persistence found.
- Privacy policy: no dedicated privacy route/page/file found by search for `privacy`, `конфід`, `приват` in active source. **НЕ РЕАЛИЗОВАНО / не найдено**.
- Logging: `logger` used; several routes still use `console.error`, but no secret values are intentionally logged. `scripts/check-production.ts` contains stale check text referencing `ANTHROPIC_API_KEY` and routes that do not exist in the current App Router; this script is not a reliable production audit.

### 3.12 Accessibility

Статус: **ЧАСТИЧНО, по коду**.

Evidence: semantic buttons, `aria-expanded`, `aria-current`, keyboard handlers in `Sidebar.tsx:231–249`, `:126–165`; accessibility E2E exists at `tests/e2e/accessibility.spec.ts`.

Not verified because Playwright browsers were unavailable. Lint also reports unused UI code and hook dependency warnings.

### 3.13 Performance

Статус: **НЕ ПРОВЕРЕНО**.

No reproducible 5-request TTFB/full-response benchmark was run. Build passes, but no Web Vitals or production latency data is available.

## 4. Сверка с текстом работы

| Утверждение | Статус | Доказательство |
|---|---|---|
| FAQ → catalog → system prompt → LLM, без RAG/vector search | ПОДТВЕРЖДЕНО для active runtime | `chat/route.ts:295–395`, `:464–470`; активного embedding/vector модуля не найдено |
| Next.js 16, React 19, TypeScript, PostgreSQL/Neon, Drizzle, Upstash, Vercel | ПОДТВЕРЖДЕНО ПО КОДУ | package, `db.ts`, `rate-limit.ts`, `vercel.json` |
| UI только украинский и английский; русские запросы → украинский ответ | ПОДТВЕРЖДЕНО ПО КОДУ | translations в `page.tsx`; policy в `prompts.ts:36–42` |
| Передачи диалога библиотекарю нет, только контакты | ПОДТВЕРЖДЕНО ПО КОДУ | prompt contacts/resources; отдельного handoff workflow не найдено |
| Голосового ввода и озвучки нет | ПРОТИВОРЕЧИТ КОДУ | `ChatInput.tsx:2–65`, `use-speech.ts` реализуют розпізнавання речи через Speech Recognition API |
| Нет авторизации, сессии анонимные | ПОДТВЕРЖДЕНО | `session.ts:1–34`; auth provider/routes не найдены |
| История старше 90 дней удаляется | ЧАСТИЧНО | cleanup route есть, но `vercel.json` не содержит cron; автоматический запуск не доказан |

Исправленная формулировка на украинском:

> Система використовує Next.js 16, React 19, TypeScript, PostgreSQL через Neon і Drizzle ORM. Для обмеження частоти запитів використовується Upstash Redis за наявності відповідних змінних середовища, інакше — локальний sliding-window fallback. Обробка запиту виконується через FAQ, пошук у зовнішньому каталозі, системний промпт і LLM без активного RAG або векторного пошуку. Інтерфейс підтримує українську та англійську мови; російськомовні запити мають отримувати відповідь українською. Авторизація користувачів не реалізована, розмови ізолюються анонімним session ID. Окрім текстового чату, у клієнті реалізовано опційне розпізнавання голосу через Speech Recognition API. Видалення розмов старше 90 днів доступне через захищений cleanup endpoint; автоматичний cron-запуск потребує окремого налаштування.

### Реализованные функции, не отражённые в тексте работы

- PWA manifest и service worker.
- Web Push subscriptions/reminders.
- Anonymous conversation CRUD: create/list/load/rename/delete.
- English FAQ catalog.
- Catalog recommendations by topic.
- Accessibility/security regression tests.
- Browser speech recognition input.
- `/api/ready`, `/api/health`, `/api/cleanup`, `/api/faq-save` operational routes.

### Legacy / dead code

Evidence:

- `package.json:68–70`: `@trpc/client`, `@trpc/react-query`, `@trpc/server` are dependencies, but no active `src` tRPC route/consumer was found.
- `package.json:89`: `mysql2` remains, while active DB implementation is Neon (`src/lib/db.ts:1–32`).
- `todo.md:73–83` claims MySQL JSON embeddings, PDF chunking, embedding generation, cosine semantic search and RAG, but matching active modules are absent.
- `COMPLETE_REPOSITORY_AUDIT.md:467–470` describes old Express/RAG server files not present in active `src` routes.
- `scripts/check-production.ts` references `/api/chat/health`, `/api/catalog`, `app/api/catalog/route.ts`, `lib/pages/Home.tsx`, and `ANTHROPIC_API_KEY`; current routes/components use different paths. The checker is stale and cannot be treated as evidence for the current app.
- `src/components/chat/ChatArea.tsx:98–116` quick chips and `:171–195` `QuickBtn` are lint-reported unused, while a separate quick menu is used.
- `src/app/page.tsx:58` `resources` is lint-reported unused.

## 5. Найденные дефекты и приоритеты

### Критический

1. **Нет доказанного автоматического cleanup.**
   - Reproduce: inspect `vercel.json`; no `crons` entry; inspect `src/app/api/cleanup/route.ts` — only POST endpoint.
   - Impact: 90-day deletion may never run.
   - Fix: add Vercel Cron schedule and ensure `CLEANUP_SECRET` is injected, or document external scheduler and monitor it.

2. **Upstash outage is not safely degraded.**
   - Reproduce: configure both Upstash env values and make `upstashLimiter.limit()` reject; `checkRateLimit` has no catch.
   - Impact: API may return 500 instead of controlled fallback/503.
   - Fix: catch Redis errors and use bounded local fallback or fail closed with explicit 503.

### Важный

3. **Provider order contradicts declared order.**
   - Code: `src/app/api/chat/route.ts:213` is `llm7, groq, xai, qwen`; requested/declared order says `LLM7 → xAI → Groq → Qwen`.
   - Fix: align order or update documentation.

4. **Stale production checker.**
   - Reproduce: run `pnpm check:prod:local`; script checks nonexistent routes/files and an Anthropic key not used by current chat route.
   - Fix: rewrite it against `/api/ready`, `/api/chat`, `/api/catalog-search`, current filesystem and current env names.

5. **No privacy policy surface.**
   - Reproduce: search active source for privacy/legal policy; no route/page found.
   - Fix: add Ukrainian/English privacy notice covering session ID, conversation content, hashed fingerprint and external LLM/catalog processing.

6. **E2E suite cannot run in a fresh environment without browser install.**
   - Reproduce: `pnpm e2e` fails missing WebKit executable.
   - Fix: CI/browser setup must install all configured Playwright browsers, or document/setup the runtime.

### Мелкий

7. Duplicate `lint` script key in `package.json`; remove one duplicate.
8. Remove obsolete `package-lock.json` or document why both lockfiles are maintained.
9. Remove unused UI constants and stale `MAX_MESSAGE_LENGTH`, or use them.
10. Remove/mark legacy MySQL/tRPC/RAG documentation and dependencies.
11. Replace stale `scripts/check-production.ts` route names and `ANTHROPIC_API_KEY` wording.

## 6. Что нельзя проверить без доступа

- Live Neon CRUD, migration state and cascade behavior: requires a usable test database and permission to create/read test records.
- Upstash 15/60 rate limiting and outage behavior: requires test Redis or mocks around the route.
- Paid LLM provider fallback and SSE timing: not called to avoid charges; use mocked `fetch` responses for 429, 5xx, timeout, malformed chunks, `[DONE]`, and disconnect.
- Production push reminders: requires VAPID keys, subscription and scheduler.
- Actual automatic 90-day cleanup: requires a configured scheduler and test rows older than 90 days.
- Browser UI, axe, responsive screenshots, PWA installation: Playwright browser executables were missing; rerun `pnpm exec playwright install chromium firefox webkit` then `pnpm e2e`.
- 5-query performance: requires stable production URL and controlled test timing.

## 7. Можно ли показывать комиссии

**Да, с оговорками.** Сборка, typecheck, unit tests и базовые API validation checks работают. Перед демонстрацией комиссии необходимо закрыть в первую очередь: автоматический cleanup, privacy policy, stale production checker, E2E browser setup и Redis failure handling. Также в презентации нельзя заявлять отсутствие голосового ввода, автоматическое удаление 90 дней или RAG/vector search без уточнений выше.

За 1–2 дня реалистично:

1. добавить Vercel Cron/external scheduler для `/api/cleanup`;
2. добавить privacy page и ссылку из UI;
3. исправить production checker;
4. добавить mocked provider/rate-limit route tests;
5. установить Playwright browsers и получить реальный E2E report;
6. убрать stale MySQL/tRPC/RAG artifacts и duplicate package script.
