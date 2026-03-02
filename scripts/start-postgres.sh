#!/bin/bash
set -e

CONTAINER_NAME="fitcsv-postgres"
IMAGE="postgres:15"
PORT=5433
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="postgres"
POSTGRES_DB="ripit"
VOLUME_NAME="fitcsv-pgdata"

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
echo "Applying Prisma schema..."
DATABASE_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@localhost:$PORT/$POSTGRES_DB" npx prisma db push --skip-generate 2>&1
echo "Schema applied"

# Wait for docker process to exit (keeps script running)
wait $DOCKER_PID
