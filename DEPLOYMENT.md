# Deployment Guide

This guide covers deploying **HDAK Library Chatbot** on three free/low-cost cloud
platforms — Railway, Render, and Fly.io — using the included Docker setup.

## Contents

- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Local Docker Run](#local-docker-run)
- [CI/CD Pipeline](#cicd-pipeline)
- [Platform Deployments](#platform-deployments)
  - [Railway](#railway)
  - [Render](#render)
  - [Fly.io](#flyio)
- [Post-Deploy Verification](#post-deploy-verification)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

1. All tests must pass locally before deploying:
   ```bash
   pnpm test
   ```
2. The project must build without errors:
   ```bash
   pnpm run build
   ```
3. A working **OpenAI-compatible LLM endpoint** (e.g. a self-hosted vLLM, Azure
   OpenAI, or another provider) that exposes `/v1/chat/completions`.
4. A **MySQL 8** database. Each platform offers a plugin/add-on — details below.

---

## Environment Variables

| Variable                 | Required       | Description                                                |
| ------------------------ | -------------- | ---------------------------------------------------------- |
| `BUILT_IN_FORGE_API_KEY` | **Yes**        | API key for the LLM endpoint                               |
| `BUILT_IN_FORGE_API_URL` | **Yes**        | LLM base URL ending with `/v1`                             |
| `JWT_SECRET`             | **Yes** (prod) | Random secret for session cookies (`openssl rand -hex 32`) |
| `DATABASE_URL`           | **Yes**        | `mysql://user:pass@host:3306/dbname`                       |
| `OWNER_OPEN_ID`          | **Yes** (prod) | OpenID that auto-receives the `admin` role on first login  |
| `OAUTH_SERVER_URL`       | **Yes** (prod) | Base URL of the OAuth server                               |
| `VITE_APP_ID`            | **Yes** (prod) | OAuth application ID                                       |
| `VITE_OAUTH_PORTAL_URL`  | **Yes** (prod) | Full URL of the OAuth login portal                         |
| `NODE_ENV`               | No             | `production` (default)                                     |
| `PORT`                   | No             | HTTP port (default `3000`; set automatically by platforms) |

> **Never commit secrets to source control.** Use platform secret stores.
> No `OPENAI_API_KEY` is used — this project uses `BUILT_IN_FORGE_API_KEY` exclusively.

---

## Local Docker Run

Run the full stack locally using Docker Compose (includes MySQL):

```bash
# 1. Copy the example env file and fill in your values
cp .env.example .env
# Edit .env — at minimum set:
#   BUILT_IN_FORGE_API_URL, BUILT_IN_FORGE_API_KEY, JWT_SECRET

# 2. Start the app + MySQL
docker compose up --build

# 3. The app is available at http://localhost:3000
#    MySQL is exposed on 127.0.0.1:3306
```

To run the container standalone (external MySQL):

```bash
docker build -t hdak-lib-chatbot .

docker run --rm -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e BUILT_IN_FORGE_API_URL="https://your-llm.example.com/v1" \
  -e BUILT_IN_FORGE_API_KEY="your-api-key" \
  -e JWT_SECRET="$(openssl rand -hex 32)" \
  -e DATABASE_URL="mysql://user:pass@host:3306/hdak_chatbot" \
  -e OWNER_OPEN_ID="your-owner-openid" \
  hdak-lib-chatbot
```

The `docker-entrypoint.sh` runs `drizzle-kit push` (idempotent schema migration)
before starting the Node.js server, so the database schema is always up to date.

---

## CI/CD Pipeline

The pipeline in `.github/workflows/ci.yml` runs on every push and pull request
to `main` / `master`:

```
push/PR → test → codeql → build
                         ↘
                          docker (main/master only)
```

| Job      | Blocks     | What it does                                                             |
| -------- | ---------- | ------------------------------------------------------------------------ |
| `test`   | everything | Type-check, prettier format-check, run all tests with coverage           |
| `codeql` | `docker`   | GitHub CodeQL security scan (JS/TypeScript)                              |
| `build`  | `docker`   | Full production build                                                    |
| `docker` | —          | Builds the Docker image (push to main/master only, after all three pass) |

The Docker image is **never built** if tests fail or CodeQL finds a critical
issue. This prevents insecure or broken artefacts from reaching production.

---

## Platform Deployments

### Railway

Railway auto-detects `Dockerfile` and `railway.json`, and sets `PORT`
automatically.

#### 1. Install CLI and link repo

```bash
npm install -g @railway/cli
railway login
railway init          # creates a new project, or link an existing one
```

#### 2. Add a MySQL database

In the Railway dashboard: **New** → **Database** → **MySQL**.  
Railway automatically injects `DATABASE_URL` into your service — no manual
`railway variables set DATABASE_URL` is needed.

#### 3. Set required secrets

```bash
railway variables set BUILT_IN_FORGE_API_URL="https://your-llm.example.com/v1"
railway variables set BUILT_IN_FORGE_API_KEY="your-api-key"
railway variables set JWT_SECRET="$(openssl rand -hex 32)"
railway variables set OWNER_OPEN_ID="your-owner-openid"
railway variables set OAUTH_SERVER_URL="https://oauth.example.com"
railway variables set VITE_APP_ID="your-app-id"
railway variables set VITE_OAUTH_PORTAL_URL="https://oauth.example.com"
```

#### 4. Deploy

```bash
railway up
```

Railway uses `railway.json` to find the `Dockerfile`, builds it, runs
`docker-entrypoint.sh` (which runs `drizzle-kit push` before starting the
server), and serves the app on the port injected by Railway.

---

### Render

Render reads `render.yaml` when you connect your GitHub repository.

#### 1. Connect repository

1. Go to [render.com](https://render.com) → **New** → **Blueprint**.
2. Authorize Render to access your GitHub account and select this repository.
3. Render reads `render.yaml` and creates:
   - A **web service** (Docker)
   - **Note:** The app requires **MySQL 8**. Render only offers PostgreSQL
     natively — set `DATABASE_URL` to an external MySQL provider
     (e.g. [TiDB Serverless](https://tidbcloud.com), Railway MySQL, or
     Aiven), or leave it empty for mock mode (chat works, no persistence).
   - See [FREE_DEPLOYMENT.md](FREE_DEPLOYMENT.md) for step-by-step free
     MySQL setup.

#### 2. Fill in secrets

In the Render dashboard → your service → **Environment**, fill in all variables
marked `sync: false` in `render.yaml`:

- `BUILT_IN_FORGE_API_URL`
- `BUILT_IN_FORGE_API_KEY`
- `OWNER_OPEN_ID`
- `OAUTH_SERVER_URL`
- `VITE_APP_ID`
- `VITE_OAUTH_PORTAL_URL`

`JWT_SECRET` is auto-generated by Render (`generateValue: true`).  
`DATABASE_URL` is injected automatically from the linked database add-on.

#### 3. Deploy

Render deploys automatically on every push to the default branch.  
To trigger a manual deploy: **Manual Deploy** → **Deploy latest commit**.

---

### Fly.io

`fly.toml` is included in the repository with a pre-configured service.

#### 1. Install CLI and authenticate

```bash
# macOS/Linux
curl -L https://fly.io/install.sh | sh
fly auth login
```

#### 2. Launch (first deploy only)

```bash
fly launch
# When prompted:
#   App name: hdak-lib-chatbot  (or any name you prefer)
#   Region: fra (Frankfurt) or the one closest to you
#   Postgres: Yes (or use an external MySQL — see DATABASE_URL below)
```

#### 3. Set secrets

```bash
fly secrets set \
  BUILT_IN_FORGE_API_URL="https://your-llm.example.com/v1" \
  BUILT_IN_FORGE_API_KEY="your-api-key" \
  JWT_SECRET="$(openssl rand -hex 32)" \
  OWNER_OPEN_ID="your-owner-openid" \
  OAUTH_SERVER_URL="https://oauth.example.com" \
  VITE_APP_ID="your-app-id" \
  VITE_OAUTH_PORTAL_URL="https://oauth.example.com" \
  DATABASE_URL="mysql://hdak:hdakpassword@your-mysql-host:3306/hdak_chatbot"
```

> If you used `fly postgres` above, `DATABASE_URL` is attached automatically.
> For MySQL specifically, provision an external DB (e.g. PlanetScale or Railway
> MySQL) and set `DATABASE_URL` manually.

#### 4. Deploy

```bash
fly deploy
```

Subsequent deploys also use `fly deploy`.

---

## Post-Deploy Verification

Replace `https://your-app.example.com` with your actual deployment URL.

### 1. Liveness probe

```bash
curl -i https://your-app.example.com/api/health
# Expected: 200 OK
# Body: {"status":"ok","timestamp":"..."}
```

### 2. Readiness probe

```bash
curl -i https://your-app.example.com/api/ready
# Expected: 200 OK  →  {"ready":true}
# If 503: one or more required env vars are missing (body lists them)
```

### 3. Chat endpoint

```bash
curl -i https://your-app.example.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'
# Expected: 200 with streaming response (text/event-stream or similar)
```

### 4. Admin-only metrics endpoint

```bash
# Without auth — should fail:
curl -i https://your-app.example.com/api/metrics
# Expected: 401 {"error":"Authentication required"}

# With an admin session cookie (obtained after OAuth login):
curl -i https://your-app.example.com/api/metrics \
  -H "Cookie: session=<your-admin-session-cookie>"
# Expected: 200 with latency/memory metrics JSON
```

The metrics endpoint confirms:

- JWT/session authentication is working
- Role-based authorization is enforcing admin-only access
- `adminRateLimiter` is protecting the route

### 5. Admin PDF processing endpoint

```bash
# Without auth — should fail:
curl -i https://your-app.example.com/api/admin/process-pdf
# Expected: 401 (authentication required)

# With an admin session cookie:
curl -i https://your-app.example.com/api/admin/process-pdf \
  -H "Cookie: session=<your-admin-session-cookie>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Document","content":"Sample PDF text content here..."}'
# Expected: 200 {"success":true,"chunksCreated":...}
```

> **Note:** The `/api/admin/process-pdf` route accepts up to 50 MB of JSON.
> If a reverse proxy (Cloudflare, nginx) is in front, ensure it allows at least
> 50 MB request bodies on this path.

### 6. Frontend

Navigate to `https://your-app.example.com` in a browser.  
The React frontend is served by the same Express process from `dist/public/`.  
You should see the HDAK Library Chatbot UI.

---

## Troubleshooting

### `DATABASE_URL` misconfiguration

**Symptom:** Container exits immediately; logs show
`Missing required environment variable(s): DATABASE_URL`.

**Fix:**

1. Verify the variable is set in your platform's secret store.
2. Confirm the connection string format:
   `mysql://user:password@host:3306/database`
3. Ensure the database host is reachable from the app container (same VPC/region).
4. For Railway: the MySQL plugin must be linked to the same project — Railway
   injects `DATABASE_URL` only when plugin and service share a project.

---

### Missing `BUILT_IN_FORGE_API_KEY`

**Symptom:** Server starts then exits; logs show
`Missing required environment variable(s): BUILT_IN_FORGE_API_KEY`.
Or `/api/ready` returns `503 {"ready":false,"missing":["BUILT_IN_FORGE_API_KEY"]}`.

**Fix:**

1. Set `BUILT_IN_FORGE_API_KEY` in the platform secret store.
2. Redeploy / restart the service.
3. Re-check `/api/ready` — it should now return `{"ready":true}`.

> Note: This project never uses `OPENAI_API_KEY`. The only AI key variable is
> `BUILT_IN_FORGE_API_KEY`.

---

### Container failing readiness probe

**Symptom:** Health check passes but readiness probe returns `503`.

**Checks:**

```bash
# See which env vars are reported missing:
curl https://your-app.example.com/api/ready
# {"ready":false,"missing":["BUILT_IN_FORGE_API_KEY","DATABASE_URL"]}
```

Set the missing variables in the platform dashboard and redeploy.

---

### Migrations not running / schema missing

**Symptom:** App starts but database queries fail with
`Table 'hdak_chatbot.conversations' doesn't exist`.

**Explanation:** `docker-entrypoint.sh` runs `node_modules/.bin/drizzle-kit push`
before starting the server. This is idempotent — it creates missing tables and
columns without dropping existing data.

**Checks:**

1. View container logs for the migration step:

   ```bash
   # Railway
   railway logs

   # Render
   # Visible in the Render dashboard → Logs tab

   # Fly.io
   fly logs
   ```

2. Look for:
   ```
   Running database migrations...
   Starting server...
   ```
3. If migration fails, check that `DATABASE_URL` is correct and the DB user
   has `CREATE TABLE` privileges.
4. If `drizzle-kit` is missing, rebuild the Docker image — the `deps` stage
   installs all dependencies including devDependencies that provide `drizzle-kit`.

---

### Port conflicts / app not reachable

All three platforms set `PORT` automatically. The server reads
`process.env.PORT` and will use it. Do **not** hard-code port 3000 in
platform settings unless you also override `PORT`.

---

### Body limit errors on `/api/admin/process-pdf`

**Symptom:** `413 Payload Too Large` for PDF uploads under 50 MB.

**Explanation:** The global body limit is 1 MB. The `/api/admin/process-pdf`
route is registered **before** the global middleware with its own
`express.json({ limit: "50mb" })` parser. A reverse proxy (nginx, Cloudflare,
or a platform load-balancer) may enforce its own lower limit upstream.

**Fix:** Check the platform's proxy settings and ensure the `Content-Length`
limit is set to at least 50 MB for this specific path, or raise the platform's
default body size limit.
