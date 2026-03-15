# hdak-lib-chatbot

Next.js 15 (App Router) + tRPC chatbot for HDAK Library.

## Stack

- Next.js 15 (App Router)
- React 19
- tRPC 11
- Vercel AI SDK (`ai`, `@ai-sdk/openai`, `@ai-sdk/react`)
- Drizzle ORM + MySQL

## Run locally

```bash
pnpm install
pnpm dev
```

App will be available at `http://localhost:3000`.

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

## Environment variables

Use `.env.example` as the source of truth. Existing variable names are preserved, including:

- `BUILT_IN_FORGE_API_URL` / `FORGE_API_URL`
- `BUILT_IN_FORGE_API_KEY` / `FORGE_API_KEY` / `OPENAI_API_KEY`
- `DATABASE_URL`
- `JWT_SECRET`
- `OWNER_OPEN_ID`
- `VITE_APP_ID`, `VITE_OAUTH_PORTAL_URL`

## Deployment

This project is configured for **Vercel-only** deployment.

1. Push repository to GitHub.
2. In Vercel: **Add New → Project** and import this repository.
3. Vercel settings are already defined in `vercel.json`:
   - Install: `corepack enable && pnpm install --frozen-lockfile`
   - Build: `pnpm run build`
   - Dev: `pnpm dev`
4. Add required Environment Variables in Vercel Project Settings:
   - `JWT_SECRET`
   - `OWNER_OPEN_ID`
   - `BUILT_IN_FORGE_API_URL` (or `FORGE_API_URL`)
   - `BUILT_IN_FORGE_API_KEY` (or `FORGE_API_KEY` / `OPENAI_API_KEY`)
   - `VITE_APP_ID`
   - `VITE_OAUTH_PORTAL_URL`
   - `OAUTH_SERVER_URL`
   - `DATABASE_URL` (required for persistent chat/history and admin CRUD)

Use `.env.example` as the full variable reference.
