#!/bin/bash
set -e

CONTAINER_NAME="fitcsv-redis"
IMAGE="redis:7-alpine"
PORT=6379

# Cleanup function for graceful shutdown
cleanup() {
  echo "Stopping Redis..."
  docker stop $CONTAINER_NAME 2>/dev/null || true
  docker rm $CONTAINER_NAME 2>/dev/null || true
  exit 0
}

# Register cleanup on SIGTERM (when Overmind stops)
trap cleanup SIGTERM SIGINT

# Stop and remove any existing container with this name
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

echo "Starting Redis on port $PORT..."

docker run --rm --name $CONTAINER_NAME -p $PORT:6379 $IMAGE &
DOCKER_PID=$!

# Wait for Redis to be ready
for i in {1..15}; do
  if docker exec $CONTAINER_NAME redis-cli ping 2>/dev/null | grep -q PONG; then
    echo "Redis ready on port $PORT"
    break
  fi
  if [ $i -eq 15 ]; then
    echo "Redis failed to start after 15 seconds"
    cleanup
    exit 1
  fi
  sleep 1
done

# Wait for docker process to exit (keeps script running)
wait $DOCKER_PID
