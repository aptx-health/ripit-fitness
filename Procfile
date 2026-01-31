# Overmind Procfile for local development
#
# First-time setup (new worktree/clone):
#   See WORKTREE_SETUP.md
#
# Run with: overmind start
# Individual process control: overmind restart worker | overmind connect app

emulator: ./scripts/start-pubsub-emulator.sh
worker: sleep 5 && cd cloud-functions/clone-program && PORT=8082 doppler run --config dev_personal -- npm run dev
app: doppler run --config dev_personal -- npm run dev
