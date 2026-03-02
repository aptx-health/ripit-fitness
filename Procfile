# Overmind Procfile for local development
#
# First-time setup (new worktree/clone):
#   See WORKTREE_SETUP.md
#
# Run with: overmind start
# Individual process control: overmind restart worker | overmind connect app

postgres: ./scripts/start-postgres.sh
redis: sleep 3 && ./scripts/start-redis.sh
worker: sleep 8 && cd cloud-functions/clone-program && doppler run -- npm run dev
app: sleep 5 && doppler run -- npm run dev
