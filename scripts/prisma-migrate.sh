#!/bin/sh
set -euo pipefail

# Extract host, port, and dbname from DATABASE_URL (no credentials logged)
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:/]*\).*|\1|p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*@[^:]*:\([0-9]*\)/.*|\1|p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')

echo "=== Prisma Migrate Deploy ==="
echo "Target: ${DB_HOST}:${DB_PORT:-5432}/${DB_NAME}"
echo "Timestamp: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "==="

# List pending migrations for visibility
echo "Checking migration status..."
./node_modules/.bin/prisma migrate status 2>&1 || true

echo "Running migrations..."
./node_modules/.bin/prisma migrate deploy

echo "Migration completed successfully."
