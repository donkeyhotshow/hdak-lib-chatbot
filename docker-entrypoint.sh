#!/bin/sh
set -e

echo "===== Application Startup at $(date) ====="

# Run database schema migrations before starting the server.
# drizzle-kit push is idempotent: it creates missing tables and columns but
# never drops existing data, so it is safe to run on every container start.
if [ -z "$DATABASE_URL" ]; then
  echo "No DATABASE_URL set, skipping migrations (using mock data)"
else
  echo "Running database migrations..."
  node_modules/.bin/drizzle-kit push
fi

echo "Starting server..."
exec node dist/index.js
