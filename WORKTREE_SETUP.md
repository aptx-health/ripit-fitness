# Worktree Setup Guide

## How It Works

Worktrees auto-detect their identity using `git rev-parse` and derive unique Docker container names and ports via `scripts/worktree-env.sh`. No manual port configuration needed — the same `Procfile` and start scripts work in the primary repo and all worktrees.

| Location | Slot | App Port | Postgres Port | Redis Port | PG Container | Redis Container |
|----------|------|----------|---------------|------------|--------------|-----------------|
| Primary repo | 0 | 3000 | 5433 | 6379 | fitcsv-postgres | fitcsv-redis |
| Any worktree | 1-9 (hashed) | 3100-3900 | 5434-5442 | 6380-6388 | fitcsv-postgres-wt{N} | fitcsv-redis-wt{N} |

To check which slot a worktree gets:
```bash
source scripts/worktree-env.sh
echo "Slot: $WORKTREE_SLOT, PG: $PG_PORT, Redis: $REDIS_PORT"
```

## Quick Setup (New Worktree)

### Setup Steps

```bash
# 1. Install dependencies
npm install
cd cloud-functions/clone-program && npm install && cd ../..

# 2. Generate Prisma client
doppler run --config dev_personal -- npx prisma generate

# 3. Start DB + app (skip redis/worker unless needed)
DOPPLER_CONFIG=dev_personal_worktree1 ./scripts/dev.sh start -l postgres,app
```

The startup automatically:
- Creates an isolated postgres container on a unique port
- Applies Prisma schema (`prisma db push`)
- Creates BetterAuth tables
- Seeds a test user: **dmays@test.com** / **password**

### Primary Repo (no worktree)

```bash
./scripts/dev.sh                     # All services
./scripts/dev.sh start -l postgres,app   # Just DB + app
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
doppler run --config dev_personal -- npx prisma db push   # or let dev.sh restart handle it
doppler run --config dev_personal -- npx prisma generate
overmind restart app   # if already running via dev.sh
```

## Running Multiple Worktrees Simultaneously

Just start overmind in each worktree. Each gets its own postgres and redis containers on unique ports. No conflicts.

All ports (including Next.js, `BETTER_AUTH_URL`, and `NEXT_PUBLIC_APP_URL`) are auto-derived from the worktree slot. No per-worktree Doppler config needed for port differences.

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
`BETTER_AUTH_URL` is auto-set from the worktree slot. If you still see this, check that nothing is overriding the port (e.g., a Doppler config that hardcodes a different `BETTER_AUTH_URL`).

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
