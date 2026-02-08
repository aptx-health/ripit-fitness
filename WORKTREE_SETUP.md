# Worktree Setup Guide

When setting up a new git worktree, follow these steps:

## Quick Setup

**Important**: Name your worktrees with `-wt2` or `-wt3` suffix (e.g., `fitcsv-wt2`, `fitcsv-feature-wt3`) to enable automatic detection.

```bash
# 1. Copy Doppler token from primary worktree
cd /Users/dustin/repos/fitcsv  # primary worktree (wt1)
doppler configure get token --plain

# 2. Create and configure new worktree
cd /Users/dustin/repos/fitcsv-wt2  # your new worktree
doppler configure set token <TOKEN_FROM_STEP_1>

# 3. Run Supabase worktree setup (configures ports and Doppler)
./scripts/setup-worktree-supabase.sh

# 4. Run standard setup (npm install, Prisma generate)
./scripts/setup-worktree.sh

# 5. Start Supabase, reset database with migrations, and get JWT keys
supabase start
supabase db reset  # CRITICAL: Applies all migrations to match schema
doppler run -- npx prisma generate  # Regenerate client with migrated schema
supabase status -o env | grep -E '(ANON_KEY|SERVICE_ROLE_KEY)'

# 6. Set JWT keys in Doppler (replace with actual values)
doppler secrets set NEXT_PUBLIC_SUPABASE_ANON_KEY='<anon_key_from_above>'
doppler secrets set SUPABASE_SERVICE_ROLE_KEY='<service_role_key_from_above>'

# 7. Start development
overmind start
```

**Important**: Any time you switch branches or pull new migrations, run:
```bash
supabase db reset
doppler run -- npx prisma generate
overmind restart app  # Restart dev server to pick up new Prisma client
```

## What the Setup Script Does

1. Installs root dependencies (`npm install`)
2. Installs worker dependencies (`cd cloud-functions/clone-program && npm install`)
3. Generates Prisma client for root
4. Generates Prisma client for worker

## Supabase Multi-Worktree Setup

Each worktree runs its own isolated Supabase instance on unique ports to avoid conflicts:

| Worktree | API Port | DB Port | Studio Port | Doppler Config |
|----------|----------|---------|-------------|----------------|
| wt1 (primary) | 54321 | 54322 | 54323 | `dev_personal_worktree1` |
| wt2 | 54331 | 54332 | 54333 | `dev_personal_worktree2` |
| wt3 | 54341 | 54342 | 54343 | `dev_personal_worktree3` |

### How It Works

1. **Port Isolation**: Each worktree's `supabase/config.toml` is configured with unique ports
2. **Separate Databases**: Each Supabase instance has its own PostgreSQL database
3. **Independent JWT Keys**: Each instance generates its own authentication keys
4. **Doppler Configs**: Three configs store the appropriate URLs for each worktree

### Setup Script

The `setup-worktree-supabase.sh` script automatically:
- Detects worktree number (1, 2, or 3) from directory name
- Updates `supabase/config.toml` with correct ports
- Configures Doppler to use the appropriate worktree config

### Manual Setup (if auto-detection fails)

```bash
# Manually specify worktree number
./scripts/setup-worktree-supabase.sh
# Follow prompts to enter worktree number

# Or populate Doppler config manually
./scripts/populate-worktree-doppler.sh 2  # for worktree 2
```

### Starting Supabase

The `Procfile` automatically starts Supabase when you run `overmind start`. Each worktree's Supabase will run on its configured ports.

**Access your worktree's services**:
- wt1: Studio at `http://127.0.0.1:54323`
- wt2: Studio at `http://127.0.0.1:54333`
- wt3: Studio at `http://127.0.0.1:54343`

## Requirements

- **Doppler** configured with valid token (see above)
- **Docker** running (for Pub/Sub emulator and Supabase)
- **Node.js** v20+
- **Supabase CLI** installed (`brew install supabase/tap/supabase`)

## Start Development

```bash
overmind start
```

## Troubleshooting

### Radix UI Components Not Working (Popover, Dialog, etc.)

**Symptom**: Popovers open but buttons aren't clickable, or dialogs don't position correctly.

**Cause**: Missing `node_modules` packages (e.g., `@radix-ui/react-popover`).

**Solution**:
```bash
npm install  # Reinstall all dependencies
overmind restart app
```

Each worktree needs its own `node_modules` directory.

### "Unknown argument" or "Invalid Prisma invocation" Errors

**Symptom**: API errors mentioning fields that should exist (e.g., "Unknown argument `goals`").

**Cause**: Database schema doesn't match Prisma schema, or Prisma client is stale.

**Solution**:
```bash
# Apply all migrations to local database
supabase db reset

# Regenerate Prisma client
doppler run -- npx prisma generate

# Restart dev server to pick up new client
overmind restart app
```

**Why this happens**: The Prisma client is generated at build time. If you run migrations without regenerating the client, or if the dev server is already running, it will use the old client that doesn't know about new fields.

### "PrismaClientConstructorValidationError: Invalid value undefined for datasource"

This means Doppler isn't providing `DATABASE_URL`. Verify:

```bash
doppler secrets --only-names
```

Should show `DATABASE_URL` and other secrets. If not:
1. Verify Doppler config is set correctly: `doppler configure get config`
2. Should show `dev_personal_worktree1`, `dev_personal_worktree2`, or `dev_personal_worktree3`
3. If wrong, run `./scripts/setup-worktree-supabase.sh` again

### "command not found: next" or "command not found: tsx"

Run the setup script again:

```bash
./scripts/setup-worktree.sh
```

### Running Multiple Worktrees Simultaneously

You can run up to 3 worktrees at the same time without port conflicts:

```bash
# In wt1 (primary)
cd ~/repos/fitcsv
overmind start

# In wt2 (separate terminal)
cd ~/repos/fitcsv-wt2
overmind start

# In wt3 (separate terminal)
cd ~/repos/fitcsv-wt3
overmind start
```

Each will have its own:
- Next.js dev server (ports 3000, 3001, 3002 - you may need to update package.json dev script)
- Supabase instance (isolated databases on different ports)
- PubSub emulator (same emulator, different projects)
- Clone worker (different ports: 8082, 8083, 8084)

**Note**: Update your `package.json` dev script if running multiple Next.js instances:
```json
"dev": "next dev -p 3000"  // wt1
"dev": "next dev -p 3001"  // wt2
"dev": "next dev -p 3002"  // wt3
```
