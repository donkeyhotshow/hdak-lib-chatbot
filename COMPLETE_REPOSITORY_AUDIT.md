# Complete Repository Audit — hdak-lib-chatbot

Date: 2026-03-13
Scope: full tracked repository (`git -c core.quotePath=false ls-files` = 206 files)

## STAGE 1 — Repository Index

### Full tracked tree (hierarchical)

Total tracked files: 206 (`git -c core.quotePath=false ls-files`)

#### 1.1 Full tracked file enumeration

```text
.env.example
.github/workflows/ci.yml
.github/workflows/keep-alive.yml
.gitignore
.gitkeep
.prettierignore
.prettierrc
.replit
CHANGELOG.md
COMPLETE_REPOSITORY_AUDIT.md
DEPLOYMENT.md
Dockerfile
FREE_DEPLOYMENT.md
IMPROVEMENTS.md
ISSUES_FOUND.md
README.md
SECURITY_IMPROVEMENTS.md
TELEGRAM_SOUNDTRACK_INTEGRATION.md
attached_assets/Pasted--DOCTYPE-html-html-lang-uk-head-meta-charset-UTF-8-meta_1773357706504.txt
attached_assets/Pasted-You-are-working-on-the-HDAK-Library-Chatbot-hdak-lib-ch_1773357791942.txt
attached_assets/{3F11AFE1-A667-45BC-A722-5D11D0F877FE}_1773357798128.png
client/index.html
client/public/.gitkeep
client/public/__manus__/debug-collector.js
client/src/App.tsx
client/src/_core/hooks/useAuth.ts
client/src/components/AIChatBox.tsx
client/src/components/DashboardLayout.tsx
client/src/components/DashboardLayoutSkeleton.tsx
client/src/components/DocumentCard.tsx
client/src/components/ErrorBoundary.tsx
client/src/components/ManusDialog.tsx
client/src/components/Map.tsx
client/src/components/Markdown.tsx
client/src/components/ui/accordion.tsx
client/src/components/ui/alert-dialog.tsx
client/src/components/ui/alert.tsx
client/src/components/ui/aspect-ratio.tsx
client/src/components/ui/avatar.tsx
client/src/components/ui/badge.tsx
client/src/components/ui/breadcrumb.tsx
client/src/components/ui/button-group.tsx
client/src/components/ui/button.tsx
client/src/components/ui/calendar.tsx
client/src/components/ui/card.tsx
client/src/components/ui/carousel.tsx
client/src/components/ui/chart.tsx
client/src/components/ui/checkbox.tsx
client/src/components/ui/collapsible.tsx
client/src/components/ui/command.tsx
client/src/components/ui/context-menu.tsx
client/src/components/ui/dialog.tsx
client/src/components/ui/drawer.tsx
client/src/components/ui/dropdown-menu.tsx
client/src/components/ui/empty.tsx
client/src/components/ui/field.tsx
client/src/components/ui/form.tsx
client/src/components/ui/hover-card.tsx
client/src/components/ui/input-group.tsx
client/src/components/ui/input-otp.tsx
client/src/components/ui/input.tsx
client/src/components/ui/item.tsx
client/src/components/ui/kbd.tsx
client/src/components/ui/label.tsx
client/src/components/ui/menubar.tsx
client/src/components/ui/navigation-menu.tsx
client/src/components/ui/pagination.tsx
client/src/components/ui/popover.tsx
client/src/components/ui/progress.tsx
client/src/components/ui/radio-group.tsx
client/src/components/ui/resizable.tsx
client/src/components/ui/scroll-area.tsx
client/src/components/ui/select.tsx
client/src/components/ui/separator.tsx
client/src/components/ui/sheet.tsx
client/src/components/ui/sidebar.tsx
client/src/components/ui/skeleton.tsx
client/src/components/ui/slider.tsx
client/src/components/ui/sonner.tsx
client/src/components/ui/spinner.tsx
client/src/components/ui/switch.tsx
client/src/components/ui/table.tsx
client/src/components/ui/tabs.tsx
client/src/components/ui/textarea.tsx
client/src/components/ui/toggle-group.tsx
client/src/components/ui/toggle.tsx
client/src/components/ui/tooltip.tsx
client/src/const.ts
client/src/contexts/ThemeContext.tsx
client/src/hooks/useComposition.ts
client/src/hooks/useFileUpload.ts
client/src/hooks/useMobile.tsx
client/src/hooks/usePersistFn.ts
client/src/index.css
client/src/lib/trpc.ts
client/src/lib/utils.ts
client/src/main.tsx
client/src/pages/Admin.tsx
client/src/pages/ComponentShowcase.tsx
client/src/pages/Home.tsx
client/src/pages/Home.tsx.backup
client/src/pages/Home.tsx.fixed
client/src/pages/NotFound.tsx
components.json
docker-compose.yml
docker-entrypoint.sh
drizzle.config.ts
drizzle/0000_bizarre_excalibur.sql
drizzle/0001_flawless_the_watchers.sql
drizzle/0002_easy_cardiac.sql
drizzle/0003_document_chunks_language_idx.sql
drizzle/meta/0000_snapshot.json
drizzle/meta/0001_snapshot.json
drizzle/meta/0002_snapshot.json
drizzle/meta/_journal.json
drizzle/migrations/.gitkeep
drizzle/relations.ts
drizzle/schema.ts
fly.toml
package-lock.json
package.json
patches/wouter@3.7.1.patch
pnpm-lock.yaml
railway.json
references/ai-sdk-react-query.md
references/ai-sdk.md
render.yaml
replit.md
seed-db.mjs
seed-db.ts
server/_core/bodyLimit.test.ts
server/_core/chat.test.ts
server/_core/chat.ts
server/_core/context.test.ts
server/_core/context.ts
server/_core/cookies.test.ts
server/_core/cookies.ts
server/_core/dataApi.ts
server/_core/env.ts
server/_core/imageGeneration.ts
server/_core/index.ts
server/_core/logger.test.ts
server/_core/logger.ts
server/_core/map.ts
server/_core/metrics.test.ts
server/_core/metrics.ts
server/_core/notification.ts
server/_core/oauth.ts
server/_core/patchedFetch.ts
server/_core/rateLimiter.test.ts
server/_core/rateLimiter.ts
server/_core/sdk.ts
server/_core/systemRouter.ts
server/_core/trpc.test.ts
server/_core/trpc.ts
server/_core/types/cookie.d.ts
server/_core/types/manusTypes.ts
server/_core/vite.ts
server/_core/voiceTranscription.ts
server/auth.logout.test.ts
server/chatbot.test.ts
server/db.extra.test.ts
server/db.test.ts
server/db.ts
server/rag-service.extra.test.ts
server/rag-service.test.ts
server/rag-service.ts
server/routers.admin.test.ts
server/routers.conversations.test.ts
server/routers.idor.test.ts
server/routers.sendmessage.test.ts
server/routers.ts
server/services/aiPipeline.extra.test.ts
server/services/aiPipeline.nullfields.test.ts
server/services/aiPipeline.test.ts
server/services/aiPipeline.ts
server/services/syncService.extra.test.ts
server/services/syncService.test.ts
server/services/syncService.ts
server/storage.ts
server/system-prompts-official.ts
shared/_core/errors.ts
shared/const.ts
shared/types.ts
soundtrack_resources/4e282630-c24c-410a-90a8-ae1c3a740a4e.mp3
soundtrack_resources/Plan_Prompts_Leitmotif.docx
soundtrack_resources/Plan_Soundtrack.docx
soundtrack_resources/README.md
soundtrack_resources/dcab56b1-3acf-4a9d-afcc-b6cb96f8039c.mp3
soundtrack_resources/Город LP.mp3
soundtrack_resources/Игра LP Быстрая.mp3
soundtrack_resources/Марш 2.mp3
soundtrack_resources/Марш Другой.mp3
soundtrack_resources/Мечта малыша ВЕРСИЯ.mp3
soundtrack_resources/Мечта малыша.mp3
soundtrack_resources/Плюшки LP.mp3
soundtrack_resources/ТАНГО CUT.mp3
soundtrack_resources/Танго SPEED LP.mp3
soundtrack_resources/У окна с надеждой.mp3
soundtrack_resources/Ф-Бок.mp3
soundtrack_resources/филле-рулле 2.mp3
soundtrack_resources/филле-рулле.mp3
todo.md
tsconfig.json
vite.config.ts
vitest.config.ts
```

