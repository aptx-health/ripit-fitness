# Worktree Setup Guide

## How It Works

Worktrees auto-detect their identity using `git rev-parse` and derive unique Docker container names and ports via `scripts/worktree-env.sh`. No manual port configuration needed — the same `Procfile` and start scripts work in the primary repo and all worktrees.

| Location | Slot | Postgres Port | Redis Port | PG Container | Redis Container |
|----------|------|---------------|------------|--------------|-----------------|
| Primary repo | 0 | 5433 | 6379 | fitcsv-postgres | fitcsv-redis |
| Any worktree | 1-9 (hashed) | 5434-5442 | 6380-6388 | fitcsv-postgres-wt{N} | fitcsv-redis-wt{N} |

To check which slot a worktree gets:
```bash
source scripts/worktree-env.sh
echo "Slot: $WORKTREE_SLOT, PG: $PG_PORT, Redis: $REDIS_PORT"
```

## Quick Setup (New Worktree)

### Prerequisites

Each worktree that runs on a different port needs a **Doppler config** with the correct `BETTER_AUTH_URL`. Create one if it doesn't exist:

1. Duplicate `dev_personal` in Doppler as `dev_personal_worktree1` (or similar)
2. Update `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to match the worktree's app port (e.g., `http://localhost:5300`)

### Setup Steps

```bash
# 1. Install dependencies
npm install
cd cloud-functions/clone-program && npm install && cd ../..

# 2. Generate Prisma client
doppler run --config dev_personal -- npx prisma generate

# 3. Start DB + app (skip redis/worker unless needed)
DOPPLER_CONFIG=dev_personal_worktree1 overmind start -l postgres,app
```

The startup automatically:
- Creates an isolated postgres container on a unique port
- Applies Prisma schema (`prisma db push`)
- Creates BetterAuth tables
- Seeds a test user: **dmays@test.com** / **password**

### Primary Repo (no worktree)

```bash
overmind start              # All services
overmind start -l postgres,app   # Just DB + app
```

No `DOPPLER_CONFIG` needed — defaults to `dev_personal`.

## Key Files

- `scripts/worktree-env.sh` — Detects worktree slot, exports `PG_PORT`, `REDIS_PORT`, container names
- `scripts/start-postgres.sh` — Starts Docker postgres, applies schema, seeds test user
- `scripts/start-redis.sh` — Starts Docker redis with worktree-aware names/ports
- `Procfile` — Sources `worktree-env.sh`, overrides `DATABASE_URL`/`REDIS_URL` after Doppler

## After Schema Changes

```bash
# If you changed prisma/schema.prisma:
doppler run --config dev_personal -- npx prisma db push   # or let overmind restart handle it
doppler run --config dev_personal -- npx prisma generate
overmind restart app
```

## Running Multiple Worktrees Simultaneously

Just start overmind in each worktree. Each gets its own postgres and redis containers on unique ports. No conflicts.

**Note**: Next.js port is NOT auto-isolated. Each worktree's Doppler config should specify a unique port via `NEXT_PUBLIC_APP_URL` / `BETTER_AUTH_URL`.

## Troubleshooting

### "command not found: next" or "command not found: tsx"
```bash
npm install
```

### "Unknown argument" / Prisma field errors
Prisma client is stale. Regenerate:
```bash
doppler run --config dev_personal -- npx prisma generate
overmind restart app
```

### "Invalid origin" on signup/login
Your Doppler config's `BETTER_AUTH_URL` doesn't match the app's actual URL/port. Update it in Doppler.

### ECONNREFUSED on signup/login
The app can't reach postgres. Check that `DATABASE_URL` port matches the actual postgres container port:
```bash
source scripts/worktree-env.sh && echo "Expected port: $PG_PORT"
docker ps | grep fitcsv-postgres
```

### Port conflict / container name conflict
Check which slot you got and if another worktree hashed to the same slot:
```bash
source scripts/worktree-env.sh && echo $WORKTREE_SLOT
docker ps | grep fitcsv
```
Hash collisions are possible but unlikely (9 slots). If it happens, stop the conflicting worktree first.

### Full DB reset
```bash
source scripts/worktree-env.sh
docker stop $PG_CONTAINER_NAME && docker rm $PG_CONTAINER_NAME
docker volume rm $PG_VOLUME_NAME
overmind restart postgres
```
