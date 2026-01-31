#!/bin/bash
set -e

echo "🔧 Setting up new worktree for fitcsv development..."

# Verify Doppler is configured
echo ""
echo "🔐 Verifying Doppler configuration..."
if ! doppler secrets --config dev_personal --only-names 2>/dev/null | grep -q DATABASE_URL; then
  echo ""
  echo "❌ Error: Doppler not configured or token doesn't have access"
  echo ""
  echo "Please configure Doppler first:"
  echo "  1. Get token from original directory: doppler configure get token --plain"
  echo "  2. Set token here: doppler configure set token <TOKEN>"
  echo "  3. Set config: doppler configure set config dev_personal"
  echo "  4. Set project: doppler configure set project fitcsv"
  echo ""
  echo "See WORKTREE_SETUP.md for details"
  exit 1
fi
echo "✅ Doppler configured correctly"

# Install root dependencies
echo ""
echo "📦 Installing root dependencies..."
npm install

# Install worker dependencies
echo ""
echo "📦 Installing worker dependencies..."
cd cloud-functions/clone-program && npm install && cd ../..

# Generate Prisma clients
echo ""
echo "🔨 Generating Prisma client (root)..."
doppler run --config dev_personal -- npx prisma generate

echo ""
echo "🔨 Generating Prisma client (worker)..."
cd cloud-functions/clone-program
doppler run --config dev_personal -- npx prisma generate
cd ../..

echo ""
echo "✅ Worktree setup complete!"
echo ""
echo "You can now start the development environment with:"
echo "  overmind start"
echo ""
echo "Requirements:"
echo "  - Doppler configured with 'dev_personal' config"
echo "  - Docker running (for Pub/Sub emulator)"
