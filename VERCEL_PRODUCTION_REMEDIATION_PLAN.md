# Vercel Production Audit & Remediation Plan — `hdak-lib-chatbot`

This document is a repository-level implementation deliverable for production deployment on Vercel, based on the current codebase.

## PHASE 1 — Repository Analysis

### 1) Structure and stack detection

- **Primary framework:** Next.js 15 App Router (`package.json`, `app/**`)
- **Runtime:** Node.js route handlers (`export const runtime = "nodejs"` in all API routes)
- **API layer:**
  - Next.js route handlers in `app/api/**/route.ts`
  - tRPC fetch adapter (`app/api/trpc/[trpc]/route.ts`)
- **Legacy server path present in repo:** Express bootstrap in `lib/server/_core/index.ts` (not used by Vercel runtime)
- **AI stack:** Vercel AI SDK (`ai`, `@ai-sdk/openai`, `@ai-sdk/react`)
- **Persistence:** Drizzle ORM + MySQL (`lib/server/db.ts`, `drizzle/schema.ts`)
- **No Edge runtime routes detected**

### 2) Entry points

- `POST /api/chat` → `app/api/chat/route.ts`
- `GET|POST /api/trpc/[trpc]` → `app/api/trpc/[trpc]/route.ts`
- `POST /api/admin/process-pdf` → `app/api/admin/process-pdf/route.ts`
- `GET /api/oauth/callback` → `app/api/oauth/callback/route.ts`
- `GET /api/health` → `app/api/health/route.ts`
- `GET /api/ready` → `app/api/ready/route.ts`
- `GET /api/metrics` → `app/api/metrics/route.ts`
- `GET /api/auth/me` → `app/api/auth/me/route.ts`
- `POST /api/auth/logout` → `app/api/auth/logout/route.ts`

### 3) AI providers

Provider integration is OpenAI-compatible via `createOpenAI(...)`:

- `lib/server/services/aiOrchestrator.ts`
  - `baseURL` from `ENV.forgeApiUrl`
  - `apiKey` from `ENV.forgeApiKey`

Supported key/url aliases (in precedence order):

- URL: `BUILT_IN_FORGE_API_URL` → `FORGE_API_URL`
- API key: `BUILT_IN_FORGE_API_KEY` → `FORGE_API_KEY` → `OPENAI_API_KEY`

### 4) Runtime requirements

- Node.js runtime for route handlers
- MySQL-compatible `DATABASE_URL` for persistent chat/history and user data
- OAuth server integration for auth flows
- OpenAI-compatible LLM endpoint + key

### 5) Required secrets and infra gaps

**Required for production boot + functionality:**

- `JWT_SECRET`
- `BUILT_IN_FORGE_API_URL` or `FORGE_API_URL`
- `BUILT_IN_FORGE_API_KEY` or `FORGE_API_KEY` or `OPENAI_API_KEY`
- `OWNER_OPEN_ID`
- `VITE_APP_ID`
- `OAUTH_SERVER_URL`
- `VITE_OAUTH_PORTAL_URL`
- `DATABASE_URL`

**Now documented in `.env.example` as optional production extensions:**

- `REDIS_URL` (distributed cache/rate-limit/session backend)
- `CHAT_PROVIDER_API_KEY` (external chat gateway integration)

**Missing infrastructure components for higher-scale production:**

- Distributed rate-limit/session store (Redis/Upstash)
- Centralized log sink + alerting (e.g. Datadog/Sentry/OTel backend)
- DB connection pooling strategy tuned for serverless concurrency

### Project architecture diagram

```text
[Browser UI]
    |
    v
[Next.js App Router]
    |
    +--> /api/chat --------------------------+
    |                                        |
    |                              [chatService + aiOrchestrator]
    |                                        |
    |                                  [OpenAI-compatible LLM]
    |
    +--> /api/trpc/[trpc] --> [appRouter] --> [db.ts / Drizzle / MySQL]
    |
    +--> /api/oauth/callback --> [sdk.ts OAuth exchange + JWT cookie]
    |
    +--> /api/admin/process-pdf --> [rag-service ingestion]
    |
    +--> /api/metrics, /api/health, /api/ready
```

---

## PHASE 2 — Vercel Deployment Readiness

### Verification results

