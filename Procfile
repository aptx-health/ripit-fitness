# Overmind Procfile for local development
#
# Worktree-aware: scripts auto-detect worktree slot and use unique
# container names/ports. Same Procfile works in primary and all worktrees.
#
# Run with:
#   overmind start                              # All services (primary repo)
#   overmind start -l postgres,app              # Just DB + app (skip redis/worker)
#
# Worktree usage (requires a separate Doppler config with correct BETTER_AUTH_URL):
#   DOPPLER_CONFIG=dev_personal_worktree1 overmind start -l postgres,app
#
# Individual process control: overmind restart worker | overmind connect app

postgres: ./scripts/start-postgres.sh
redis: sleep 3 && ./scripts/start-redis.sh
worker: sleep 8 && source ./scripts/worktree-env.sh && DB_URL="postgresql://postgres:postgres@localhost:${PG_PORT}/ripit" R_URL="redis://localhost:${REDIS_PORT}" && doppler run --config ${DOPPLER_CONFIG:-dev_personal} -- sh -c "export DATABASE_URL='${DB_URL}' REDIS_URL='${R_URL}' && cd cloud-functions/clone-program && npm run dev"
app: sleep 5 && source ./scripts/worktree-env.sh && DB_URL="postgresql://postgres:postgres@localhost:${PG_PORT}/ripit" R_URL="redis://localhost:${REDIS_PORT}" && doppler run --config ${DOPPLER_CONFIG:-dev_personal} -- sh -c "export DATABASE_URL='${DB_URL}' REDIS_URL='${R_URL}' && npm run dev"