#### 1.2 Hierarchical tracked-file tree

```text
├── .env.example
├── .github
│   └── workflows
│       ├── ci.yml
│       └── keep-alive.yml
├── .gitignore
├── .gitkeep
├── .prettierignore
├── .prettierrc
├── .replit
├── CHANGELOG.md
├── COMPLETE_REPOSITORY_AUDIT.md
├── DEPLOYMENT.md
├── Dockerfile
├── FREE_DEPLOYMENT.md
├── IMPROVEMENTS.md
├── ISSUES_FOUND.md
├── README.md
├── SECURITY_IMPROVEMENTS.md
├── TELEGRAM_SOUNDTRACK_INTEGRATION.md
├── attached_assets
│   ├── Pasted--DOCTYPE-html-html-lang-uk-head-meta-charset-UTF-8-meta_1773357706504.txt
│   ├── Pasted-You-are-working-on-the-HDAK-Library-Chatbot-hdak-lib-ch_1773357791942.txt
│   └── {3F11AFE1-A667-45BC-A722-5D11D0F877FE}_1773357798128.png
├── client
│   ├── index.html
│   ├── public
│   │   ├── .gitkeep
│   │   └── __manus__
│   │       └── debug-collector.js
│   └── src
│       ├── App.tsx
│       ├── _core
│       │   └── hooks
│       │       └── useAuth.ts
│       ├── components
│       │   ├── AIChatBox.tsx
│       │   ├── DashboardLayout.tsx
│       │   ├── DashboardLayoutSkeleton.tsx
│       │   ├── DocumentCard.tsx
│       │   ├── ErrorBoundary.tsx
│       │   ├── ManusDialog.tsx
│       │   ├── Map.tsx
│       │   ├── Markdown.tsx
│       │   └── ui
│       │       ├── accordion.tsx
│       │       ├── alert-dialog.tsx
│       │       ├── alert.tsx
│       │       ├── aspect-ratio.tsx
│       │       ├── avatar.tsx
│       │       ├── badge.tsx
│       │       ├── breadcrumb.tsx
│       │       ├── button-group.tsx
│       │       ├── button.tsx
│       │       ├── calendar.tsx
│       │       ├── card.tsx
│       │       ├── carousel.tsx
│       │       ├── chart.tsx
│       │       ├── checkbox.tsx
│       │       ├── collapsible.tsx
│       │       ├── command.tsx
│       │       ├── context-menu.tsx
│       │       ├── dialog.tsx
│       │       ├── drawer.tsx
│       │       ├── dropdown-menu.tsx
│       │       ├── empty.tsx
│       │       ├── field.tsx
│       │       ├── form.tsx
│       │       ├── hover-card.tsx
│       │       ├── input-group.tsx
│       │       ├── input-otp.tsx
│       │       ├── input.tsx
│       │       ├── item.tsx
│       │       ├── kbd.tsx
│       │       ├── label.tsx
│       │       ├── menubar.tsx
│       │       ├── navigation-menu.tsx
│       │       ├── pagination.tsx
│       │       ├── popover.tsx
│       │       ├── progress.tsx
│       │       ├── radio-group.tsx
│       │       ├── resizable.tsx
│       │       ├── scroll-area.tsx
│       │       ├── select.tsx
│       │       ├── separator.tsx
│       │       ├── sheet.tsx
│       │       ├── sidebar.tsx
│       │       ├── skeleton.tsx
│       │       ├── slider.tsx
│       │       ├── sonner.tsx
│       │       ├── spinner.tsx
│       │       ├── switch.tsx
│       │       ├── table.tsx
│       │       ├── tabs.tsx
│       │       ├── textarea.tsx
│       │       ├── toggle-group.tsx
│       │       ├── toggle.tsx
│       │       └── tooltip.tsx
│       ├── const.ts
│       ├── contexts
│       │   └── ThemeContext.tsx
│       ├── hooks
│       │   ├── useComposition.ts
│       │   ├── useFileUpload.ts
│       │   ├── useMobile.tsx
│       │   └── usePersistFn.ts
│       ├── index.css
│       ├── lib
│       │   ├── trpc.ts
│       │   └── utils.ts
│       ├── main.tsx
│       └── pages
│           ├── Admin.tsx
│           ├── ComponentShowcase.tsx
│           ├── Home.tsx
│           ├── Home.tsx.backup
│           ├── Home.tsx.fixed
│           └── NotFound.tsx
├── components.json
├── docker-compose.yml
├── docker-entrypoint.sh
├── drizzle
│   ├── 0000_bizarre_excalibur.sql
│   ├── 0001_flawless_the_watchers.sql
│   ├── 0002_easy_cardiac.sql
│   ├── 0003_document_chunks_language_idx.sql
│   ├── meta
│   │   ├── 0000_snapshot.json
│   │   ├── 0001_snapshot.json
│   │   ├── 0002_snapshot.json
│   │   └── _journal.json
│   ├── migrations
│   │   └── .gitkeep
│   ├── relations.ts
│   └── schema.ts
├── drizzle.config.ts
├── fly.toml
├── package-lock.json
├── package.json
├── patches
│   └── wouter@3.7.1.patch
├── pnpm-lock.yaml
├── railway.json
├── references
│   ├── ai-sdk-react-query.md
│   └── ai-sdk.md
├── render.yaml
├── replit.md
├── seed-db.mjs
├── seed-db.ts
├── server
│   ├── _core
│   │   ├── bodyLimit.test.ts
│   │   ├── chat.test.ts
│   │   ├── chat.ts
│   │   ├── context.test.ts
│   │   ├── context.ts
│   │   ├── cookies.test.ts
│   │   ├── cookies.ts
│   │   ├── dataApi.ts
│   │   ├── env.ts
│   │   ├── imageGeneration.ts
│   │   ├── index.ts
│   │   ├── logger.test.ts
│   │   ├── logger.ts
│   │   ├── map.ts
│   │   ├── metrics.test.ts
│   │   ├── metrics.ts
│   │   ├── notification.ts
│   │   ├── oauth.ts
│   │   ├── patchedFetch.ts
│   │   ├── rateLimiter.test.ts
│   │   ├── rateLimiter.ts
│   │   ├── sdk.ts
│   │   ├── systemRouter.ts
│   │   ├── trpc.test.ts
│   │   ├── trpc.ts
│   │   ├── types
│   │   │   ├── cookie.d.ts
│   │   │   └── manusTypes.ts
│   │   ├── vite.ts
│   │   └── voiceTranscription.ts
│   ├── auth.logout.test.ts
│   ├── chatbot.test.ts
│   ├── db.extra.test.ts
│   ├── db.test.ts
│   ├── db.ts
│   ├── rag-service.extra.test.ts
│   ├── rag-service.test.ts
│   ├── rag-service.ts
│   ├── routers.admin.test.ts
│   ├── routers.conversations.test.ts
│   ├── routers.idor.test.ts
│   ├── routers.sendmessage.test.ts
│   ├── routers.ts
│   ├── services
│   │   ├── aiPipeline.extra.test.ts
│   │   ├── aiPipeline.nullfields.test.ts
│   │   ├── aiPipeline.test.ts
│   │   ├── aiPipeline.ts
│   │   ├── syncService.extra.test.ts
│   │   ├── syncService.test.ts
│   │   └── syncService.ts
│   ├── storage.ts
│   └── system-prompts-official.ts
├── shared
│   ├── _core
│   │   └── errors.ts
│   ├── const.ts
│   └── types.ts
├── soundtrack_resources
│   ├── 4e282630-c24c-410a-90a8-ae1c3a740a4e.mp3
│   ├── Plan_Prompts_Leitmotif.docx
│   ├── Plan_Soundtrack.docx
│   ├── README.md
│   ├── dcab56b1-3acf-4a9d-afcc-b6cb96f8039c.mp3
│   ├── Город LP.mp3
│   ├── Игра LP Быстрая.mp3
│   ├── Марш 2.mp3
│   ├── Марш Другой.mp3
│   ├── Мечта малыша ВЕРСИЯ.mp3
│   ├── Мечта малыша.mp3
│   ├── Плюшки LP.mp3
│   ├── ТАНГО CUT.mp3
│   ├── Танго SPEED LP.mp3
│   ├── У окна с надеждой.mp3
│   ├── Ф-Бок.mp3
│   ├── филле-рулле 2.mp3
│   └── филле-рулле.mp3
├── todo.md
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

### Key modules

- `server/_core/index.ts` — process bootstrap, middleware, route registration, startup/shutdown.
- `server/_core/chat.ts` — streaming `/api/chat` endpoint, AI SDK tool wiring, prompt assembly.
- `server/routers.ts` — tRPC API surface (auth, conversations, resources, contacts, analytics, sync).
- `server/services/aiPipeline.ts` — non-streaming response pipeline used by `conversations.sendMessage`.
- `server/db.ts` — DB + in-memory fallback + CRUD + analytics + document chunk I/O.
- `server/rag-service.ts` — chunking, embedding, semantic search, RAG context formatting.
- `server/services/syncService.ts` — scheduled catalog scraping/sync.
- `drizzle/schema.ts` — persistence schema.
- `client/src/pages/Home.tsx` — main chat app UI/state orchestration.
- `client/src/pages/Admin.tsx` — admin CRUD and metrics dashboard.

### Entrypoints

- **Backend runtime:** `server/_core/index.ts`
- **Frontend runtime:** `client/src/main.tsx`
- **Build config:** `vite.config.ts`, `tsconfig.json`, `vitest.config.ts`, `drizzle.config.ts`
- **DB seed:** `seed-db.ts`, `seed-db.mjs`
- **CI:** `.github/workflows/ci.yml`, `.github/workflows/keep-alive.yml`
- **Package scripts:** `package.json` (`dev`, `build`, `check`, `test`, `test:coverage`, `db:*`)

---

## STAGE 2 — Dependency Graph

### Module-level graph (static imports)

- `client -> client` (163)
- `client -> external` (168)
- `client -> server` (2, via shared router typing)
- `server -> server` (109)
- `server -> drizzle` (5)
- `server -> shared` (1)
- `server -> external` (81)
- `drizzle -> external` (2)

### Core execution dependency chains

1. `client/src/pages/Home.tsx`  
   -> `POST /api/chat`  
   -> `server/_core/chat.ts`  
   -> `server/db.ts` + `server/system-prompts-official.ts` + `server/services/aiPipeline.ts` helpers  
   -> OpenAI-compatible provider (`@ai-sdk/openai`) + tool calls.

2. `client tRPC`  
   -> `/api/trpc`  
   -> `server/routers.ts`  
   -> `server/services/aiPipeline.ts`  
   -> `server/rag-service.ts`  
   -> `server/db.ts`.

3. `server/services/syncService.ts`  
   -> remote catalog fetch (`fetch`) + parse (`cheerio`)  
   -> `server/db.ts` upsert-like writes  
   -> cache invalidation in `aiPipeline.ts`.

### Circular dependencies

- Static scan across internal TS/TSX modules found **0 cycles**.

### Hidden global state

- `server/db.ts`: `_db`, `mockState` mutable singleton.
- `server/services/aiPipeline.ts`: process-wide `NodeCache` reply cache.
- `server/services/syncService.ts`: `_syncTimer`, `_isSyncing`, `_lastSyncStatus`.
- `server/_core/metrics.ts`: global buffers/counters/timer.

### Tight coupling hotspots

- `server/routers.ts` directly couples API contract + authorization + persistence + AI orchestration.
- `server/_core/chat.ts` tightly binds HTTP transport + tool registry + persistence behavior.
- `client/src/pages/Home.tsx` mixes transport, persistence synchronization, i18n, and full visual system in one file.

---

## STAGE 3 — Execution Flow (chatbot)

1. `server/_core/index.ts` starts Express, sets helmet/compression/rate-limiters, registers routes, starts memory monitor + sync scheduler.
2. Client (`Home.tsx`) uses AI SDK `useChat` with `DefaultChatTransport` to POST `/api/chat` with the last user message and optional `conversationId`.
3. `server/_core/chat.ts` validates payload (`zod`), sanitizes message text, detects language, optionally loads DB history by `conversationId`.
4. `streamText(...)` runs with system prompt + tools (`searchLibraryResources`, `getCatalogSearchLink`, `findUpcomingLibraryEvents`).
5. Tool execution calls `server/db.ts` for resources/info search.
6. Stream response is piped back (`pipeUIMessageStreamToResponse`).
7. On finish, server persists user+assistant turns (`db.createMessage`) when `conversationId` exists.
8. In tRPC path (`conversations.sendMessage`), flow is different: save user message -> `generateConversationReply` -> (searchResources + logUserQuery + optional RAG via embeddings) -> save assistant message.

External APIs called at:

- `@ai-sdk/openai` chat and embeddings (`chat.ts`, `aiPipeline.ts`, `rag-service.ts`)
- OAuth server (`sdk.ts`/`oauth.ts`)
- catalog sync HTTP fetch (`syncService.ts`)
- optional storage/maps/notification/data-api wrappers.

---

## STAGE 4 — Chatbot Architecture

Current architecture is a **hybrid monolith**:

- Pattern mix: command-router (tRPC procedures), monolithic handlers (`Home.tsx`, `Admin.tsx`, `registerChatRoutes`), limited tool-calling plugin-like registry in `chat.ts`.
- Not event-driven; no formal agent planner/executor abstraction.
- State/memory:
  - Conversation state in DB tables (`conversations`, `messages`).
  - Prompt context from recent history (14 in streaming path, 10 in tRPC path).
  - RAG memory from `documentChunks` with cosine similarity in app layer.
  - Volatile process memory caches (reply cache, metrics, sync status).

---

## STAGE 5 — Static Code Analysis

### Large functions / monolithic files

- `client/src/pages/Admin.tsx` — ~1403 lines function component.
- `client/src/pages/Home.tsx` — ~1292 lines function component.
- `client/src/pages/ComponentShowcase.tsx` — ~1241 lines.
- `server/_core/index.ts::startServer` — ~304 lines.
- `server/db.ts::ensureMockState` — ~232 lines.
- `server/_core/chat.ts::registerChatRoutes` — ~135 lines.

### Duplicated logic/data

- Resource catalog constants duplicated across:
  - `client/src/pages/Home.tsx` (`RESOURCES`)
  - `server/system-prompts-official.ts`
  - `server/db.ts` mock seeding
  - `seed-db.ts` / `seed-db.mjs`
- Two near-duplicate seed scripts: `seed-db.ts` and `seed-db.mjs`.

### Dead/stray code candidates

- Backup artifacts committed in source tree:
  - `client/src/pages/Home.tsx.backup`
  - `client/src/pages/Home.tsx.fixed`
- Potentially unreferenced modules (static import graph):
  - `server/_core/dataApi.ts`, `server/_core/imageGeneration.ts`, `server/_core/map.ts`, `server/_core/voiceTranscription.ts`
  - multiple UI components only used by showcase/non-routed code.

### Magic constants

- Hardcoded URLs and limits across multiple files (`chat.ts`, `syncService.ts`, `Home.tsx`, `db.ts`).

---

## STAGE 6 — Design Patterns

Patterns present:

- **Adapter-like wrappers**: `sdk.ts`, `dataApi.ts`, `map.ts`, `storage.ts`, `notification.ts`.
- **Repository-lite**: `db.ts` centralizes data access (but too broad).
- **Tool registry**: `tools` object in `chat.ts` (primitive plugin concept).

Patterns missing/weak:

- No real **dependency injection**; module singletons + direct imports dominate.
- No strategy abstraction for model/provider/tool selection.
- No observer/event bus for domain events.
- Plugin system is hard-coded, not extensible/runtime-discoverable.

---

## STAGE 7 — Security Audit

### Critical

1. **tRPC auth context is hardcoded and non-authenticating**
   - `server/_core/context.ts` always returns user `{ id:1, openId:"public", role:"user" }`.
   - `protectedProcedure` is not protected (`server/_core/trpc.ts`: `protectedProcedure = t.procedure`).
   - Impact: no real identity boundary for tRPC; user isolation/authentication model is broken.

2. **`/api/chat` accepts arbitrary `conversationId` without ownership checks**
   - `server/_core/chat.ts` explicitly accepts any `conversationId` and loads/saves messages for it.
   - No user identity check in streaming route.
   - Impact: unauthorized read/write against conversation records if IDs are known/guessed.

3. **`system.notifyOwner` is effectively public**
   - `server/_core/systemRouter.ts` uses `adminProcedure` imported from `./trpc`.
   - In `server/_core/trpc.ts`, `adminProcedure = t.procedure` (no guard).
   - Impact: untrusted callers can trigger notification endpoint (abuse/spam vector).

### Medium

4. **Potential SSRF primitive in transcription helper if exposed**
   - `server/_core/voiceTranscription.ts` fetches arbitrary `audioUrl`.
   - Currently appears unexposed in router, but dangerous if wired later without allowlist.

5. **Auth/session model split-brain**
   - REST admin endpoints use `sdk.authenticateRequest`.
   - tRPC endpoints use mock context user.
   - Impact: inconsistent security boundary, easy misconfiguration and false assumptions.

### Findings not present

- No `eval` usage.
- No shell execution (`child_process`, `exec`, `spawn`) in runtime server modules.
- No committed plaintext production secrets found.

---

## STAGE 8 — Performance Analysis

1. **In-memory semantic search scales poorly**
   - `rag-service.ts` loads up to 100 chunks and scores in Node.js per request.
   - No vector index / ANN; CPU grows with corpus.

2. **Sequential embedding + insert in document processing**
   - `processDocument` performs one chunk embedding call at a time.
   - Throughput bottleneck for large docs.

3. **Heavy monolithic React pages**
   - `Home.tsx` and `Admin.tsx` are huge and likely over-render due broad state scope.

4. **Sync pipeline does N per-resource DB checks/inserts serially**
   - `syncService.ts` checks existence then creates in loop.

5. **Global process caches/timers**
   - Good for speed, but no distributed coherence in multi-instance deployments.

---

## STAGE 9 — Testing

- Test framework: Vitest (`vitest.config.ts`).
- Scope: server tests only (`server/**/*.test.ts`).
- Current status (local run): **392 tests / 23 files passed**.
- Coverage thresholds: 80/80/80/80 configured.
- Mocking: extensive mocking of DB/AI/OAuth in unit tests.

Gaps:

- No client/UI tests.
- No end-to-end tests for auth and streaming route authorization boundaries.
- Security regression tests incomplete for conversation ownership in `/api/chat`.

CI/CD:

- `ci.yml` runs typecheck, format check, coverage, build, codeql, docker build.
- keep-alive workflow pings health endpoint on schedule.

---

## STAGE 10 — Documentation

Strengths:

- `README.md` is detailed and broad.
- Deployment docs are extensive (`DEPLOYMENT.md`, `FREE_DEPLOYMENT.md`).

Gaps:

- Documentation overstates coherent auth while code currently runs split/no-auth tRPC mode.
- No formal architecture decision records.
- No explicit dependency boundary documentation.
- No explicit threat model for prompt injection and conversation access control.

---

## STAGE 11 — Code Maturity (1–10)

- Architecture: **5/10**
- Code quality: **6/10**
- Security: **3/10**
- Testing: **7/10**
- Documentation: **7/10**
- Scalability: **4/10**

Overall: **5.3/10**

---

## STAGE 12 — Architecture Smells

1. **Monolithic handlers/components**
   - `Home.tsx`, `Admin.tsx`, `registerChatRoutes`, `routers.ts`.

2. **Hidden dependencies and runtime globals**
   - stateful singletons in DB/cache/scheduler/metrics modules.

3. **Boundary confusion**
   - REST endpoints follow one auth model, tRPC another.

4. **Data duplication smell**
   - repeated resource metadata in many files causes drift risk.

5. **Accidental source artifacts**
   - backup/fixed files committed in `client/src/pages`.

---

## STAGE 13 — Refactor Plan

### Target structure

- `server/app/` (composition root)
- `server/modules/chat/` (routes, service, tools, policies)
- `server/modules/conversations/` (commands, queries)
- `server/modules/resources/` (catalog/resources)
- `server/modules/auth/` (context, guards, oauth)
- `server/modules/rag/` (ingestion, retrieval, embeddings provider)
- `server/infrastructure/` (db, cache, scheduler, adapters)
- `shared/contracts/` (DTOs, schemas, constants)

### Boundaries

- Route layer -> application services -> repository interfaces.
- Adapters (OpenAI, OAuth, storage, maps) behind interfaces.
- Remove direct DB calls from route handlers.

### Concrete roadmap

1. Fix auth boundary first:
   - Implement real `createContext` user resolution.
   - Reinstate `protectedProcedure`/`adminProcedure` middleware.
   - Enforce conversation ownership in `/api/chat`.
2. Extract chat orchestration service from `chat.ts`.
3. Split `routers.ts` by domain routers and compose root router.
4. Consolidate resource constants into one canonical source.
5. Remove backup files and dead modules or gate behind feature flags.
6. Introduce vector DB/ANN or SQL-side vector search.
7. Add e2e auth+authorization tests.

---

## STAGE 14 — Comparison vs LangChain/LlamaIndex/Modern Agent Frameworks

Missing capabilities:

- No planner/executor loop or multi-agent coordination.
- No tool abstraction with dynamic registration/versioning.
- No structured memory hierarchy (episodic/semantic/short-term separation).
- No traceable execution graph / callback instrumentation equivalent.
- No retrieval pipeline abstractions (retrievers, rerankers, chunk strategies as pluggable policies).
- No guardrail policy engine (content policy, tool safety policies, provenance scoring).

Current implementation is a custom app bot with direct SDK wiring, not an extensible agent framework.

---

## Requested Output Format

### 1) Architecture summary

- Single service full-stack app (React + Express + tRPC + MySQL + AI SDK).
- Two chat paths (streaming REST, non-streaming tRPC) with partially divergent behavior.
- Strong functionality breadth, weak separation and security boundary consistency.

### 2) Dependency graph

- Main chains:
  - `Home.tsx -> /api/chat -> chat.ts -> db.ts + ai sdk`
  - `tRPC -> routers.ts -> aiPipeline.ts -> rag-service.ts -> db.ts`
- No static circular imports detected.
- Tight coupling concentrated in `routers.ts`, `chat.ts`, `Home.tsx`, `Admin.tsx`.

### 3) Execution flow

- Startup in `index.ts`; route wiring + middleware + schedulers.
- Message enters via `/api/chat` or `conversations.sendMessage`.
- Sanitization/language detection/context retrieval/tool calls.
- LLM response streaming or full text generation.
- Persistence in `messages` + analytics logging.

### 4) Major problems

- Broken/placeholder auth model in tRPC context.
- Authorization gap in `/api/chat` for conversation access.
- Public `system.notifyOwner` due no-op admin procedure.
- Monolithic UI and server handlers.
- Repeated source-of-truth data.

### 5) Security issues

- Critical: auth bypass model in tRPC (`context.ts`, `trpc.ts`).
- Critical: conversation ID trust in `/api/chat` (`chat.ts`).
- Critical: open notifyOwner mutation (`systemRouter.ts` + `trpc.ts`).
- Medium: potential SSRF in transcription helper if exposed.

### 6) Code smells

- God components/functions (`Home.tsx`, `Admin.tsx`, `index.ts`, `routers.ts`).
- Hidden global mutable state (`db.ts`, `syncService.ts`, `metrics.ts`, `aiPipeline.ts`).
- Duplicate data declarations and backup files in source tree.

### 7) Good design decisions

- Extensive server-side tests with coverage gates.
- Defensive input validation in many routes (`zod`, body limits, rate limits).
- Prompt sanitization attempts + logging in AI pipeline.
- Operational metrics and health/readiness endpoints.

### 8) Refactor roadmap

- Rebuild auth/authorization first.
- Modularize routers/services by bounded context.
- Introduce DI-style interfaces for adapters.
- Consolidate constants and remove stale files.
- Add e2e security tests and vector retrieval scalability improvements.

### 9) Final rating

- **5.3 / 10**
