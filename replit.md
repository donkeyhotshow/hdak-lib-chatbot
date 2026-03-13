# HDAK Library Chatbot

An AI-powered chatbot assistant for the Kharkiv State Academy of Culture (KSAC/HDAK) library. Built with Express + React/Vite using TypeScript, tRPC, and Drizzle ORM.

## Architecture

- **Frontend**: React + Vite (TypeScript), served via Express in development, static files in production
- **Backend**: Express.js server with tRPC API endpoints
- **Database**: MySQL (via Drizzle ORM). Falls back to in-memory mock data in development when DATABASE_URL is not set
- **AI**: OpenAI-compatible API (configurable endpoint)
- **Auth**: Manus OAuth (optional in development mode)

## Project Structure

```
client/          - React frontend
server/          - Express backend
  _core/         - Core server utilities (auth, vite, context, etc.)
  services/      - Background services (syncService, aiPipeline)
  routers.ts     - tRPC router definitions
  db.ts          - Database access layer with mock fallback
drizzle/         - Database schema and migrations
shared/          - Shared types/constants between client and server
```

## Development Setup

The app runs on **port 5000** via `pnpm run dev`.

### Required Environment Variables (Production)

- `DATABASE_URL` - MySQL connection string (e.g. `mysql://user:pass@host:3306/dbname`)
- `BUILT_IN_FORGE_API_KEY` - API key for the AI endpoint
- `BUILT_IN_FORGE_API_URL` - Base URL of the OpenAI-compatible API (must end with /v1)
- `JWT_SECRET` - Secret for signing session cookies
- `VITE_APP_ID` - Application ID from Manus OAuth
- `VITE_OAUTH_PORTAL_URL` - OAuth portal URL
- `OAUTH_SERVER_URL` - OAuth server base URL
- `OWNER_OPEN_ID` - OpenID of the admin user

### Development Mode

In development, missing `DATABASE_URL` and `BUILT_IN_FORGE_API_KEY` only produce warnings (not exit). The app runs with mock data.

## Key Configuration Changes for Replit

- `vite.config.ts`: `allowedHosts: true` to allow all hosts (Replit proxy)
- `server/_core/index.ts`: Env var validation is non-fatal in development mode
- `client/src/const.ts`: `getLoginUrl()` returns `"#"` when `VITE_OAUTH_PORTAL_URL` is not set
- `PORT=5000` set in environment

## Deployment

- **Target**: Autoscale
- **Build**: `pnpm run build`
- **Run**: `node dist/index.js`
- Production requires all env vars listed above
