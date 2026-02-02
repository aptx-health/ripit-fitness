# Database Migration Workflow

This document describes how to manage database schema changes using Prisma + Supabase CLI.

## Overview

We use a hybrid approach:
- **Prisma** as the source of truth for schema (ORM, type safety)
- **Supabase migrations** for applying changes (local and production)

## Local Development

### Initial Setup (New Worktree)

```bash
# 1. Start Supabase
supabase start

# 2. Apply all migrations and seeds
supabase db reset

# 3. Generate Prisma client
doppler run -- npx prisma generate
```

### Making Schema Changes

**Step 1: Update Prisma Schema**

Edit `prisma/schema.prisma` with your changes.

**Step 2: Create Migration File**

```bash
# Create a new timestamped migration file
supabase migration new describe_your_change

# Example: supabase migration new add_exercise_categories
# Creates: supabase/migrations/20260202123456_add_exercise_categories.sql
```

**Step 3: Generate Migration SQL**

```bash
# Generate SQL diff from current local DB to new Prisma schema
doppler run -- npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel ./prisma/schema.prisma \
  --script > supabase/migrations/[TIMESTAMP]_describe_your_change.sql

# Replace [TIMESTAMP] with the actual timestamp from step 2
```

**Step 4: Test Locally**

```bash
# Apply the new migration to local Supabase
supabase db reset

# Verify it works
doppler run -- npx prisma generate
doppler run -- npm run dev
```

**Step 5: Commit Migration**

```bash
git add prisma/schema.prisma
git add supabase/migrations/[TIMESTAMP]_describe_your_change.sql
git commit -m "feat: add exercise categories"
```

## Production Deployment

**IMPORTANT**: Production pushes should ONLY be done manually by the developer, never automated.

### Option 1: Via Supabase CLI (Recommended)

```bash
# 1. Verify you're linked to production
supabase link --project-ref [YOUR_PROJECT_REF]

# 2. Review pending migrations
supabase db diff

# 3. Push to production
supabase db push
```

### Option 2: Via Supabase Dashboard

1. Go to Supabase Dashboard → SQL Editor
2. Copy migration file contents from `supabase/migrations/[TIMESTAMP]_*.sql`
3. Paste and execute
4. Verify changes in Table Editor

### Post-Deployment

```bash
# Update Prisma client in production (Vercel auto-deploys on git push)
git push origin main
```

## Pulling Changes from Production

If changes were made directly in production (via SQL Editor), pull them down:

```bash
# Pull schema changes from production and create a migration file
supabase db remote commit

# This creates a new migration file with the diff
# Review the file, then commit it
git add supabase/migrations/[NEW_TIMESTAMP]_*.sql
git commit -m "chore: pull production schema changes"
```

## Troubleshooting

### "Migration already applied"

If you see errors about migrations already being applied:

```bash
# Check migration status
supabase migration list

# Repair if needed
supabase migration repair [VERSION] --status applied
```

### "Relation already exists"

This usually means you're trying to apply a migration that was already manually applied via SQL Editor.

Options:
1. **Skip it**: Mark migration as applied without running it
   ```bash
   supabase migration repair [VERSION] --status applied
   ```

2. **Remove it**: Delete the redundant migration file and regenerate from current state

### Seed Data Missing After Reset

Seeds are applied automatically during `supabase db reset`. If exercises are missing:

```bash
cd prisma/seeds
./reseed_supabase_local.sh
```

## Best Practices

### DO:
- ✅ Always update `prisma/schema.prisma` first
- ✅ Test migrations locally with `supabase db reset` before production
- ✅ Commit migration files with schema changes
- ✅ Use descriptive migration names
- ✅ Review generated SQL before applying

### DON'T:
- ❌ Never manually edit production database without creating a migration
- ❌ Don't skip migration files in sequence
- ❌ Don't use `prisma db push` in production (only for local prototyping)
- ❌ Don't apply migrations via SQL Editor without pulling them down with `supabase db remote commit`

## Migration File Naming

Supabase uses timestamp-based naming:

```
[TIMESTAMP]_[description].sql

Examples:
20260202123456_add_exercise_categories.sql
20260202134512_create_workout_templates.sql
```

The timestamp ensures migrations are applied in order.

## RLS Policies

When creating new tables, always add RLS policies in the same migration:

```sql
-- Enable RLS
ALTER TABLE "NewTable" ENABLE ROW LEVEL SECURITY;

-- User can only access their own data
CREATE POLICY "users_own_data" ON "NewTable"
  FOR ALL USING (auth.uid() = "userId");
```

## Indexes

For local development, omit `CONCURRENTLY`:

```sql
-- Local/Migration
CREATE INDEX "table_column_idx" ON "Table"("column");

-- Production (manual via SQL Editor)
CREATE INDEX CONCURRENTLY "table_column_idx" ON "Table"("column");
```

`CONCURRENTLY` prevents table locking but can't run in transactions (migrations are transactional).

## Emergency Rollback

If a production migration fails:

```bash
# 1. Check migration status
supabase migration list

# 2. Revert to previous version (if possible)
supabase db reset --version [PREVIOUS_VERSION]

# 3. Fix the migration file locally
# 4. Test with supabase db reset
# 5. Push corrected version
supabase db push
```

## References

- [Supabase CLI Migrations](https://supabase.com/docs/guides/local-development)
- [Prisma Migrate Diff](https://www.prisma.io/docs/reference/api-reference/command-reference#migrate-diff)
- Seed documentation: `prisma/seeds/README.md`
