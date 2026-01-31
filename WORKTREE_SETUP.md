# Worktree Setup Guide

When setting up a new git worktree, follow these steps:

## Quick Setup

```bash
# 1. Copy Doppler token from original directory
cd /Users/dustin/repos/fitcsv  # or your original directory
doppler configure get token --plain

# 2. In the new worktree, set the token
cd /Users/dustin/repos/fitcsv-theming-work  # your new worktree
doppler configure set token <TOKEN_FROM_STEP_1>
doppler configure set project fitcsv
doppler configure set config dev_personal

# 3. Run the setup script
./scripts/setup-worktree.sh
```

## What the Setup Script Does

1. Installs root dependencies (`npm install`)
2. Installs worker dependencies (`cd cloud-functions/clone-program && npm install`)
3. Generates Prisma client for root
4. Generates Prisma client for worker

## Requirements

- **Doppler** configured with valid token (see above)
- **Docker** running (for Pub/Sub emulator)
- **Node.js** v20+

## Start Development

```bash
overmind start
```

## Troubleshooting

### "PrismaClientConstructorValidationError: Invalid value undefined for datasource"

This means Doppler isn't providing `DATABASE_URL`. Verify:

```bash
doppler secrets --config dev_personal --only-names
```

Should show `DATABASE_URL` and other secrets. If not, recopy the token from the original directory.

### "command not found: next" or "command not found: tsx"

Run the setup script again:

```bash
./scripts/setup-worktree.sh
```