- ✅ `package.json` scripts exist: `dev`, `build`, `start`, `check`, `test`
- ✅ Next.js config exists: `next.config.ts`
- ✅ `vercel.json` exists and defines framework/build/install/dev/function durations
- ✅ API handlers use Node runtime and are serverless-compatible
- ✅ Chat endpoint uses streaming response path compatible with Next.js route handlers

### Generated/updated artifacts in this remediation

- ✅ `vercel.json` already present and valid (no rewrite needed)
- ✅ `.env.example` updated to include `REDIS_URL` and `CHAT_PROVIDER_API_KEY`
- ✅ Environment schema updated in `lib/server/_core/env.ts`

---

## PHASE 3 — Environment Variables

`.env.example` now includes these required keys from the request:

- `OPENAI_API_KEY`
- `JWT_SECRET`
- `DATABASE_URL`
- `REDIS_URL`
- `CHAT_PROVIDER_API_KEY`

### Where to obtain each secret

- `OPENAI_API_KEY`: OpenAI platform key **or** key for compatible provider gateway
- `JWT_SECRET`: generate with `openssl rand -hex 32`
- `DATABASE_URL`: MySQL provider connection string (PlanetScale, Railway MySQL, Aiven, etc.)
- `REDIS_URL`: managed Redis URL (Upstash recommended for Vercel)
- `CHAT_PROVIDER_API_KEY`: API key from your chat proxy/provider gateway (if used)

---

## PHASE 4 — Chat Pipeline Architecture Audit

### Pipeline diagram

```text
POST /api/chat
  -> request parse + zod schema validation
  -> rate limit (IP and optionally user)
  -> optional auth (conversation ownership if conversationId set)
  -> prompt guard + token/history trimming
  -> aiOrchestrator.runAiOrchestration()
       -> build provider from env aliases
       -> streamText(...) with system prompt and tools
  -> stream response to client
  -> persist messages on stream finish (if conversation)
```

### Weaknesses and bottlenecks

- In-memory rate-limiter buckets (`lib/server/security/rateLimiter.ts`) are not distributed across instances.
- Prompt-injection defense is regex-based; robust but can be bypassed by obfuscation variants.
- Some runtime memory/session caches are process-local; cold starts reset cache.
- Readiness probe checks key presence but not full dependency reachability.

---

## PHASE 5 — Security Audit (ranked)

### CRITICAL

- No currently verified critical exposed-secret or unauthenticated admin endpoint issue found in current API routes.

### HIGH

1. **Potential weak JWT signing if `JWT_SECRET` left empty**  
   - **File:** `lib/server/_core/env.ts` (default empty), `lib/server/_core/sdk.ts` (JWT sign/verify uses ENV secret)
   - **Risk:** predictable/empty signing key can allow token forgery in misconfigured deployments.
   - **Exact fix:** enforce non-empty minimum-length `JWT_SECRET` in production and fail boot if absent.

### MEDIUM

1. **Rate limiting not shared across serverless instances**  
   - **File:** `lib/server/security/rateLimiter.ts`
   - **Risk:** attackers can bypass limits by spreading load across warm instances.
   - **Exact fix:** back rate limiter with Redis (`REDIS_URL`) and atomic increments/expirations.

2. **Regex-only prompt injection protection**  
   - **File:** `lib/server/security/promptGuard.ts`, `lib/server/config/security.ts`
   - **Risk:** obfuscated prompt injection may bypass line-pattern matching.
   - **Exact fix:** add normalization + structural policy checks (tool call policy, instruction hierarchy, content provenance tags).

3. **Readiness endpoint is minimal**  
   - **File:** `app/api/ready/route.ts`
   - **Risk:** can report ready while DB/OAuth downstreams are unavailable.
   - **Exact fix:** add optional deep checks for DB ping and provider connectivity.

### LOW

1. **Legacy Express server still present**  
   - **File:** `lib/server/_core/index.ts`
   - **Risk:** operational confusion and drift from deployed Next.js runtime.
   - **Exact fix:** either remove/deprecate or explicitly mark as legacy non-Vercel path in docs.

---

## PHASE 6 — Performance Audit

### Findings

- LLM calls are streaming and non-blocking for response transmission (good).
- In-memory caches reduce repeat work but are per-instance only.
- DB history lookups occur per chat request; may become expensive at high QPS without tighter indexes/cache.

### Optimizations

- Introduce Redis-backed cache for conversation/session/rate limits using `REDIS_URL`.
- Add DB query observability and index review on message/conversation access paths.
- Add LLM timeout/retry telemetry labels (timeout, provider error, rate-limit error).

