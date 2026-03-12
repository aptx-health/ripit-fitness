<div align="center">
  <img src="public/frog-banner-horizontal.png" alt="Ripit Fitness" />
</div>

# Ripit Fitness

A focused strength training tracker that lets you build programs and track workouts without rigid app constraints.

**For Contributors:** Get started in 5 minutes with zero external dependencies - just Docker and Node.js!

## Quick Start

Want to run Ripit Fitness locally? Two setup options:

### Option 1: Local Development (Quickest - No Accounts Needed!)

Perfect for contributors who just want to run the app locally:
- **Docker Desktop** for local PostgreSQL
- **Mock Auth** (no Supabase account needed)
- Up and running in 5 minutes

### Option 2: Full Supabase Setup (Production-like)

For realistic testing with real auth:
- **Supabase account** (free tier) - [Sign up here](https://supabase.com)
- Everything runs through Supabase

---

### Prerequisites

- **Node.js 20+**
- **Docker Desktop** (for Option 1 local dev)
- **Supabase account** (only for Option 2) - [Sign up here](https://supabase.com)

### Setup Instructions

#### Path 1: Local Development (Quickest!) 🚀

**No Supabase account needed - uses mock authentication**

Perfect for contributors who want to quickly test changes without setting up external services.

**1. Clone and install:**
```bash
git clone https://github.com/aptx-health/ripit-fitness.git
cd ripit-fitness
npm install
```

**2. Start PostgreSQL in Docker:**
```bash
docker run -d \
  --name ripit-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ripit \
  -p 5433:5432 \
  postgres:15
```

**3. Configure environment:**
```bash
cp .env.example .env
```

The default `.env.example` is already configured for mock auth! It includes:
- `USE_MOCK_AUTH=true` - Bypasses Supabase Auth entirely
- `MOCK_USER_ID=dev-user-local` - Your mock user ID
- Local PostgreSQL connection strings

**4. Setup database:**
```bash
npx prisma db push
npx prisma generate
```

**5. Start development server:**
```bash
npm run dev
```

**6. Open your browser:**

Visit [http://localhost:3000](http://localhost:3000) - you're **automatically logged in** as `dev@local.dev`!

No login page, no signup needed. Just start using the app immediately.

**What's happening?**
- Mock auth bypasses Supabase Auth completely
- All your data is stored locally in Docker PostgreSQL
- You're always authenticated as the same mock user (`dev-user-local`)
- Perfect for development and testing

---

#### Path 2: Full Supabase Setup (Production-like)

**For realistic testing with real authentication**

1. **Create Supabase project:**
   - Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project
   - Wait for database to provision (~2 minutes)

2. **Collect credentials:**
   - **Settings → Database**: Copy both connection strings
     - "Connection pooling" URL (port 6543) → `DATABASE_URL`
     - "Direct connection" URL (port 5432) → `DIRECT_URL`
   - **Settings → API**: Copy your credentials
     - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
     - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. **Install dependencies:**
```bash
npm install
```

4. **Configure environment:**
```bash
cp .env.example .env
# Edit .env and set:
USE_MOCK_AUTH=false  # or remove this line
DATABASE_URL="[your Supabase connection pooling URL]"
DIRECT_URL="[your Supabase direct connection URL]"
NEXT_PUBLIC_SUPABASE_URL="[your Supabase project URL]"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[your Supabase anon key]"
```

5. **Setup database:**
```bash
npx prisma db push
npx prisma generate
```

6. **Start development server:**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up, and start tracking!

---

### Using Doppler for Secrets Management (Optional)

For production deployments or team environments, consider using [Doppler](https://doppler.com) for secrets management:

```bash
# Install Doppler CLI
brew install dopplerhq/cli/doppler  # macOS

# Login and setup
doppler login
doppler setup

# Configure secrets (mock auth example)
doppler secrets set USE_MOCK_AUTH=true
doppler secrets set DATABASE_URL="postgresql://postgres:postgres@localhost:5433/ripit"
doppler secrets set DIRECT_URL="postgresql://postgres:postgres@localhost:5433/ripit"

# Run commands with Doppler
doppler run -- npm run dev
doppler run -- npx prisma db push
```

### Switching Between Mock and Real Auth

To toggle between development mock auth and real Supabase auth:

**Enable Mock Auth (Local Development):**
```bash
# In .env (and .env.local if it exists)
USE_MOCK_AUTH=true
```

**Disable Mock Auth (Real Supabase):**
```bash
# In .env (and .env.local if it exists)
USE_MOCK_AUTH=false
# OR just comment it out:
# USE_MOCK_AUTH=true

# Make sure Supabase credentials are set:
NEXT_PUBLIC_SUPABASE_URL="https://xxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
```

Restart your dev server after changing:
```bash
npm run dev
```

### Environment File Precedence ⚠️

Next.js loads environment variables in this order (later files override earlier):
1. `.env`
2. `.env.local`
3. `.env.development`
4. `.env.development.local`

**Important:** If you have existing `.env.local` or other env files, they will override `.env`. **Update ALL existing env files** or delete extras to avoid confusion.

## Development Commands

If using Doppler, prefix commands with `doppler run --`. Otherwise, run directly.

```bash
# Development
npm run dev                             # Start dev server
npx prisma studio                       # Database GUI (browse your data)

# Database Operations
npx prisma migrate dev --name feature_name   # Create migration
npx prisma db push                           # Quick prototype (no migration files)
npx prisma generate                          # Regenerate Prisma client
npx prisma db seed                           # Seed sample data

# Testing & Quality
npm test                                # Run tests
npm run lint                            # Run ESLint
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
  /auth/                # Auth wrapper (supports mock auth)
  /supabase/            # Supabase clients
  db.ts                 # Prisma client
/components             # React components
/prisma                 # Database schema & migrations
/docs                   # Architecture docs
```

## How Mock Auth Works

Mock authentication is designed for **local development only** and should never be used in production.

### Architecture

**Auth Wrapper (`lib/auth/server.ts`):**
- Checks `USE_MOCK_AUTH` environment variable
- If true: Returns hardcoded mock user `{ id: "dev-user-local", email: "dev@local.dev" }`
- If false: Calls real Supabase Auth

**All auth checks flow through this wrapper:**
- API routes (`app/api/**/*.ts`)
- Page components (`app/**/*.tsx`)
- Middleware (`lib/supabase/middleware.ts`)
- Layouts (`app/(app)/layout.tsx`)

### Security

**⚠️ Mock auth will fail in production** because:
- The `USE_MOCK_AUTH` env var won't be set in Vercel/production
- The app will fall back to real Supabase Auth
- No accidental mock auth in production

### Use Cases

**Perfect for:**
- ✅ Quick local testing
- ✅ Contributing without Supabase account
- ✅ Developing new features rapidly
- ✅ Running integration tests

**Not suitable for:**
- ❌ Testing multi-user scenarios
- ❌ Testing actual authentication flows
- ❌ Production deployments
- ❌ Validating auth edge cases

## Docker

### Building the Image

The app is packaged as a multi-stage Docker image. `NEXT_PUBLIC_` environment variables must be provided at **build time** because Next.js inlines them into the client bundle.

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key" \
  --build-arg NEXT_PUBLIC_APP_URL="http://localhost:3000" \
  -t rippit .
```

### Running Locally

Runtime-only variables (database, auth config) are passed via `-e` flags:

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:54322/postgres" \
  -e DIRECT_URL="postgresql://postgres:postgres@host.docker.internal:54322/postgres" \
  -e USE_MOCK_AUTH=true \
  -e MOCK_USER_ID=dev-user-local \
  rippit
```

> **Tip:** Use `host.docker.internal` to reach services on your host machine (e.g. local Supabase on port 54322).

Verify it's running:

```bash
curl http://localhost:3000/api/health
# {"status":"ok","db":"connected","timestamp":"..."}
```

### Running with Local Supabase

If you use `supabase start` for local development:

```bash
# Get your local Supabase credentials
supabase status

# Build with local Supabase URL + anon key from status output
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="http://host.docker.internal:54321" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon-key-from-status>" \
  -t rippit .

# Run with local DB connection
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:54322/postgres" \
  -e DIRECT_URL="postgresql://postgres:postgres@host.docker.internal:54322/postgres" \
  rippit
```

### CI/CD

Pushes to `main` automatically build and push to GitHub Container Registry via GitHub Actions:

- `ghcr.io/aptx-health/rippit:sha-<commit>` (immutable)
- `ghcr.io/aptx-health/rippit:latest`

## Troubleshooting

### Mock Auth Not Working / Still Seeing Login Page

If you're using `USE_MOCK_AUTH=true` but still being redirected to login:

```bash
# 1. Check ALL .env files (not just .env)
cat .env | grep USE_MOCK_AUTH
cat .env.local | grep USE_MOCK_AUTH  # This overrides .env!

# 2. Ensure USE_MOCK_AUTH=true in ALL env files
# If .env.local exists, it MUST also have USE_MOCK_AUTH=true

# 3. Clear Next.js cache
rm -rf .next

# 4. Restart dev server
npm run dev

# 5. Open in incognito/private window
# (clears any old Supabase session cookies)
```

**Expected behavior with mock auth:**
- ✅ No login page - goes straight to dashboard
- ✅ Automatically logged in as `dev@local.dev`
- ✅ User ID: `dev-user-local`
- ✅ All data stored locally in PostgreSQL

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

### Switching Between Databases

If you switch from one database to another (e.g., local PostgreSQL to Supabase):

```bash
# 1. Update ALL .env files to point to new database
vi .env
vi .env.local  # If it exists

# 2. Clear caches
rm -rf .next node_modules/.prisma

# 3. Regenerate Prisma client
npx prisma generate

# 4. Apply schema to new database
npx prisma db push

# 5. Restart dev server
npm run dev
```

## Contributing

Interested in contributing? Check out [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:
- How to submit pull requests
- Code standards and conventions
- Current project limitations
- Testing requirements

## Documentation

- [docs/STYLING.md](docs/STYLING.md) - DOOM theme color system
- [CLAUDE.md](CLAUDE.md) - Guide for Claude Code sessions

## Tech Stack

- **Next.js 15** - React framework with App Router
- **Supabase** - PostgreSQL database + Auth + RLS
- **Prisma** - Type-safe ORM
- **Doppler** - Secrets management
- **Tailwind CSS** - Styling
- **TypeScript** - Type safety
- **Docker + k3s** - Containerized deployment

## License

MIT
