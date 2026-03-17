# hdak-lib-chatbot

AI-чатбот для бібліотеки ХДАК / KSAC на Next.js + TypeScript + Drizzle.
Проєкт відповідає на запити користувачів, підмішує бібліотечний контекст
(ресурси, контакти, довідкова інформація), підтримує історію діалогів та
адмін-інструменти для RAG-документів.

## Stack

- Next.js 15 (App Router)
- React 19
- tRPC 11
- Vercel AI SDK (`ai`, `@ai-sdk/openai`, `@ai-sdk/react`)
- Drizzle ORM + MySQL

## Run locally

```bash
cp .env.example .env
# заполните минимум: BUILT_IN_FORGE_API_URL/FORGE_API_URL,
# BUILT_IN_FORGE_API_KEY/FORGE_API_KEY/OPENAI_API_KEY
# пример для OpenRouter:
# BUILT_IN_FORGE_API_URL=https://openrouter.ai/api/v1
# AI_MODEL_NAME=openrouter/auto

pnpm install
pnpm run db:push    # опционально, если используете MySQL
pnpm run db:seed    # опционально, чтобы заполнить справочники
pnpm dev
```

App will be available at `http://localhost:3000`.

## Что нужно ещё для работы проекта

Минимум, без которого чат не заработает:

- `BUILT_IN_FORGE_API_URL` (или `FORGE_API_URL`)
- `BUILT_IN_FORGE_API_KEY` (или `FORGE_API_KEY` / `OPENAI_API_KEY`)

Для прод-старта дополнительно обязательны:

- `JWT_SECRET`
- `OWNER_OPEN_ID`

Опционально, но важно для полноценной работы:

- `DATABASE_URL` — постоянная история чатов и CRUD админки (без него включается mock-режим)
- `REDIS_URL` — распределённый кэш/rate-limit backend
- `OPENROUTER_HTTP_REFERER`, `OPENROUTER_X_TITLE` — необязательные заголовки OpenRouter

Проверка готовности:

- `GET /api/ready` покажет, каких переменных не хватает

## Build

```bash
pnpm build
pnpm start
```

## API routes

- `app/api/trpc/[trpc]/route.ts` — tRPC server handler
- `app/api/chat/route.ts` — streaming chatbot endpoint (Vercel AI SDK)
- `app/api/admin/process-pdf/route.ts` — admin RAG ingestion endpoint
- `app/api/oauth/callback/route.ts` — OAuth callback + JWT session cookie
- `app/api/auth/me/route.ts`, `app/api/auth/logout/route.ts` — auth helpers
- `app/api/health/route.ts`, `app/api/ready/route.ts` — liveness/readiness probes

## Instant answers (FAQ shortcuts)

- На головній сторінці є quick prompt chips для типових бібліотечних питань.
- Для `/api/chat` запити спочатку проходять через FAQ matcher
  `lib/server/services/instantAnswers.ts`; при збігу повертається швидка
  відповідь без LLM-виклику.
- Теми, що покриті швидкими відповідями: запис до бібліотеки, читацький
  квиток/картка, правила бібліотеки, правила е-читальної зали, е-каталог,
  пошук книги, контакти, наукові ресурси, VPN/корпоративний доступ, карта сайту.
