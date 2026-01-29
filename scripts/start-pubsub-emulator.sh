#!/bin/bash
set -e

CONTAINER_NAME="fitcsv-pubsub-emulator"
IMAGE="messagebird/gcloud-pubsub-emulator:latest"
PORT=8681

# Cleanup function for graceful shutdown
cleanup() {
  echo "🧹 Stopping Pub/Sub emulator..."
  docker stop $CONTAINER_NAME 2>/dev/null || true
  docker rm $CONTAINER_NAME 2>/dev/null || true
  exit 0
}

# Register cleanup on SIGTERM (when Overmind stops)
trap cleanup SIGTERM SIGINT

# Stop and remove any existing container with this name
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

echo "🚀 Starting Pub/Sub emulator on port $PORT..."

# Start emulator in background with a name
docker run --rm --name $CONTAINER_NAME -p $PORT:8681 $IMAGE &
DOCKER_PID=$!

# Wait for emulator to be ready
echo "⏳ Waiting for emulator to start..."
for i in {1..30}; do
  if curl -s http://localhost:$PORT/v1/projects/test-project >/dev/null 2>&1; then
    echo "✅ Emulator ready on port $PORT"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "❌ Emulator failed to start after 30 seconds"
    cleanup
    exit 1
  fi
  sleep 1
done

# Create topic and subscription
echo "🔧 Creating topic and subscription..."
PUBSUB_EMULATOR_HOST=localhost:$PORT npx tsx scripts/setup-pubsub-emulator.ts

echo "🎉 Pub/Sub emulator fully initialized"

# Wait for docker process to exit (keeps script running)
wait $DOCKER_PID
