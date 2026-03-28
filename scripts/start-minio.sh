#!/bin/bash
set -e

# Load worktree-aware container names and ports
source "$(dirname "$0")/worktree-env.sh"

CONTAINER_NAME="fitcsv-minio${WORKTREE_SLOT:+-wt$WORKTREE_SLOT}"
[ "$WORKTREE_SLOT" -eq 0 ] && CONTAINER_NAME="fitcsv-minio"
IMAGE="minio/minio:latest"
API_PORT=$((9000 + WORKTREE_SLOT))
CONSOLE_PORT=$((9001 + WORKTREE_SLOT))
VOLUME_NAME="fitcsv-minio-data${WORKTREE_SLOT:+-wt$WORKTREE_SLOT}"
[ "$WORKTREE_SLOT" -eq 0 ] && VOLUME_NAME="fitcsv-minio-data"

MINIO_ROOT_USER="minioadmin"
MINIO_ROOT_PASSWORD="minioadmin"

# Cleanup function for graceful shutdown
cleanup() {
  echo "Stopping MinIO..."
  docker stop $CONTAINER_NAME 2>/dev/null || true
  docker rm $CONTAINER_NAME 2>/dev/null || true
  exit 0
}

# Register cleanup on SIGTERM (when Overmind stops)
trap cleanup SIGTERM SIGINT

# Stop and remove any existing container with this name
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

echo "Starting MinIO on API port $API_PORT, console port $CONSOLE_PORT..."

docker run --name $CONTAINER_NAME \
  -v $VOLUME_NAME:/data \
  -e MINIO_ROOT_USER=$MINIO_ROOT_USER \
  -e MINIO_ROOT_PASSWORD=$MINIO_ROOT_PASSWORD \
  -p $API_PORT:9000 \
  -p $CONSOLE_PORT:9001 \
  $IMAGE server /data --console-address ":9001" &
DOCKER_PID=$!

# Wait for MinIO to be ready
for i in {1..30}; do
  if curl -sf http://localhost:$API_PORT/minio/health/live >/dev/null 2>&1; then
    echo "MinIO ready on port $API_PORT (console: $CONSOLE_PORT)"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "MinIO failed to start after 30 seconds"
    cleanup
    exit 1
  fi
  sleep 1
done

# Create learn-content bucket if it doesn't exist
# Use mc (MinIO client) inside the container
docker exec $CONTAINER_NAME mc alias set local http://localhost:9000 $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD 2>/dev/null || true
docker exec $CONTAINER_NAME mc mb local/learn-content --ignore-existing 2>/dev/null || true
docker exec $CONTAINER_NAME mc anonymous set download local/learn-content 2>/dev/null || true
echo "Bucket 'learn-content' ready (public read)"

# Wait for docker process to exit (keeps script running)
wait $DOCKER_PID
