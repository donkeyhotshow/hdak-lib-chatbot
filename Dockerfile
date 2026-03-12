# ── Stage 1: install dependencies ─────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
# Copy lockfile first for better layer caching
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# ── Stage 2: build ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable pnpm && pnpm run build

# ── Stage 3: production image ───────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Run as a non-root user to reduce attack surface.
# addgroup/adduser flags (-S, -g, -u) are BusyBox/Alpine syntax — intentional
# because the Alpine-based stages use node:20-alpine as the base image.
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Only copy the built artefacts and production node_modules
COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
# Required by drizzle-kit push (auto-migrate on cold start)
COPY drizzle.config.ts ./
COPY drizzle/ ./drizzle/

# Startup script: run DB migrations then launch the server
COPY --chown=nodejs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => { if (r.statusCode !== 200) process.exit(1); }).on('error', () => process.exit(1))"

CMD ["./docker-entrypoint.sh"]
