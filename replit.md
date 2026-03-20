# HDAK Library Chatbot

## Overview

This is an AI-powered library assistant chatbot for the HDAK Library. Users can create conversations, ask questions about the library catalog, resources, services, and get AI-generated responses streamed in real-time. The application features a clean, book/library-themed UI with conversation history management (create, view, delete conversations).

The app follows a full-stack TypeScript architecture with a React frontend and Express backend, using PostgreSQL for persistent storage and OpenAI (via Replit AI Integrations) for chat completions with streaming responses.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (React + Vite)
- **Location**: `client/src/`
- **Framework**: React with TypeScript, bundled via Vite
- **Routing**: `wouter` for client-side routing (lightweight alternative to React Router)
- **State Management**: `@tanstack/react-query` for server state (caching, refetching, mutations)
- **UI Components**: shadcn/ui component library (new-york style) built on Radix UI primitives, stored in `client/src/components/ui/`
- **Styling**: Tailwind CSS with CSS variables for theming. Library-themed design using Inter (sans-serif) and Lora (serif) fonts
- **Key Pages**:
  - `Home.tsx` — Landing page with feature cards and "Start Chat" button
  - `Chat.tsx` — Main chat interface with message history and streaming responses
- **Custom Components**:
  - `Sidebar.tsx` — Conversation list with create/delete functionality
  - `ChatMessage.tsx` — Individual message display with markdown rendering (react-markdown + remark-gfm)
  - `ChatInput.tsx` — Auto-resizing textarea with send/stop controls
- **Streaming**: Messages are streamed via SSE (Server-Sent Events) using fetch API's ReadableStream, handled in `client/src/hooks/use-chat.ts` via the `useChatStream` hook
- **Path aliases**: `@/` → `client/src/`, `@shared/` → `shared/`

### Backend (Express)
- **Location**: `server/`
- **Framework**: Express 5 on Node.js, running via `tsx`
- **Entry Point**: `server/index.ts` creates HTTP server, registers routes, sets up Vite dev middleware or static serving
- **API Routes**: Defined in `server/routes.ts`, which delegates to `server/replit_integrations/chat/routes.ts`
- **Key Endpoints**:
  - `GET /api/conversations` — List all conversations
  - `GET /api/conversations/:id` — Get conversation with messages
  - `POST /api/conversations` — Create new conversation
  - `DELETE /api/conversations/:id` — Delete conversation
  - `POST /api/conversations/:id/messages` — Send message and stream AI response (SSE)
  - `GET /api/health` — Health check
- **AI Integration**: Uses OpenAI SDK pointed at Replit AI Integrations endpoint (`AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL` env vars)
- **Chat Storage**: `server/replit_integrations/chat/storage.ts` implements `IChatStorage` interface using Drizzle ORM directly against PostgreSQL

### Shared Code
- **Location**: `shared/`
- **Schema**: `shared/schema.ts` and `shared/models/chat.ts` define Drizzle ORM table schemas and Zod validation schemas
- **Database Tables** *(Data schema version: 1.1)*:
  - `conversations` — id, title, created_at
  - `messages` — id, conversation_id (FK to conversations with cascade delete), role, content, created_at
  - `library_info` — id, key (unique), value_uk, value_ru, value_en, category ('contacts'|'hours'|'rules'|'services'|'general'), source, updated_at
  - `library_resources` — id, name, type ('catalog'|'repository'|'site'|'db'), url, description_uk, description_ru, description_en, is_official, requires_auth
- **Route Contracts**: `shared/routes.ts` defines API contract schemas using Zod

### Database
- **Engine**: PostgreSQL (required, referenced via `DATABASE_URL` environment variable)
- **ORM**: Drizzle ORM with `drizzle-zod` for schema-to-validation integration
- **Migrations**: Drizzle Kit with `drizzle-kit push` command (no migration files, direct push to DB)
- **Connection**: `server/db.ts` creates a `pg.Pool` and wraps it with Drizzle
- **Seeding**: Library data is seeded on startup via `chatStorage.seedLibraryData()`

### Replit Integrations
- **Location**: `server/replit_integrations/`
- **Chat** (`chat/`): Core chat routes, storage, and OpenAI streaming logic
- **Audio** (`audio/`): Voice chat capabilities (recording, playback, speech-to-text, text-to-speech) — available but not actively used in main routes
- **Image** (`image/`): Image generation via gpt-image-1 — available but not actively used in main routes
- **Batch** (`batch/`): Generic batch processing utilities with rate limiting and retries

### Build System
- **Dev**: `tsx server/index.ts` with Vite dev server middleware for HMR
- **Production Build**: `script/build.ts` runs Vite build for client, then esbuild for server bundling
- **Output**: `dist/public/` for client assets, `dist/index.cjs` for server bundle

## External Dependencies

### Required Services
- **PostgreSQL Database**: Must be provisioned and connected via `DATABASE_URL` environment variable. Used for all persistent data (conversations, messages, library info)
- **Replit AI Integrations (OpenAI-compatible)**: Provides LLM chat completions for the assistant. Requires `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL` environment variables

### Key NPM Packages
- **Frontend**: React, wouter, @tanstack/react-query, framer-motion, react-markdown, remark-gfm, date-fns, shadcn/ui (Radix UI primitives), Tailwind CSS
- **Backend**: Express 5, OpenAI SDK, Drizzle ORM, pg (node-postgres), connect-pg-simple
- **Build**: Vite, esbuild, tsx, drizzle-kit
- **Validation**: Zod, drizzle-zod, @hookform/resolvers