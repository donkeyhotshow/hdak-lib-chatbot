# Deployment Guide

## What is officially supported

| Platform | Status | Build | Start | Notes |
| --- | --- | --- | --- | --- |
| **Vercel** | **Recommended** | `pnpm run build` | Vercel Next.js runtime | Uses `vercel.json` |
| **Railway** | Alternative | `pnpm run build` | `pnpm start` | Uses `railway.json` (Nixpacks) |
| **Render** | Alternative | `pnpm run build` | `pnpm start` | Uses `render.yaml` |
| Fly.io | Optional | Buildpacks | `pnpm start` | Uses `fly.toml`; verify in your region |

---

## Required environment variables

### Required for chat runtime (all environments)

- `BUILT_IN_FORGE_API_URL` **or** `FORGE_API_URL`
- `BUILT_IN_FORGE_API_KEY` **or** `FORGE_API_KEY` **or** `OPENAI_API_KEY`

### Required for production boot

- `JWT_SECRET`
- `OWNER_OPEN_ID`

### Optional (but recommended)

- `DATABASE_URL` (`mysql://...`) for persistent conversations/history
- `REDIS_URL` for distributed state/cache backends
- `OAUTH_SERVER_URL`, `VITE_APP_ID`, `VITE_OAUTH_PORTAL_URL` for OAuth flows
- `VITE_FRONTEND_FORGE_API_URL`, `VITE_FRONTEND_FORGE_API_KEY` for map proxy UI

Use `.env.example` as the single source of truth.

---

## Local production-like check

```bash
cp .env.example .env
# fill required values

pnpm install
pnpm run build
pnpm start
```

Health probes:

- `GET /api/health` — liveness + DB mode/status
- `GET /api/ready` — readiness (critical env present)

---

## Vercel (recommended)

`vercel.json` is preconfigured:

- install: `corepack enable && pnpm install --frozen-lockfile`
- build: `pnpm run build`
- functions timeout limits for `chat`, `trpc`, and `admin/process-pdf`

Set environment variables in **Project Settings → Environment Variables**.

---

## Railway (alternative)

`railway.json` is configured to use Nixpacks:

- build: `corepack enable && pnpm install --frozen-lockfile && pnpm run build`
- start: `pnpm start`
- healthcheck: `/api/health`

Railway provides `PORT` automatically.

---

## Render (alternative)

`render.yaml` blueprint defines:

- runtime: `node`
- build: `corepack enable && pnpm install --frozen-lockfile && pnpm run build`
- start: `pnpm start`
- healthcheck: `/api/health`

Set secrets in Render dashboard (`JWT_SECRET`, AI keys, etc.).

---

## Fly.io (optional)

`fly.toml` is provided with buildpacks and `pnpm start`.
Fly requires additional account/network setup (regions, secrets, app bootstrap),
so prefer Vercel/Railway/Render for simplest path.

---

## Database / Drizzle operations

```bash
pnpm run db:generate
pnpm run db:migrate
pnpm run db:push
pnpm run db:studio
pnpm run db:seed
```

Notes:

- `db:seed` requires `DATABASE_URL` and exits with a clear error if missing.
- Seed script closes DB pool after completion.
