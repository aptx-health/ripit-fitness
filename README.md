<div align="center">
  <img src="public/frog-banner-horizontal.png" alt="Ripit Fitness" />
</div>

# Ripit Fitness [![Better Stack Badge](https://uptime.betterstack.com/status-badges/v1/monitor/2krtg.svg)](https://uptime.betterstack.com/?utm_source=status_badge)

A focused strength training tracker that lets you build programs and track workouts without rigid app constraints.

## Quick Start

### Prerequisites

- **Node.js 20+**
- **Docker** (local Postgres and Redis, and the test suite's testcontainers)
- **[Overmind](https://github.com/DarthSim/overmind)** (runs the local services)
- **[Doppler CLI](https://docs.doppler.com/docs/install-cli)** with access to the `fitcsv` project, or your own `.env` (see below)

### With Doppler (maintainer setup)

```bash
git clone https://github.com/aptx-health/ripit-fitness.git
cd ripit-fitness
npm install
doppler run --config dev_personal -- npx prisma generate
./scripts/dev.sh                 # postgres + redis + worker + app
```

Startup applies the schema, seeds the exercise library and a test user, and serves the app on [http://localhost:3000](http://localhost:3000). Sign in as **dmays@test.com / password**.

Worktrees get their own ports and containers; see `AGENTS.md` and `WORKTREE_SETUP.md`.

### Without Doppler

`scripts/dev.sh` runs the app through `doppler run`, so without Doppler start the pieces yourself:

```bash
npm install
./scripts/start-postgres.sh      # in its own terminal: Postgres on 5433, schema, test user, seeds
cp .env.example .env             # then set BETTER_AUTH_SECRET
npx prisma generate
npm run dev
```

Sign in as **dmays@test.com / password**.

#### Mock auth (optional)

Setting `USE_MOCK_AUTH=true` makes every request act as one fixed user (`MOCK_USER_ID`, default `dev-user-local`) and skips the login redirect. It is for quick local UI work only; the mock user has no row in the database unless you create one.

### Environment File Precedence

Next.js loads environment variables in this order (later files override earlier):
1. `.env`
2. `.env.local`
3. `.env.development`
4. `.env.development.local`

If you have an existing `.env.local` or other env file, it overrides `.env`. Update all of them or delete the extras.

## Development Commands

With Doppler, prefix commands that need secrets with `doppler run --config dev_personal --`.

```bash
# Development
./scripts/dev.sh                        # Local services + app
npx prisma studio                       # Database GUI

# Database
npx prisma generate                     # Regenerate Prisma client
# Schema changes need a db push and a hand-written migration: see AGENTS.md

# Testing & Quality
npm run test:run                        # All tests (Docker required)
npm run lint:all                        # Biome + ESLint
npm run type-check                      # TypeScript check
npm run build                           # Production build test
```

## Project Structure

```
/app                    # Next.js App Router
  /api                  # API routes
  /(auth)               # Auth pages
  /(app)                # Main app
/lib                    # Business logic
  /auth/                # Auth wrapper (BetterAuth, optional mock auth)
  db.ts                 # Prisma client
/components             # React components
/cloud-functions        # BullMQ worker (community program cloning)
/prisma                 # Database schema & migrations
/docs                   # Architecture docs
```

## Docker

### Building the Image

The app is packaged as a multi-stage Docker image. `NEXT_PUBLIC_` environment variables must be provided at **build time** because Next.js inlines them into the client bundle.

```bash
docker build \
  --build-arg NEXT_PUBLIC_APP_URL="http://localhost:3000" \
  -t ripit .
```

### Running Locally

Runtime-only variables (database, auth config) are passed via `-e` flags:

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5433/ripit" \
  -e DIRECT_URL="postgresql://postgres:postgres@host.docker.internal:5433/ripit" \
  -e BETTER_AUTH_SECRET="..." \
  -e BETTER_AUTH_URL="http://localhost:3000" \
  ripit
```

> **Tip:** Use `host.docker.internal` to reach services on your host machine.

Verify it's running:

```bash
curl http://localhost:3000/api/health
# {"status":"ok","db":"connected","timestamp":"..."}
```

### CI/CD

GitHub Actions (`.github/workflows/build-app.yml`) builds the image and pushes it to GitHub Container Registry on pushes to `dev` and `main`. Deployment is self-hosted Kubernetes via ArgoCD.

## Troubleshooting

### "Column does not exist in the current database"

This usually means your `.env.local` file is overriding your `.env` and pointing to a different database:

```bash
# Check which database URLs are set
cat .env
cat .env.local  # This overrides .env!

# Update .env.local to match, or delete it
rm .env.local

# Clear caches and regenerate Prisma client
rm -rf .next node_modules/.prisma
npx prisma generate

# Restart dev server
npm run dev
```

### "Cannot find module '.prisma/client/default'"

The Prisma client wasn't fully generated:

```bash
# Remove and regenerate
rm -rf node_modules/.prisma node_modules/@prisma/client
npx prisma generate
```

## Contributing

Interested in contributing? Check out [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:
- How to submit pull requests
- Code standards and conventions
- Current project limitations
- Testing requirements

## Documentation

- [AGENTS.md](AGENTS.md) - Commands, conventions and gotchas
- [docs/STYLING.md](docs/STYLING.md) - Theme system
- [docs/TESTING.md](docs/TESTING.md) - Testing guide

## Tech Stack

- **Next.js 16** - React framework with App Router
- **PostgreSQL + Prisma** - Database and type-safe ORM
- **BetterAuth** - Authentication
- **BullMQ + Redis** - Background jobs
- **Doppler** - Secrets management
- **Tailwind CSS** - Styling
- **TypeScript** - Type safety
- **Docker + Kubernetes (ArgoCD)** - Containerized deployment

## License

MIT
