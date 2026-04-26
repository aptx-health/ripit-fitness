#!/bin/bash
set -e

# Load worktree-aware container names and ports
source "$(dirname "$0")/worktree-env.sh"

CONTAINER_NAME="$PG_CONTAINER_NAME"
IMAGE="postgres:15"
PORT="$PG_PORT"
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="postgres"
POSTGRES_DB="ripit"
VOLUME_NAME="$PG_VOLUME_NAME"

# Cleanup function for graceful shutdown (stop container but preserve volume)
cleanup() {
  echo "Stopping PostgreSQL..."
  docker stop $CONTAINER_NAME 2>/dev/null || true
  exit 0
}

# Register cleanup on SIGTERM (when Overmind stops)
trap cleanup SIGTERM SIGINT

# Stop any existing container with this name
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

echo "Starting PostgreSQL on port $PORT..."

docker run --name $CONTAINER_NAME \
  -v $VOLUME_NAME:/var/lib/postgresql/data \
  -e POSTGRES_USER=$POSTGRES_USER \
  -e POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
  -e POSTGRES_DB=$POSTGRES_DB \
  -p $PORT:5432 \
  $IMAGE &
DOCKER_PID=$!

# Wait for PostgreSQL to be ready
for i in {1..30}; do
  if docker exec $CONTAINER_NAME pg_isready -U $POSTGRES_USER 2>/dev/null | grep -q "accepting connections"; then
    echo "PostgreSQL ready on port $PORT"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "PostgreSQL failed to start after 30 seconds"
    cleanup
    exit 1
  fi
  sleep 1
done

# Apply Prisma schema (push, no migration files needed for local dev)
# Local Postgres is direct (no PgBouncer), so DIRECT_URL mirrors DATABASE_URL.
# The Prisma schema requires directUrl to be set since #408.
LOCAL_DB_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@localhost:$PORT/$POSTGRES_DB"
echo "Applying Prisma schema..."
DATABASE_URL="$LOCAL_DB_URL" DIRECT_URL="$LOCAL_DB_URL" npx prisma db push --accept-data-loss --skip-generate 2>&1
echo "Schema applied"

# Apply BetterAuth tables (not managed by Prisma, so db push drops them)
echo "Applying BetterAuth schema..."
PGPASSWORD=$POSTGRES_PASSWORD psql -h localhost -p $PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
CREATE TABLE IF NOT EXISTS \"user\" (\"id\" text NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY, \"name\" text NOT NULL, \"email\" text NOT NULL UNIQUE, \"emailVerified\" boolean NOT NULL, \"image\" text, \"createdAt\" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, \"updatedAt\" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL);
CREATE TABLE IF NOT EXISTS \"session\" (\"id\" text NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY, \"expiresAt\" timestamptz NOT NULL, \"token\" text NOT NULL UNIQUE, \"createdAt\" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, \"updatedAt\" timestamptz NOT NULL, \"ipAddress\" text, \"userAgent\" text, \"userId\" text NOT NULL REFERENCES \"user\" (\"id\") ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS \"account\" (\"id\" text NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY, \"accountId\" text NOT NULL, \"providerId\" text NOT NULL, \"userId\" text NOT NULL REFERENCES \"user\" (\"id\") ON DELETE CASCADE, \"accessToken\" text, \"refreshToken\" text, \"idToken\" text, \"accessTokenExpiresAt\" timestamptz, \"refreshTokenExpiresAt\" timestamptz, \"scope\" text, \"password\" text, \"createdAt\" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, \"updatedAt\" timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS \"verification\" (\"id\" text NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY, \"identifier\" text NOT NULL, \"value\" text NOT NULL, \"expiresAt\" timestamptz NOT NULL, \"createdAt\" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, \"updatedAt\" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL);
CREATE INDEX IF NOT EXISTS \"session_userId_idx\" ON \"session\" (\"userId\");
CREATE INDEX IF NOT EXISTS \"account_userId_idx\" ON \"account\" (\"userId\");
CREATE INDEX IF NOT EXISTS \"verification_identifier_idx\" ON \"verification\" (\"identifier\");
" 2>&1
echo "BetterAuth schema applied"

# Ensure role column exists on user table (BetterAuth doesn't manage it)
echo "Ensuring role column on user table..."
PGPASSWORD=$POSTGRES_PASSWORD psql -h localhost -p $PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user' AND column_name='role') THEN
    ALTER TABLE \"user\" ADD COLUMN \"role\" text NOT NULL DEFAULT 'user';
  END IF;
END \$\$;
" 2>&1

# Seed test user (dmays@test.com / password) — idempotent, with admin role
echo "Seeding test user..."
PW_HASH=$(node -e "require('bcrypt').hash('password',10).then(h=>process.stdout.write(h))")
PGPASSWORD=$POSTGRES_PASSWORD psql -h localhost -p $PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "
INSERT INTO \"user\" (id, name, email, \"emailVerified\", role, \"createdAt\", \"updatedAt\")
VALUES ('test-user-id', 'Dustin Mays', 'dmays@test.com', true, 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO UPDATE SET role = 'admin';
INSERT INTO \"account\" (id, \"accountId\", \"providerId\", \"userId\", password, \"createdAt\", \"updatedAt\")
VALUES ('test-account-id', 'test-user-id', 'credential', 'test-user-id',
  '${PW_HASH}',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET password = EXCLUDED.password;
" 2>&1
echo "Test user seeded (dmays@test.com / password / admin)"

# Seed exercise definitions (SQL files — idempotent via ON CONFLICT DO NOTHING)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SEEDS_DIR="$SCRIPT_DIR/../prisma/seeds"
echo "Seeding exercise definitions..."
for f in "$SEEDS_DIR"/0[0-8]_*.sql; do
  PGPASSWORD=$POSTGRES_PASSWORD psql -h localhost -p $PORT -U $POSTGRES_USER -d $POSTGRES_DB -f "$f" > /dev/null 2>&1
done
echo "Exercise definitions seeded"

# Seed curated community programs (idempotent — skips if already present)
echo "Seeding community programs..."
DATABASE_URL="$LOCAL_DB_URL" DIRECT_URL="$LOCAL_DB_URL" \
  npx ts-node --compiler-options '{"module":"CommonJS","types":["node"]}' "$SEEDS_DIR/curated/seed-community-programs.ts" 2>&1
echo "Community programs seeded"

# Seed dev content (program, workout history, learning articles)
echo "Seeding dev content..."
DATABASE_URL="$LOCAL_DB_URL" DIRECT_URL="$LOCAL_DB_URL" \
  npx ts-node --compiler-options '{"module":"CommonJS","types":["node"]}' "$SEEDS_DIR/seed-dev-content.ts" 2>&1
echo "Dev content seeded"

# Wait for docker process to exit (keeps script running)
wait $DOCKER_PID