- Запити про каталог (наприклад: "де каталог", "як знайти книгу", "знайти
  автора ...", "книги з теми ...") додатково обробляються окремим intent-ом
  `lib/server/services/catalogIntent.ts`, який повертає структуровану
  catalog action (тип пошуку + query + URL + CTA label).
- Бібліотечні правила та процедури винесені в окремий knowledge-layer
  `lib/server/services/libraryKnowledge.ts`, який використовується для швидких
  відповідей і як довідковий контекст для fallback LLM-відповідей.
- У guest mode використовується персистентний `hdak-guest-id`; локальна історія
  зберігається у guest-scoped ключі `hdak-guest-history-v1:<guestId>`.
- Якщо питання не підпадає під FAQ matcher, працює звичайний OpenRouter/LLM
  стримінг через `/api/chat`.
- Щоб розширити базу FAQ, додайте новий елемент до `LIBRARY_FAQ` (keywords,
  answer, bullets, links) у `lib/server/services/instantAnswers.ts`.

## How it works

1. **UI (`app/page.tsx` + `lib/pages/Home`)** отправляет сообщения в `/api/chat`.
2. **API (`app/api/chat/route.ts`)** валидирует вход, применяет rate-limit и auth.
3. **LLM orchestration (`lib/server/services/aiOrchestrator.ts`)** собирает промпт,
   добавляет инструментальные вызовы (ресурсы/события/каталог), делает стрим-ответ.
4. **DB layer (`lib/server/db.ts`, Drizzle schema в `drizzle/schema.ts`)** хранит
   пользователей, диалоги, сообщения, библиотечные сущности и RAG chunks.
5. **Ответ** стримится обратно в UI, при наличии `conversationId` сохраняется история.

## Environment variables

Use `.env.example` as the source of truth.

- **Server-only critical**: `BUILT_IN_FORGE_API_URL|FORGE_API_URL`,
  `BUILT_IN_FORGE_API_KEY|FORGE_API_KEY|OPENAI_API_KEY`
- **Production critical**: `JWT_SECRET`, `OWNER_OPEN_ID`
- **Client-safe**: `VITE_APP_ID`, `VITE_OAUTH_PORTAL_URL`,
  `VITE_FRONTEND_FORGE_API_URL`, `VITE_FRONTEND_FORGE_API_KEY`
- **Optional infra**: `DATABASE_URL`, `REDIS_URL`, `CHAT_PROVIDER_API_KEY`,
  `OPENROUTER_HTTP_REFERER`, `OPENROUTER_X_TITLE`

## Guest mode (без входа)

- Гость может открыть сайт и сразу использовать чат (`/api/chat`) без OAuth/сессии.
- Для гостя не вызываются защищённые tRPC-методы истории (`conversations.list/create/getMessages/delete`).
- История гостя хранится локально в браузере (localStorage), без серверного сохранения.
- Для авторизованного пользователя поведение прежнее: серверная история разговоров через tRPC.

## OpenRouter (free models)

1. Зарегистрируйтесь на [openrouter.ai](https://openrouter.ai) и получите API key.
2. Установите env:
   - `BUILT_IN_FORGE_API_URL=https://openrouter.ai/api/v1`
   - `BUILT_IN_FORGE_API_KEY=<your_openrouter_key>`
   - `AI_MODEL_NAME=openrouter/auto` (или конкретную `...:free` модель)
3. Опционально добавьте:
   - `OPENROUTER_HTTP_REFERER=https://your-app.example`
   - `OPENROUTER_X_TITLE=HDAK Library Chatbot`

Приложение возвращает понятные ошибки (`503`) на критичных API, если ключевые env
не заданы, вместо неявных падений с `undefined`.

## Deployment

- Recommended: **Vercel**
- Alternatives: **Railway**, **Render**
- Fly.io: доступен как дополнительный вариант (см. `fly.toml`)

### Что нужно для деплоя

Минимально обязательно для старта в production:

- `BUILT_IN_FORGE_API_URL` (или `FORGE_API_URL`)
- `BUILT_IN_FORGE_API_KEY` (или `FORGE_API_KEY` / `OPENAI_API_KEY`)
- `JWT_SECRET`
- `OWNER_OPEN_ID`

Опционально, но нужно для полноценного режима:

- `DATABASE_URL` — для постоянной истории чатов и админ-CRUD (без него будет mock-режим)
- `OAUTH_SERVER_URL`, `VITE_APP_ID`, `VITE_OAUTH_PORTAL_URL` — если нужен OAuth-вход

После деплоя проверьте:

- `GET /api/health` — сервис запущен
- `GET /api/ready` — все критичные env выставлены

Пошаговые инструкции и env-матрица: **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

## Production deploy checklist

Перед переключением трафика убедитесь, что:

- [ ] Выставлены критичные env (`BUILT_IN_FORGE_API_URL|FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY|FORGE_API_KEY|OPENAI_API_KEY`, `JWT_SECRET`, `OWNER_OPEN_ID`)
- [ ] Подключён production `DATABASE_URL` (без него будет in-memory mock и неперсистентная история)
- [ ] При необходимости включён OAuth (`OAUTH_SERVER_URL`, `VITE_APP_ID`, `VITE_OAUTH_PORTAL_URL`)
- [ ] Применены миграции/инициализация (`pnpm run db:push`, `pnpm run db:seed`)
- [ ] Проверены `/api/health` (liveness) и `/api/ready` (critical env readiness)
- [ ] Проверен вход админа и доступ к `/admin` табам **Analytics**, **Knowledge Base**, **Performance**
- [ ] Проверены rate limits (`/api/chat` и `/api/trpc`) и отсутствие 429/5xx всплесков после прогрева

## Production monitoring & alerting setup

Минимальная схема мониторинга для запуска:

- **Liveness/Readiness probes**: `GET /api/health`, `GET /api/ready`
- **Admin metrics endpoint**: `GET /api/metrics` (только admin)
- **Performance dashboard**: вкладка **Performance** в `/admin`
- **Quality dashboard**: вкладка **Analytics** в `/admin`

Рекомендуемые алерты:

- `ready.status != 200` дольше 2 минут
- `streaming.errorRate > 0.10` (по `/api/metrics`)
- `latency.p95Ms > 8000` стабильно 5+ минут
- резкий рост 429/5xx в platform logs

## User onboarding (production UX)

- На Home в empty-state есть onboarding-блок "Start in 3 steps" + quick prompt chips.
- Для библиотечных FAQ сначала используются fast instant answers (без LLM-вызова), что ускоряет первый опыт.
- Для неизвестных вопросов включается fallback на LLM с официальными источниками и бейджами происхождения ответа.

## Initial editable knowledge seeding

- `pnpm run db:seed` теперь заполняет `libraryInfo` ключ `editable-knowledge-entries-v1` стартовыми editable knowledge entries.
- В in-memory fallback (когда нет `DATABASE_URL`) тот же ключ предзаполнен, чтобы админский Knowledge Base имел стартовые записи.
- Админ может сразу редактировать эти записи во вкладке **Knowledge Base** без изменения кода.

## OpenRouter cost monitoring

- `/api/metrics` и вкладка **Performance** показывают:
  - количество OpenRouter LLM requests
  - input/output/total tokens
  - estimated USD cost
  - last model
- Для оценки стоимости укажите (опционально):
  - `OPENROUTER_INPUT_COST_USD_PER_1M_TOKENS`
  - `OPENROUTER_OUTPUT_COST_USD_PER_1M_TOKENS`
- Без этих env стоимость считается как `0` (токены и usage всё равно собираются).

## Limits / caveats

- Качество ответов зависит от внешнего LLM и качества данных библиотеки.
- При отсутствии `DATABASE_URL` приложение работает в mock-режиме (без персистентной истории).
- Есть rate-limiting и таймауты, но лимиты провайдера LLM и стоимость запросов
  контролируются внешним сервисом.
- Не храните секреты в репозитории; используйте secret stores платформ.
