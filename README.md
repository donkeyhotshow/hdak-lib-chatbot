---
title: HDAK Library Chatbot
emoji: 📚
colorFrom: blue
colorTo: indigo
sdk: docker
pinned: false
app_port: 7860
---

# HDAK Library Chatbot

<!-- ci: invalidate HF Spaces Docker cache [2026-03-13] -->

AI-powered chatbot assistant for the **Kharkiv State Academy of Culture (ХДАК)** library.  
The bot helps readers navigate the library website, search for resources, find authors and books in the electronic catalog, and discover available databases.

---

## Table of Contents

- [Features](#features)
- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [Environment Variables](#environment-variables)
- [Quick Start (Development)](#quick-start-development)
- [Database](#database)
  - [Schema](#schema)
  - [Mock Mode (No DB)](#mock-mode-no-db)
  - [Running Migrations](#running-migrations)
  - [Seeding](#seeding)
- [API Reference](#api-reference)
  - [REST Endpoints](#rest-endpoints)
  - [tRPC Procedures](#trpc-procedures)
- [AI Integration](#ai-integration)
  - [Streaming Chat Endpoint](#streaming-chat-endpoint)
  - [HDAK Library Tools](#hdak-library-tools)
  - [System Prompts](#system-prompts)
  - [RAG (Retrieval-Augmented Generation)](#rag-retrieval-augmented-generation)
- [Authentication & Authorization](#authentication--authorization)
- [Frontend](#frontend)
  - [Pages](#pages)
  - [Translations (i18n)](#translations-i18n)
- [Admin Panel](#admin-panel)
- [Testing](#testing)
- [Build & Deployment](#build--deployment)
- [🆓 Бесплатный деплой (FREE_DEPLOYMENT.md)](FREE_DEPLOYMENT.md)
- [Web Interface](#web-interface)
  - [Run locally (development)](#run-locally-development)
  - [Chat interface (`/`)](#chat-interface-)
  - [Admin panel (`/admin`)](#admin-panel-admin)
  - [Document Upload](#document-upload)
  - [Metrics Dashboard](#metrics-dashboard)
  - [Build the frontend](#build-the-frontend)
  - [Deploy the full stack](#deploy-the-full-stack)
- [Library Resources Reference](#library-resources-reference)
- [Known Limitations](#known-limitations)

---

## Features

| Feature                     | Description                                                                                  |
| --------------------------- | -------------------------------------------------------------------------------------------- |
| 🤖 **AI Chat**              | Streaming GPT-4o responses via the Vercel AI SDK                                             |
| 📚 **Site Navigation**      | Bot knows the full HDAK website structure (40+ pages with URLs)                              |
| 🔍 **Resource Search**      | AI tool searches the database and built-in resource list by keyword                          |
| 📖 **Catalog Lookup**       | AI tool generates step-by-step catalog search instructions for any author, title, or subject |
| 🌐 **Multilingual**         | Full Ukrainian / Russian / English support across UI and AI responses                        |
| 💬 **Conversation History** | Persistent multi-turn conversations with a sidebar for history management                    |
| 🗑️ **Delete Conversations** | Hover-over trash button in sidebar removes the conversation and its messages                 |
| ❌ **Error Feedback**       | Inline error banner when a message fails to send                                             |
| 🏛️ **Admin Panel**          | Admin-only CRUD for library resources and contacts                                           |
| 🔐 **OAuth Auth**           | Manus OAuth login; session stored in a signed HTTP-only cookie                               |
| 📊 **Query Analytics**      | Every user question is logged to the `userQueries` table                                     |
| 📄 **RAG**                  | Semantic vector search over uploaded PDF documents (requires embeddings API)                 |

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│  Browser (React + Vite)                                  │
│  • Home.tsx  – chat UI with overview panel               │
│  • Admin.tsx – admin CRUD panel                          │
│  • tRPC client + React Query                             │
└────────────────────┬─────────────────────────────────────┘
                     │ HTTP
         ┌───────────┴─────────────┐
         │  Express Server (Node)  │
         │  • /api/chat  (stream)  │
         │  • /api/trpc  (tRPC)    │
         │  • /api/oauth/callback  │
         └──┬──────────┬───────────┘
            │          │
     ┌──────▼──┐  ┌────▼──────────────────────────────────┐
     │  MySQL  │  │  Vercel AI SDK (OpenAI-compat proxy)   │
     │  (opt.) │  │  • streamText + tool calling           │
     └─────────┘  │  • generateText (tRPC sendMessage)     │
                  │  • embed (RAG embeddings)               │
                  └────────────────────────────────────────┘
```

**Two parallel AI pathways:**

1. **`/api/chat` (streaming)** — used directly by `Home.tsx` for the main chat UI. Streams tokens back via `pipeUIMessageStreamToResponse`. Has access to the two library tools (`searchLibraryResources`, `getCatalogSearchLink`).

2. **`conversations.sendMessage` (tRPC)** — non-streaming, returns a complete message. Performs resource search + RAG context lookup before calling `generateText`. Used for persisted conversations.

---

## Project Structure

```
hdak-lib-chatbot/
├── client/                   # React frontend (Vite)
│   └── src/
│       ├── _core/            # Auth hooks, tRPC client setup
│       ├── components/       # UI components (shadcn/ui + Markdown)
│       ├── pages/
│       │   ├── Home.tsx      # Main chat page
│       │   └── Admin.tsx     # Admin panel
│       └── index.css
├── server/                   # Express backend
│   ├── _core/
│   │   ├── index.ts          # Server entry point
│   │   ├── chat.ts           # /api/chat streaming endpoint + AI tools
│   │   ├── oauth.ts          # OAuth callback (/api/oauth/callback)
│   │   ├── context.ts        # tRPC context (auth)
│   │   ├── trpc.ts           # tRPC router factory + procedures
│   │   ├── env.ts            # Typed environment variables
│   │   └── patchedFetch.ts   # Fixes OpenAI proxy SSE stream
│   ├── routers.ts            # All tRPC procedure definitions
│   ├── db.ts                 # All database helpers + mock fallback
│   ├── system-prompts-official.ts  # HDAK site map, resources, system prompts
│   ├── rag-service.ts        # PDF chunking, embeddings, semantic search
│   └── storage.ts            # S3/file storage helpers
├── drizzle/
│   └── schema.ts             # Drizzle ORM table definitions (MySQL)
├── shared/
│   └── const.ts              # Shared constants (cookie name, timeouts)
├── seed-db.ts                # Database seed script (TypeScript)
├── seed-db.mjs               # Database seed script (ESM)
├── drizzle.config.ts         # Drizzle Kit config (requires DATABASE_URL)
├── vite.config.ts            # Vite + Tailwind + dev proxy config
├── vitest.config.ts          # Vitest config (server-side tests only)
├── tsconfig.json             # TypeScript config
└── package.json
```

---

## Technology Stack

| Layer                 | Technology                                      |
| --------------------- | ----------------------------------------------- |
| Frontend framework    | React 19 + TypeScript                           |
| Build tool            | Vite 7                                          |
| Styling               | Tailwind CSS v4 + shadcn/ui (Radix UI)          |
| Routing (client)      | Wouter 3                                        |
| State / data fetching | TanStack Query v5 + tRPC v11                    |
| Markdown rendering    | Streamdown + Shiki (syntax highlighting)        |
| Backend framework     | Express 4                                       |
| RPC layer             | tRPC v11 with `superjson` transformer           |
| AI SDK                | Vercel AI SDK (`ai` package v6)                 |
| LLM                   | OpenAI GPT-4o (via OpenAI-compatible proxy)     |
| Embeddings            | OpenAI `text-embedding-3-small`                 |
| Database ORM          | Drizzle ORM                                     |
| Database              | MySQL (optional — falls back to in-memory mock) |
| Auth                  | Manus OAuth 2.0 (JWT session cookie)            |
| Testing               | Vitest                                          |
| Language              | TypeScript 5.9                                  |

---

## Environment Variables

Create a `.env` file at the project root. All variables are optional for local development (mock data is used when the DB is absent).

```env
# ─── OAuth / Auth ──────────────────────────────────────────────────────────
VITE_APP_ID=           # Manus application ID (from Manus Developer Console)
JWT_SECRET=            # Secret used to sign session cookies (any random string)
OAUTH_SERVER_URL=      # Manus OAuth server base URL
OWNER_OPEN_ID=         # OpenID of the user who should be granted admin role
VITE_OAUTH_PORTAL_URL= # Full URL for the OAuth login page shown to unauthenticated users

# ─── Database ──────────────────────────────────────────────────────────────
DATABASE_URL=          # mysql://user:password@host:3306/dbname
                       # If absent, library CRUD uses in-memory mock data.
                       # Conversations/messages are unavailable without a real DB.

# ─── AI / LLM ──────────────────────────────────────────────────────────────
BUILT_IN_FORGE_API_URL= # Base URL of the OpenAI-compatible API endpoint
BUILT_IN_FORGE_API_KEY= # API key for the above endpoint

# ─── Server ────────────────────────────────────────────────────────────────
PORT=3000              # HTTP port (default 3000; auto-increments if busy)
NODE_ENV=development   # "development" | "production"
```

> **Note:** The `VITE_*` variables are inlined into the browser bundle by Vite at build time. All other variables are server-side only.

---

## Quick Start (Development)

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill environment variables
cp .env.example .env

# 3. (Optional) Push the database schema and seed initial data
DATABASE_URL=mysql://... npm run db:push
DATABASE_URL=mysql://... node seed-db.mjs

# 4. Start the development server (hot reload for both client and server)
npm run dev
```

The server starts on `http://localhost:3000` (or the next available port).  
The React frontend is served by Vite in dev mode with HMR.

---

## Database

### Schema

| Table              | Purpose                                                                      |
| ------------------ | ---------------------------------------------------------------------------- |
| `users`            | Registered users (openId, name, email, role, language)                       |
| `conversations`    | Chat sessions (userId, title, language)                                      |
| `messages`         | Individual messages (conversationId, role: user\|assistant, content)         |
| `libraryResources` | Library resource catalog (name/description in en/uk/ru, type, url, keywords) |
| `libraryContacts`  | Contact information (email, phone, address, social media)                    |
| `libraryInfo`      | Key–value store for general library information                              |
| `userQueries`      | Analytics log (query, language, resourcesReturned, userId, conversationId)   |
| `documentChunks`   | RAG document chunks with JSON-stored embeddings                              |
| `documentMetadata` | Metadata for processed documents (title, author, date, processing status)    |

**Resource types:** `electronic_library` · `repository` · `catalog` · `database` · `other`  
**Contact types:** `email` · `phone` · `address` · `telegram` · `viber` · `facebook` · `instagram` · `other`  
**User roles:** `user` · `admin`

### Mock Mode (No DB)

When `DATABASE_URL` is absent (typical in local dev without MySQL), the server falls back to an **in-memory mock** for `libraryResources`, `libraryContacts`, and `libraryInfo`. The mock is seeded with real HDAK data on first use:

- **Resources:** Electronic Catalog, Institutional Repository, Scopus, Web of Science, ScienceDirect, Springer Link, Research 4 Life, DOAJ, UkrINTEI
- **Contacts:** `library@hdak.edu.ua`, address at Bursatskyi Uzviz 4, Kharkiv

Conversations and messages **require a real MySQL database**.

### Running Migrations

```bash
# Generate SQL migration files and apply them:
DATABASE_URL=mysql://... npm run db:push
```

### Seeding

```bash
# TypeScript version (via tsx):
DATABASE_URL=mysql://... npx tsx seed-db.ts

# ESM version:
DATABASE_URL=mysql://... node seed-db.mjs
```

---

## API Reference

### REST Endpoints

| Method | Path                     | Auth         | Rate limit | Body limit | Description                                                                                                                                |
| ------ | ------------------------ | ------------ | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET`  | `/api/health`            | —            | —          | —          | Always returns `{ "status": "ok" }`                                                                                                        |
| `GET`  | `/api/ready`             | —            | —          | —          | Returns `{ "ready": true }` when `BUILT_IN_FORGE_API_KEY` and `DATABASE_URL` are set; otherwise `503 { "ready": false, "missing": [...] }` |
| `GET`  | `/api/metrics`           | 🔑 admin JWT | 10/min     | —          | Returns latency percentiles, streaming counters, and memory snapshots                                                                      |
| `GET`  | `/api/oauth/callback`    | —            | 10/min     | —          | OAuth 2.0 callback; exchanges code for token, upserts user, sets session cookie                                                            |
| `POST` | `/api/chat`              | —            | 5/min      | **1 MB**   | Streaming AI chat (SSE / UI message stream)                                                                                                |
| `POST` | `/api/admin/process-pdf` | 🔑 admin JWT | 10/min     | **50 MB**  | Ingests extracted PDF text into the RAG vector store                                                                                       |
| `*`    | `/api/trpc/*`            | varies       | 60/min     | 1 MB       | tRPC batch endpoint                                                                                                                        |

> **Body size limits:** The global limit for all endpoints is **1 MB** to protect the server from oversized requests. The admin PDF endpoint is exempt and accepts up to **50 MB** of extracted text content; it is protected by JWT authentication and the admin role.

#### `POST /api/chat`

Streams an AI response using the HDAK library context and tools.

> **Rate limit:** 5 requests/min per IP. **Body limit:** 1 MB.

**Request body:**

```json
{
  "messages": [{ "role": "user", "content": "Чи є у вас Scopus?" }],
  "language": "uk"
}
```

| Field      | Type                   | Required | Description                                             |
| ---------- | ---------------------- | -------- | ------------------------------------------------------- |
| `messages` | `UIMessage[]`          | ✅       | Conversation history (Vercel AI SDK `UIMessage` format) |
| `language` | `"uk" \| "ru" \| "en"` | ❌       | Language for the system prompt (defaults to `"uk"`)     |

**Response:** `text/event-stream` — Vercel AI SDK UI message stream format.  
The AI may call tools before generating the final text response.

---

#### `GET /api/health`

Always returns `200 { "status": "ok", "timestamp": "..." }`. Use for uptime monitoring.

---

#### `GET /api/ready`

Readiness probe. Returns `200 { "ready": true }` when both `BUILT_IN_FORGE_API_KEY` and `DATABASE_URL` are present in the environment. If either is missing returns `503 { "ready": false, "missing": ["BUILT_IN_FORGE_API_KEY"] }`.

---

#### `GET /api/metrics`

Returns server performance data. Requires a valid admin JWT (passed as `Authorization: Bearer <token>`).

**Response example:**

```json
{
  "latency": { "samples": 42, "p50Ms": 120, "p95Ms": 380, "p99Ms": 710 },
  "streaming": { "success": 40, "error": 1, "timeout": 1, "errorRate": 0.048 },
  "memory": [{ "timestamp": "...", "heapUsedMb": 78 }]
}
```

---

#### `POST /api/admin/process-pdf`

Ingests extracted PDF text into the RAG vector store. Admin-only.

> **Rate limit:** 10 requests/min per IP. **Body limit:** 50 MB.

**Request body:**

```json
{
  "title": "Назва документу",
  "content": "<extracted text, up to ~50 MB>",
  "language": "uk",
  "sourceType": "catalog",
  "url": "https://example.com/doc.pdf",
  "author": "Іванов І.І."
}
```

| Field        | Type                                                 | Required | Description                               |
| ------------ | ---------------------------------------------------- | -------- | ----------------------------------------- |
| `title`      | `string`                                             | ✅       | Document title (max 500 chars)            |
| `content`    | `string`                                             | ✅       | Full extracted text                       |
| `language`   | `"uk" \| "ru" \| "en"`                               | ❌       | Document language (default `"uk"`)        |
| `sourceType` | `"catalog" \| "repository" \| "database" \| "other"` | ❌       | Source classification (default `"other"`) |
| `url`        | `string`                                             | ❌       | Source URL (max 2048 chars)               |
| `author`     | `string`                                             | ❌       | Author(s) (max 500 chars)                 |

**Success response (`200`):**

```json
{
  "success": true,
  "chunksCreated": 12,
  "documentId": "manual_1710000000_Назва_документу"
}
```

### tRPC Procedures

Base URL: `/api/trpc`

All procedures use the **SuperJSON** transformer. Auth-protected procedures require a valid session cookie.

#### `auth`

| Procedure     | Type     | Auth   | Description                               |
| ------------- | -------- | ------ | ----------------------------------------- |
| `auth.me`     | query    | public | Returns the current user object or `null` |
| `auth.logout` | mutation | public | Clears the session cookie                 |

#### `conversations`

| Procedure                   | Type     | Auth    | Input                                            | Description                                                                         |
| --------------------------- | -------- | ------- | ------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `conversations.create`      | mutation | 🔐 user | `{ title: string, language?: "en"\|"uk"\|"ru" }` | Creates a new conversation                                                          |
| `conversations.list`        | query    | 🔐 user | —                                                | Lists all conversations for the current user                                        |
| `conversations.get`         | query    | 🔐 user | `{ id: number }`                                 | Gets a single conversation                                                          |
| `conversations.getMessages` | query    | 🔐 user | `{ conversationId: number }`                     | Gets all messages in a conversation                                                 |
| `conversations.delete`      | mutation | 🔐 user | `{ id: number }`                                 | Deletes a conversation and all its messages                                         |
| `conversations.sendMessage` | mutation | 🔐 user | `{ conversationId: number, content: string }`    | Sends a user message, generates AI response, stores both, returns assistant message |

> **Note on `sendMessage`:** This uses `generateText` (non-streaming) from the Vercel AI SDK. It builds context from: the last 10 messages, matching library resources, and RAG context from document chunks. All search steps are inside a `try/catch` so any failure (e.g. embeddings API unavailable) returns a graceful error message instead of crashing.

#### `resources`

| Procedure                    | Type     | Auth     | Input                       | Description                                                                                          |
| ---------------------------- | -------- | -------- | --------------------------- | ---------------------------------------------------------------------------------------------------- |
| `resources.getAll`           | query    | public   | —                           | Returns all library resources                                                                        |
| `resources.search`           | query    | public   | `{ query: string }`         | Full-text search across name/description fields                                                      |
| `resources.getByType`        | query    | public   | `{ type: string }`          | Filter resources by type                                                                             |
| `resources.create`           | mutation | 🔑 admin | resource fields             | Creates a new resource                                                                               |
| `resources.update`           | mutation | 🔑 admin | `{ id: number, ...fields }` | Updates a resource                                                                                   |
| `resources.delete`           | mutation | 🔑 admin | `{ id: number }`            | Deletes a resource                                                                                   |
| `resources.getSiteResources` | query    | public   | —                           | Returns the built-in `hdakResources` array (catalog, repo, Scopus, WoS, etc.) with access conditions |

#### `contacts`

| Procedure         | Type     | Auth     | Input                       | Description           |
| ----------------- | -------- | -------- | --------------------------- | --------------------- |
| `contacts.getAll` | query    | public   | —                           | Returns all contacts  |
| `contacts.create` | mutation | 🔑 admin | contact fields              | Creates a new contact |
| `contacts.update` | mutation | 🔑 admin | `{ id: number, ...fields }` | Updates a contact     |
| `contacts.delete` | mutation | 🔑 admin | `{ id: number }`            | Deletes a contact     |

#### `libraryInfo`

| Procedure         | Type     | Auth     | Input                                | Description                               |
| ----------------- | -------- | -------- | ------------------------------------ | ----------------------------------------- |
| `libraryInfo.get` | query    | public   | `{ key: string }`                    | Gets a library info value by key          |
| `libraryInfo.set` | mutation | 🔑 admin | `{ key, valueEn, valueUk, valueRu }` | Creates or updates a key–value info entry |

---

## AI Integration

### Streaming Chat Endpoint

`/api/chat` uses `streamText` from the Vercel AI SDK with:

- **Model:** `gpt-4o-mini` via an OpenAI-compatible proxy (`BUILT_IN_FORGE_API_URL`)
- **Stop condition:** `stepCountIs(5)` — maximum 5 tool-call + generation cycles
- **Patched fetch:** `createPatchedFetch` strips empty `"type": ""` fields from the SSE stream (proxy compatibility fix)

### HDAK Library Tools

The AI has two tools available during the streaming chat:

#### `searchLibraryResources`

Called when a user asks about available databases or resources.

```
Input:  { query: string }
Output: {
  query: string,
  dbResources: Array<{ name, description, url, type }>,   // from MySQL / mock
  siteResources: Array<{ name, description, url, accessConditions }>,  // from hdakResources
  found: number
}
```

Searches both the `libraryResources` DB table (up to 5 results) and the built-in `hdakResources` list (up to 4 results).

#### `getCatalogSearchLink`

Called when a user asks "do you have author X?" or "how do I find book Y?".

```
Input:  { searchTerm: string, searchType: "author"|"title"|"subject"|"keyword" }
Output: {
  catalogUrl: string,        // https://library-service.com.ua:8443/khkhdak/DocumentSearchForm
  catalogPageUrl: string,    // https://lib-hdak.in.ua/e-catalog.html
  repositoryUrl: string,     // https://repository.ac.kharkov.ua/home
  searchTerm: string,
  searchType: string,
  searchFieldLabel: string,  // "Автор / Author"
  steps: string[],           // 4-step Ukrainian instructions
  repositoryNote: string
}
```

### System Prompts

System prompts are generated by `getSystemPrompt(language, context)` in `server/system-prompts-official.ts`.

The prompt includes:

1. **Role declaration** — "You are a professional librarian assistant for HDAK"
2. **HDAK site map** — full navigation structure with 40+ URLs for every section
3. **Library resources** — all databases, repositories, and collections with URLs and access conditions
4. **Behavioral rules** — respond in the user's language, be concise, provide direct links, use tools when needed

Three languages are supported: `"uk"` (Ukrainian, default) · `"ru"` (Russian) · `"en"` (English).

### RAG (Retrieval-Augmented Generation)

`server/rag-service.ts` implements a full RAG pipeline:

1. **`chunkText(text, chunkSize=1000, overlap=200)`** — splits text into overlapping chunks
2. **`generateEmbedding(text)`** — calls OpenAI `text-embedding-3-small` to produce a 1536-dim vector
3. **`processDocument(...)`** — chunks a document, generates embeddings, stores to `documentChunks` table
4. **`semanticSearch(query, language, topK=5, threshold=0.5)`** — retrieves the top-K most similar chunks using cosine similarity computed in-process (embeddings stored as JSON in MySQL)
5. **`getRagContext(query, language)`** — returns a formatted Markdown block with the top-3 relevant chunks

> **Note:** RAG requires `BUILT_IN_FORGE_API_URL` and `BUILT_IN_FORGE_API_KEY` for embedding generation. If the embeddings API is unavailable, `getRagContext` returns an empty string gracefully (the error is caught in `routers.ts`).

---

## Authentication & Authorization

The app uses **Manus OAuth 2.0**:

1. Unauthenticated users are shown a login button pointing to `VITE_OAUTH_PORTAL_URL`
2. After login, the OAuth server redirects to `/api/oauth/callback?code=...&state=...`
3. The server exchanges the code for an access token, fetches user info, upserts the user in MySQL, and sets a signed JWT session cookie (`app_session_id`)
4. On every tRPC request, the session cookie is verified by `sdk.authenticateRequest()`

**Roles:**

| Role             | Access                                                                     |
| ---------------- | -------------------------------------------------------------------------- |
| `user` (default) | Can use the chatbot and manage their own conversations                     |
| `admin`          | Full access to Admin Panel: CRUD for resources, contacts, and library info |

The first user whose `openId` matches `OWNER_OPEN_ID` is assigned the `admin` role automatically.

---

## Frontend

### Pages

#### `Home.tsx` — Chat interface

- **Overview panel** (no conversation selected): shows bot greeting, 3 feature cards (site navigation / resource search / author lookup), 5 clickable example questions in the selected language, link to the official library website
- **Chat view** (conversation selected): conversation title header, scrollable message list, inline loading spinner, red error banner on send failure, text input with Enter-to-send
- **Sidebar**: list of all conversations with creation date; hover reveals a delete (trash) button per row; "New Chat" button at top
- **Header**: HDAK logo + title, language selector (uk/ru/en), logout button

**State managed:**

- `language` — selected UI/AI language (default: `"uk"`)
- `conversations` — list synced from tRPC
- `currentConversationId` — which conversation is open
- `messages` — messages in the current conversation
- `isLoading` — spinner while waiting for AI response
- `sendError` — error message shown when `sendMessage` fails
- `pendingPrompt` — prompt queued to auto-send after a quick-start chat creation

#### `Admin.tsx` — Administration panel

- Accessible only to users with `role === "admin"` (server-enforced)
- **Resources tab**: add/edit/delete library resources with multilingual name + description fields, type selector, and URL
- **Contacts tab**: add/edit/delete contacts with type selector (email/phone/address/social) and multilingual labels

### Translations (i18n)

All UI strings are defined in `translations` inside `Home.tsx`:

| Key           | en                                     | uk                           | ru                             |
| ------------- | -------------------------------------- | ---------------------------- | ------------------------------ |
| `title`       | HDAK Library Assistant                 | Помічник бібліотеки ХДАК     | Помощник библиотеки ХДАК       |
| `newChat`     | New Chat                               | Новий чат                    | Новый чат                      |
| `typeMessage` | Type your question here...             | Введіть своє запитання...    | Введите свой вопрос...         |
| `ex1`         | How do I register as a library reader? | Як записатися до бібліотеки? | Как записаться в библиотеку?   |
| `ex3`         | Do you have books by Taras Shevchenko? | Чи є книги Тараса Шевченка?  | Есть ли книги Тараса Шевченко? |
| ...           | ...                                    | ...                          | ...                            |

---

## Admin Panel

Navigate to `/admin` after logging in with an admin account.

**Tabs:**

- **Resources** — manage the `libraryResources` database table  
  Fields: name (en/uk/ru), description (en/uk/ru), type, URL  
  Operations: Add · Edit (inline) · Delete
- **Contacts** — manage the `libraryContacts` table  
  Fields: type, value, label (en/uk/ru)  
  Operations: Add · Edit (inline) · Delete

All write operations require `admin` role (enforced on both client and server).

---

## Testing

Tests live in `server/**/*.test.ts` and run via Vitest:

```bash
npm test           # run once
npx vitest         # watch mode
```

**Test files:**

| File                         | Tests | Coverage                                                                                                        |
| ---------------------------- | ----- | --------------------------------------------------------------------------------------------------------------- |
| `server/chatbot.test.ts`     | 30    | DB CRUD (resources, contacts, info, conversations, messages), HDAK site resource assertions, AI tool unit tests |
| `server/auth.logout.test.ts` | 1     | Auth logout mutation                                                                                            |

**Test categories:**

- `Library Resource Management` — getAllResources, searchResources (en/uk/ru keywords), getResourcesByType, create, update, delete
- `Library Contact Management` — getAllContacts, create, update, delete
- `Library Info Management` — getLibraryInfo, setLibraryInfo (create + update)
- `User Query Logging` — logUserQuery (authenticated + anonymous)
- `Conversation and Message Management` — getConversations, getMessages
- `HDAK Site Resources` — hdakResources structure, catalog URL, repository access, Scopus/WoS corporate access
- `Chat tools — library integration` — `searchLibraryResources` (en/uk), Scopus siteResources, `getCatalogSearchLink` (author/title search types, field labels, step generation)

All tests use the **in-memory mock** (no database required).

---

## Build & Deployment

### Development

```bash
pnpm dev      # starts Vite dev server + Express backend in one command
```

### Build

```bash
pnpm run build
```

This runs two steps:

1. `vite build` — compiles the React app to `dist/public/`
2. `esbuild` — bundles `server/_core/index.ts` to `dist/index.js`

The Express server in production serves the compiled frontend from `dist/public/`
alongside the REST and tRPC API routes — no separate frontend container is needed.

### Run tests

```bash
pnpm test               # run all tests once
pnpm run test:coverage  # run all tests with coverage report
```

Tests must pass before any deployment (CI enforces this automatically).

### Production start (manual)

```bash
NODE_ENV=production node dist/index.js
```

### Type checking & formatting

```bash
pnpm run check          # tsc --noEmit
pnpm run format         # prettier --write .
pnpm run format:check   # CI formatting check
```

---

### Docker

The project ships a single multi-stage `Dockerfile` that:

1. Installs all dependencies (including dev tools needed for build & migrations).
2. Builds the frontend (Vite) and backend (esbuild) in one step.
3. Produces a lean production image containing only the compiled output and
   `node_modules` (drizzle-kit is kept for auto-migration on cold start).

#### Build the image

```bash
docker build -t hdak-lib-chatbot:latest .
```

#### Run with Docker Compose (backend + MySQL)

**1. Copy the example env file and fill in your values:**

```bash
cp .env.example .env
```

Required variables:

| Variable                 | Description                                                        |
| ------------------------ | ------------------------------------------------------------------ |
| `BUILT_IN_FORGE_API_KEY` | API key for your OpenAI-compatible LLM endpoint                    |
| `BUILT_IN_FORGE_API_URL` | Base URL of the LLM endpoint (must end with `/v1`)                 |
| `JWT_SECRET`             | Random secret for signing session cookies (`openssl rand -hex 32`) |
| `VITE_APP_ID`            | OAuth application ID                                               |
| `OAUTH_SERVER_URL`       | Base URL of the OAuth server                                       |
| `OWNER_OPEN_ID`          | OpenID that receives the `admin` role on first login               |
| `VITE_OAUTH_PORTAL_URL`  | Full URL of the OAuth login portal                                 |
| `DATABASE_URL`           | Override only if you use an **external** MySQL instance            |

**2. Start all services:**

```bash
docker compose up -d
```

The app will be available at `http://localhost:3000`.  
Database schema migrations run automatically inside `docker-entrypoint.sh`
before the server starts — no manual migration step needed.

**3. View logs:**

```bash
docker compose logs -f app
```

**4. Stop:**

```bash
docker compose down       # keep database volume
docker compose down -v    # also delete the database volume
```

#### Health & readiness probes

| Endpoint          | Purpose                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| `GET /api/health` | Liveness probe — always returns `{status:"ok"}` when the process is up                                 |
| `GET /api/ready`  | Readiness probe — returns `{ready:true}` only when `BUILT_IN_FORGE_API_KEY` and `DATABASE_URL` are set |

Both probes are used by Docker Compose, Fly.io, and Render health checks.

---

### Deploying on free / low-cost cloud platforms

> **Pre-requisites for all platforms:** tests must pass and the Docker image
> must build successfully (CI enforces both via the `test`, `codeql`, `build`,
> and `docker` jobs in `.github/workflows/ci.yml`).

#### Fly.io

Fly.io can deploy directly from the `Dockerfile` using the included `fly.toml`.

```bash
# Install the Fly CLI: https://fly.io/docs/hands-on/install-flyctl/
fly auth login

# First deploy (creates the app and asks for a region)
fly launch

# Set all required secrets (never put secrets in fly.toml)
fly secrets set \
  BUILT_IN_FORGE_API_URL="https://your-llm.example.com/v1" \
  BUILT_IN_FORGE_API_KEY="your-key" \
  JWT_SECRET="$(openssl rand -hex 32)" \
  OWNER_OPEN_ID="your-owner-openid" \
  OAUTH_SERVER_URL="https://oauth.example.com" \
  VITE_APP_ID="your-app-id" \
  VITE_OAUTH_PORTAL_URL="https://oauth.example.com"

# Attach a managed Postgres/MySQL database, or set DATABASE_URL to an external DB
fly secrets set DATABASE_URL="mysql://user:pass@host:3306/hdak_chatbot"

# Subsequent deploys
fly deploy
```

`fly.toml` configures:

- HTTP/HTTPS listeners on ports 80 and 443
- Health check on `/api/health` every 15 s
- Readiness check on `/api/ready` every 30 s
- A shared-CPU 512 MB VM (free tier compatible)

#### Render

Render detects `render.yaml` automatically when you connect your GitHub repository.

1. Go to [render.com](https://render.com) → **New** → **Blueprint**.
2. Connect your repository — Render reads `render.yaml` and creates the web
   service. **Note:** the app requires MySQL 8; Render only offers PostgreSQL
   natively. Set `DATABASE_URL` to an external MySQL provider (e.g. TiDB
   Serverless) or leave it empty for mock mode.
3. Fill in the environment variables marked `sync: false` in the Render
   dashboard (BUILT_IN_FORGE_API_URL, BUILT_IN_FORGE_API_KEY, etc.).
4. Render runs `docker build` on every push to your default branch.
5. Health check is configured to `/api/health`; migrations run automatically
   on each new deployment.

#### Railway

Railway supports Docker deployments without extra config files.

```bash
# Install the Railway CLI: https://docs.railway.app/develop/cli
railway login
railway init          # link or create a project

# Add a MySQL plugin from the Railway dashboard, then set:
railway variables set BUILT_IN_FORGE_API_URL="..."
railway variables set BUILT_IN_FORGE_API_KEY="..."
railway variables set JWT_SECRET="$(openssl rand -hex 32)"
# Railway's MySQL plugin injects DATABASE_URL automatically as a full
# connection string — no manual set needed once the plugin is linked.

railway up            # deploy
```

Railway auto-detects the `Dockerfile` and sets `PORT` automatically.

---

### CI / CD pipeline

`.github/workflows/ci.yml` runs on every push and pull request to `main` / `master`:

| Job      | What it does                                                                               |
| -------- | ------------------------------------------------------------------------------------------ |
| `test`   | Type-check, format-check, run all tests with coverage                                      |
| `codeql` | GitHub CodeQL security scan (JavaScript/TypeScript)                                        |
| `build`  | Full production build (`pnpm run build`)                                                   |
| `docker` | Build Docker image (runs **only on push to main/master**, after all three jobs above pass) |

The Docker image is never built if any test fails or CodeQL finds a critical
issue, preventing insecure or broken artefacts from reaching production.

### Database schema

Run migrations manually (outside Docker):

```bash
pnpm run db:migrate   # alias for drizzle-kit push — creates missing tables/columns, never drops data
```

---

## Web Interface

The project ships a complete **React + Vite** chat interface in the `client/`
directory. The backend serves it as static files from `/` in production — no
separate frontend server is needed.

### Run locally (development)

```bash
# Install dependencies
pnpm install

# Copy and fill .env
cp .env.example .env    # set BUILT_IN_FORGE_API_KEY and others as needed

# Start the full-stack dev server (HMR for frontend, ts-node for backend)
pnpm run dev
```

Open `http://localhost:3000` — the chat UI appears immediately.  
API routes are served from the same process under `/api/*`.

### Chat interface (`/`)

- Sends messages via `POST /api/chat` (streaming with the Vercel AI SDK)
- Sidebar shows conversation history (persisted to MySQL when `DATABASE_URL` is set)
- Multilingual: Ukrainian / Russian / English
- Clickable example questions on the welcome screen

### Admin panel (`/admin`)

Accessible only to users with `role === "admin"`.

| Tab              | Description                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Resources**    | CRUD for library resources (name/description/URL/type)                                                                    |
| **Contacts**     | CRUD for library contacts (email / phone / address / social)                                                              |
| **Library Info** | Key–value entries shown in the chat overview                                                                              |
| **Analytics**    | Query statistics — most asked questions, language breakdown                                                               |
| **Documents**    | Upload PDFs / text to the RAG vector store                                                                                |
| **Performance**  | Live metrics from `GET /api/metrics` — latency percentiles (p50/p95/p99), streaming success/error/timeout, Node.js memory |

> The **Performance** tab polls `/api/metrics` every **5 seconds** and requires an
> admin session cookie (acquired after OAuth login).

### Document Upload

The **Documents** tab in the admin panel lets you add knowledge to the RAG
(Retrieval-Augmented Generation) vector store:

1. Log in as admin and navigate to `/admin` → **Documents** tab.
2. Enter the document title and paste or type the full text (or extracted PDF
   content).
3. Select the language, source type (`catalog` / `repository` / `database` /
   `other`), and optional URL / author.
4. Click **Process & Add to Knowledge Base** — the backend calls
   `POST /api/admin/process-pdf` (50 MB body limit), chunks the content,
   generates embeddings, and stores vectors in the database.
5. Future `/api/chat` requests with relevant questions will automatically
   retrieve the most similar document chunks and include them in the AI
   system prompt.

> **Note:** Embeddings require a model that supports the embeddings API at
> `BUILT_IN_FORGE_API_URL`. If the embeddings API is unavailable, the chat
> endpoint still works without RAG context — it degrades gracefully.

### Metrics Dashboard

The **Performance** tab (admin-only) provides a live server health view:

| Metric                    | Description                                              |
| ------------------------- | -------------------------------------------------------- |
| Uptime                    | How long the server process has been running (h m)       |
| Total Streams             | Cumulative count of `/api/chat` streaming requests       |
| Error Rate                | Fraction of streams that ended in error (red when > 10%) |
| Latency p50/p95/p99       | Percentile response times across recent samples          |
| Success / Error / Timeout | Individual streaming outcome counts                      |
| Heap Used / Total         | Current Node.js heap memory usage                        |
| RSS                       | Resident Set Size (total process memory)                 |

Metrics auto-refresh every **5 seconds** while the tab is open. Click
**Refresh** to fetch immediately. All data is kept in-process — no external
monitoring service is required.

### Build the frontend

```bash
pnpm run build
# → dist/public/  (React app compiled by Vite)
# → dist/index.js (Express server bundled by esbuild)
```

The Express server serves `dist/public/` at `/` and all `/api/*` routes from
the same process. A single `node dist/index.js` starts everything.

### Deploy the full stack

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for step-by-step instructions for
Railway, Render, and Fly.io including:

- CLI commands to link the repo and set secrets
- How `DATABASE_URL` is injected by each platform's MySQL add-on
- Post-deploy verification (`/api/health`, `/api/ready`, `/api/chat`, `/api/metrics`)
- Troubleshooting guide

---

## Library Resources Reference

The following resources are built into `system-prompts-official.ts` and always available to the AI regardless of database state:

| Resource                                                                              | Type               | Access                                       |
| ------------------------------------------------------------------------------------- | ------------------ | -------------------------------------------- |
| [Електронний каталог](https://library-service.com.ua:8443/khkhdak/DocumentSearchForm) | catalog            | Відкритий доступ                             |
| [Інституційний репозитарій ХДАК](https://repository.ac.kharkov.ua/home)               | repository         | Відкритий доступ                             |
| [Електронна бібліотека «Культура України»](http://elib.nplu.org/)                     | electronic_library | Відкритий доступ                             |
| [Scopus](https://www.scopus.com/)                                                     | database           | Корпоративний доступ (мережа академії / VPN) |
| [Web of Science](https://www.webofscience.com/)                                       | database           | Корпоративний доступ (мережа академії / VPN) |
| [ScienceDirect (Elsevier)](https://www.sciencedirect.com/)                            | database           | Корпоративний доступ (мережа академії / VPN) |
| [Springer Link](https://link.springer.com/)                                           | database           | Корпоративний доступ (мережа академії / VPN) |
| [Research 4 Life](https://login.research4life.org/)                                   | database           | Корпоративний доступ (мережа академії / VPN) |
| [Артефактні видання (рідкісні)](https://lib-hdak.in.ua/artifacts.html)                | other              | Відкритий доступ (онлайн перегляд)           |
| [DOAJ](https://lib-hdak.in.ua/catalog-doaj.html)                                      | other              | Відкритий доступ                             |
| [УкрІНТЕІ (авторефератів)](http://nrat.ukrintei.ua/)                                  | other              | Відкритий доступ                             |
| [Офіційний сайт бібліотеки ХДАК](https://lib-hdak.in.ua/)                             | other              | Відкритий доступ                             |

---

## Known Limitations

### AI & Chat

| Limitation                 | Detail                                                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Message history window** | Only the last 10 messages are passed to the AI for context in `sendMessage` (tRPC); earlier messages are silently dropped                              |
| **Tool-call depth**        | The streaming `/api/chat` endpoint stops after 5 tool-call + generation cycles (`stepCountIs(5)`)                                                      |
| **Non-streaming tRPC**     | `conversations.sendMessage` uses `generateText` (non-streaming); the user sees no output until the full response is ready                              |
| **Fixed model**            | Both pathways use `gpt-4o-mini`; there is no per-user or per-conversation model selection                                                              |
| **Timeout**                | AI calls time out after 30 seconds (`AI_TIMEOUT_MS`). Long documents or slow proxies may hit this limit                                                |
| **Language detection**     | Language is inferred from Cyrillic character heuristics (ї/є/ґ → Ukrainian; ё/ы/э → Russian). Mixed-script or code-heavy messages may be misclassified |

### RAG (Retrieval-Augmented Generation)

| Limitation               | Detail                                                                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **In-memory similarity** | Cosine similarity is computed in-process over all stored embeddings — no vector index. Performance degrades as the number of document chunks grows            |
| **MySQL vector storage** | Embeddings are stored as JSON arrays in MySQL, which has no native vector type or ANN (approximate nearest neighbor) index                                    |
| **No PDF parsing**       | `rag-service.ts` accepts plain text input. There is no built-in PDF-to-text conversion; callers must extract text themselves before calling `processDocument` |
| **No deduplication**     | Re-uploading the same document appends duplicate chunks instead of replacing the previous version                                                             |
| **Partial failure**      | If embedding generation fails for some chunks, the successfully stored chunks remain without any cleanup or retry                                             |

### Catalog Sync

| Limitation               | Detail                                                                                                                                                                |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Regex-based parsing**  | The sync service parses the library catalog HTML with simple regular expressions — not a DOM parser. Any layout change on the source page can silently break the sync |
| **Hardcoded interval**   | The scheduler runs every 6 hours; the interval is not configurable via environment variable                                                                           |
| **No concurrency guard** | Nothing prevents two sync runs from overlapping if the previous one takes longer than 6 hours                                                                         |
| **Silent failures**      | Sync errors are logged but do not trigger any alert or notification                                                                                                   |

### Database & Storage

| Limitation                      | Detail                                                                                                                                              |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Conversations require MySQL** | Without `DATABASE_URL`, conversation history and message persistence are unavailable; only the mock in-memory data for resources/contacts is active |
| **No file upload UI**           | `server/storage.ts` provides file upload/download helpers but there is no admin UI or endpoint wired up to it                                       |
| **No soft deletes**             | Deleting a conversation or resource is permanent — there is no archive or recycle bin                                                               |

### Hardcoded Values

Several values are embedded directly in source code and cannot be overridden without a code change:

| Value                                                                        | Location                                                    |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Catalog URL `https://library-service.com.ua:8443/khkhdak/DocumentSearchForm` | `server/system-prompts-official.ts`, `server/_core/chat.ts` |
| Repository URL `https://repository.ac.kharkov.ua/home`                       | `server/system-prompts-official.ts`, `server/_core/chat.ts` |
| Phone placeholder `+38 (057) XXX-XX-XX`                                      | `server/system-prompts-official.ts` (3 places)              |
| 40+ HDAK website page URLs (site map)                                        | `server/system-prompts-official.ts`                         |

### Security Notes

| Area                 | Current State                                                                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CSP**              | `helmet` is configured with `'unsafe-inline'` for scripts and styles (required by Vite/Tailwind in development; should be tightened for production) |
| **Rate limiting**    | IP-based: `/api/chat` 30 req/min · `/api/trpc` 60 req/min · `/api/oauth` 10 req/min. No per-user limits                                             |
| **Prompt injection** | RAG content is sanitized via `sanitizeUntrustedContent()` before insertion into AI prompts                                                          |

---

## License

MIT
