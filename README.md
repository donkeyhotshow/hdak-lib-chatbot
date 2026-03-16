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
- **Optional infra**: `DATABASE_URL`, `REDIS_URL`, `CHAT_PROVIDER_API_KEY`

Приложение возвращает понятные ошибки (`503`) на критичных API, если ключевые env
не заданы, вместо неявных падений с `undefined`.

## Deployment

- Recommended: **Vercel**
- Alternatives: **Railway**, **Render**
- Fly.io: доступен как дополнительный вариант (см. `fly.toml`)

Пошаговые инструкции и env-матрица: **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

## Limits / caveats

- Качество ответов зависит от внешнего LLM и качества данных библиотеки.
- При отсутствии `DATABASE_URL` приложение работает в mock-режиме (без персистентной истории).
- Есть rate-limiting и таймауты, но лимиты провайдера LLM и стоимость запросов
  контролируются внешним сервисом.
- Не храните секреты в репозитории; используйте secret stores платформ.
