# Database Migration Workflow

Schema changes require BOTH a local `db push` AND a migration file. CI blocks PRs that modify `schema.prisma` without a corresponding migration (`migration-check.yml`).

## Why both?

`db push` gives fast local iteration with no migration files to manage. The migration file is what `prisma migrate deploy` runs in staging and production during deploy (via init container / ArgoCD pre-sync Job).

## Making Schema Changes

### 1. Edit the schema

```
prisma/schema.prisma
```

### 2. Apply to local DB

```bash
doppler run --config dev_personal -- npx prisma db push
```

### 3. Generate Prisma Client

```bash
doppler run --config dev_personal -- npx prisma generate
```

### 4. Create the migration file

Timestamp format: `YYYYMMDDHHMMSS`.

```bash
TIMESTAMP=$(date -u +"%Y%m%d%H%M%S")
mkdir -p prisma/migrations/${TIMESTAMP}_describe_your_change
```

Write the SQL in `migration.sql`. Example for adding a column:

```sql
ALTER TABLE "PrescribedSet" ADD COLUMN "isWarmup" BOOLEAN NOT NULL DEFAULT false;
```

### 5. Mark migration as already applied locally

`db push` already applied the change, so tell Prisma not to re-run it:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:<PG_PORT>/ripit" \
  npx prisma migrate resolve --applied ${TIMESTAMP}_describe_your_change
```

Replace `<PG_PORT>` with your actual port (5433 for primary repo, check `scripts/worktree-env.sh` for worktrees).

### 6. Commit both files

```bash
git add prisma/schema.prisma prisma/migrations/${TIMESTAMP}_describe_your_change/
git commit -m "feat: describe your change"
```

## How Migrations Deploy

### Staging (merge to `dev`)

An init container runs `prisma migrate deploy` before the app pod starts. Migrations auto-apply on every deploy.

### Production (merge to `main`)

An ArgoCD pre-sync Job runs `prisma migrate deploy`. The app image is tagged with `sha-<commit>` (pinned, never overwritten). The SHA is manually updated in the infra repo's helm values.

Both environments use `DIRECT_URL` (bypasses PgBouncer) for migrations. See `/docs/DATABASE_CONNECTIONS.md` for connection details.

## CI Guardrails

`migration-check.yml` runs on PRs and flags:
- Schema changes without a matching migration file (blocks merge)
- Destructive migrations (requires `destructive-migration-approved` label to merge to `main`)

## Troubleshooting

### "Migration already applied"

If `prisma migrate resolve` says the migration is already applied, it's fine -- that's the expected state after `db push`.

### "Column already exists" during migrate deploy

The migration SQL is trying to add something that `db push` already created. Use `migrate resolve --applied` to mark it (step 5 above).

### Full local DB reset

```bash
source scripts/worktree-env.sh
docker stop $PG_CONTAINER_NAME && docker rm $PG_CONTAINER_NAME
docker volume rm $PG_VOLUME_NAME
# Restart via dev.sh -- schema will be re-applied automatically
```

## What NOT to do

- Do not run `prisma migrate deploy` locally. Use `db push` for local dev.
- Do not run `prisma migrate dev`. We create migration files manually to keep full control over the SQL.
- Do not apply migrations directly to production via psql. Script everything, test on staging first.