---

## PHASE 7 — Production Hardening

Current code already includes baseline hardening:

- Rate limiting: `lib/server/security/rateLimiter.ts`
- Error handling: API route try/catch in `app/api/chat/route.ts` and others
- Request timeout/retry controls: `SECURITY_CONFIG.externalRequests` + chat timeout
- Logging: `lib/server/_core/logger.ts`, security logger
- Monitoring hooks: `/api/metrics`, memory and stream counters

Remediation extensions (recommended):

1. Redis-backed distributed rate limiter
2. Startup validation for all required production env vars in Next runtime path
3. Structured alerting integration (error rate, latency p95, 429 spikes, 5xx spikes)

---

## PHASE 8 — Vercel Deployment Guide (exact commands)

1) Fork and clone

```bash
git clone https://github.com/<your-user>/hdak-lib-chatbot.git
cd hdak-lib-chatbot
corepack enable pnpm
pnpm install --frozen-lockfile
```

2) Connect repo to Vercel

- Vercel Dashboard → **Add New Project** → import your fork
- Framework auto-detected as Next.js
- Confirm project uses `vercel.json`

3) Configure env vars in Vercel (Production + Preview as needed)

- `JWT_SECRET`
- `DATABASE_URL`
- `BUILT_IN_FORGE_API_URL` or `FORGE_API_URL`
- `BUILT_IN_FORGE_API_KEY` or `FORGE_API_KEY` or `OPENAI_API_KEY`
- `OWNER_OPEN_ID`
- `OAUTH_SERVER_URL`
- `VITE_APP_ID`
- `VITE_OAUTH_PORTAL_URL`
- Optional: `REDIS_URL`, `CHAT_PROVIDER_API_KEY`

4) Deploy

```bash
pnpm run build
```

Expected output includes successful Next.js build completion and generated route artifacts.

5) Validate endpoints

```bash
curl -sS https://<your-app>.vercel.app/api/health
curl -sS https://<your-app>.vercel.app/api/ready
```

Expected output:

- `/api/health`: `{"status":"ok","timestamp":"..."}`
- `/api/ready`: `{"ready":true}` (if AI key configured)

---

## PHASE 9 — Critical Bug Detection

### Verified CI/build issue source

- Recent failing GitHub Actions run: formatting check failure (`pnpm run format:check`), not type/build/runtime failure.
- Evidence: workflow run logs (`run_id=23119620449`) report Prettier warnings and exit code 1.

### Runtime risk items

1. **Env misconfiguration risk for auth signing**
   - File: `lib/server/_core/env.ts`, `lib/server/_core/sdk.ts`
   - Fix: enforce strong `JWT_SECRET` in production path.

2. **Serverless consistency risk for rate limiting**
   - File: `lib/server/security/rateLimiter.ts`
   - Fix: Redis-backed counters.

---

## PHASE 10 — Final Output

### 1) Production deployment checklist

- [ ] Vercel project connected to correct fork/branch
- [ ] Required env vars configured
- [ ] `pnpm run build` succeeds in CI and Vercel
- [ ] `/api/health` returns 200
- [ ] `/api/ready` returns `ready: true`
- [ ] Chat streaming validated from UI and API

### 2) Security checklist

- [ ] `JWT_SECRET` set to strong random value
- [ ] Admin endpoints verified with auth + role checks
- [ ] Distributed rate limiting configured (Redis)
- [ ] Prompt-injection guard telemetry monitored
- [ ] No secrets committed to repository

### 3) Architecture improvements

- Consolidate on Next.js-only server runtime path
- Add shared infra adapters (cache/rate-limit/session) using Redis
- Add explicit dependency health checks for readiness

### 4) Performance improvements

- Redis-backed hot-path cache
- DB index tuning for conversation/message access
- Request-level tracing with latency histograms by endpoint

### 5) Estimated scalability limits (current state)

- Without Redis/distributed limiter: moderate, instance-local scaling only
- LLM latency dominates p95; practical throughput depends on provider limits
- With current defaults, high concurrency may increase 429 and timeout rates before 1000 active chat streams

### 6) Recommended infrastructure for ~1000 concurrent users

- Vercel Pro with regional placement near DB/provider
- Managed MySQL with connection pooling/proxy
- Upstash Redis for distributed rate-limits + ephemeral chat/session caches
- External observability (Sentry + metrics backend)
- Provider-side quota management and fallback model strategy

