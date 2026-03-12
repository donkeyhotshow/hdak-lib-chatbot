#!/bin/sh
set -e

# Run database schema migrations before starting the server.
# drizzle-kit push is idempotent: it creates missing tables and columns but
# never drops existing data, so it is safe to run on every container start.
echo "Running database migrations..."
node_modules/.bin/drizzle-kit push

echo "Starting server..."
exec node dist/index.js
