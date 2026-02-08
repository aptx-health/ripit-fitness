# Overmind Procfile for local development
#
# First-time setup (new worktree/clone):
#   See WORKTREE_SETUP.md
#
# Run with: overmind start
# Individual process control: overmind restart worker | overmind connect app

supabase: supabase start && tail -f /dev/null
emulator: sleep 3 && ./scripts/start-pubsub-emulator.sh
worker: sleep 8 && cd cloud-functions/clone-program && PORT=8082 doppler run -- npm run dev
app: sleep 5 && doppler run -- npm run dev
