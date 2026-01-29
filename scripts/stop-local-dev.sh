#!/bin/bash
# Manual cleanup script for local dev environment
# Use this if you need to force-stop everything

echo "🧹 Stopping local dev environment..."

# Stop Overmind if running
if pgrep -f overmind > /dev/null; then
  echo "Stopping Overmind..."
  pkill -f overmind
fi

# Stop Pub/Sub emulator container
echo "Stopping Pub/Sub emulator container..."
docker stop fitcsv-pubsub-emulator 2>/dev/null || echo "Container not running"
docker rm fitcsv-pubsub-emulator 2>/dev/null || echo "Container already removed"

# Kill any remaining processes on our ports
echo "Checking for processes on ports 3000, 8082, 8681..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || echo "Port 3000 clear"
lsof -ti:8082 | xargs kill -9 2>/dev/null || echo "Port 8082 clear"
lsof -ti:8681 | xargs kill -9 2>/dev/null || echo "Port 8681 clear"

echo "✅ Cleanup complete"
