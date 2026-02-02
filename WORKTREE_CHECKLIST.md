# Worktree Quick Troubleshooting Checklist

When something isn't working in a worktree, run through this checklist:

## 1. Dependencies Installed?

```bash
# Check if node_modules exists and is populated
ls -la node_modules/@radix-ui/

# If missing packages, reinstall
npm install
```

**Why**: Each worktree needs its own `node_modules`. Git worktrees share code but not build artifacts.

## 2. Database Migrations Applied?

```bash
# Check if Supabase is running
supabase status

# Reset database with all migrations
supabase db reset

# Verify schema matches
psql "postgresql://postgres:postgres@127.0.0.1:54332/postgres" -c "\d \"Program\""
```

**Why**: Each worktree has its own isolated Supabase database that needs migrations applied.

## 3. Prisma Client Generated?

```bash
# Regenerate Prisma client
doppler run -- npx prisma generate

# Check generation timestamp
ls -la node_modules/.prisma/client/
```

**Why**: Prisma client is generated at build time and needs to match your current schema.

## 4. Dev Server Restarted?

```bash
# Restart Next.js app to pick up new Prisma client
overmind restart app

# Or restart everything
overmind restart
```

**Why**: The running dev server loads Prisma client into memory. Changes to the client require a restart.

## 5. Doppler Configured Correctly?

```bash
# Check current config
doppler configure get config

# Should show: dev_personal_worktree1, dev_personal_worktree2, or dev_personal_worktree3
# Verify DATABASE_URL points to correct port
doppler secrets get DATABASE_URL --plain
```

**Why**: Each worktree needs its own Doppler config pointing to the correct port (54322, 54332, or 54342).

## Common Error Patterns

| Error | Cause | Fix |
|-------|-------|-----|
| `Cannot find module '@radix-ui/react-popover'` | Missing dependencies | `npm install` |
| `Unknown argument 'goals'` | Database missing migrations | `supabase db reset` → `npx prisma generate` → restart app |
| Popover not clickable | Missing dependencies | `npm install` → restart app |
| `Invalid value undefined for datasource` | Wrong Doppler config | Run `./scripts/setup-worktree-supabase.sh` |
| Port already in use | Multiple worktrees on same ports | Check `supabase/config.toml` ports are unique |

## Full Reset (Nuclear Option)

If all else fails, start fresh:

```bash
# Stop everything
overmind quit
supabase stop

# Clean slate
rm -rf node_modules
rm -rf .next

# Run full setup
./scripts/setup-worktree-supabase.sh
./scripts/setup-worktree.sh

# Start services
supabase start
overmind start
```

## Quick Reference: When to Run What

| Situation | Commands |
|-----------|----------|
| **Just pulled from git** | `supabase db reset` → `npx prisma generate` → `overmind restart app` |
| **Switched branches** | `npm install` → `supabase db reset` → `npx prisma generate` → `overmind restart app` |
| **Added new migration** | `supabase db reset` → `npx prisma generate` → `overmind restart app` |
| **Updated schema.prisma** | `npx prisma generate` → `overmind restart app` |
| **Weird unexplained errors** | Full reset (see above) |
