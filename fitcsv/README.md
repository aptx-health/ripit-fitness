# FitCSV

A focused strength training tracker that lets you import programs from CSV and track workouts without rigid app constraints.

## Quick Start

### Prerequisites

- Node.js 20+
- A Supabase account (free tier works)
- Doppler CLI for secrets management

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for database to provision (~2 minutes)
3. Note your connection details (you'll add these to Doppler):
   - **Database URL**: Settings → Database → Connection string (URI)
   - **Supabase URL & Anon Key**: Settings → API

### 2. Setup Doppler

```bash
# Install Doppler CLI
brew install dopplerhq/cli/doppler

# Login
doppler login

# Setup project
doppler setup

# Add secrets via Doppler dashboard or CLI:
doppler secrets set DATABASE_URL="postgresql://..."
doppler secrets set DIRECT_URL="postgresql://..."
doppler secrets set NEXT_PUBLIC_SUPABASE_URL="https://..."
doppler secrets set NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
doppler secrets set NODE_ENV="development"
doppler secrets set NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Note**: The `.env` file in this repo is just a template. Doppler manages all secrets for both local development and production.

### 3. Install Dependencies & Run Migrations

```bash
# Install packages
npm install

# Generate Prisma client
doppler run -- npx prisma generate

# Create initial migration
doppler run -- npx prisma migrate dev --name init

# Seed database (optional - adds sample program)
doppler run -- npx prisma db seed
```

### 4. Start Development

```bash
doppler run -- npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Development Commands

**All commands use Doppler to load secrets:**

```bash
# Development
doppler run -- npm run dev              # Start dev server
doppler run -- npx prisma studio        # Database GUI

# Database
doppler run -- npx prisma migrate dev --name feature_name   # Create migration
doppler run -- npx prisma db push                           # Quick prototype
doppler run -- npx prisma generate                          # Generate client
doppler run -- npx prisma db seed                           # Seed database

# Testing & Quality
npm run lint                            # Run ESLint
npm run type-check                      # TypeScript check
npm run build                           # Production build
```

## CSV Import Format

```csv
week,day,workout_name,exercise,set,reps,weight,rir,notes
1,1,Upper Power,Bench Press,1,5,135lbs,2,
1,1,Upper Power,Bench Press,2,5,135lbs,2,
1,1,Upper Power,Rows,1,8,95lbs,2,Pause at chest
```

**Required columns**: `week`, `day`, `workout_name`, `exercise`, `set`, `reps`, `weight`
**Optional columns**: `rir`, `rpe`, `notes` (auto-detected)

See [docs/CSV_SPEC.md](docs/CSV_SPEC.md) for complete specification.

## Project Structure

```
/app                    # Next.js App Router
  /api                  # API routes
  /(auth)               # Auth pages
  /(app)                # Main app
/lib                    # Business logic
  /supabase/            # Supabase clients
  db.ts                 # Prisma client
/components             # React components
/prisma                 # Database schema & migrations
/docs                   # Architecture docs
```

## Deployment

Vercel deployment is configured via Doppler integration:

1. Connect Doppler to Vercel in Doppler dashboard
2. Link Doppler configs to Vercel environments:
   - `dev` → Vercel Preview
   - `production` → Vercel Production
3. Push to git - Vercel auto-deploys

All secrets sync automatically from Doppler to Vercel.

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - Architecture decisions and design
- [docs/CSV_SPEC.md](docs/CSV_SPEC.md) - CSV format specification
- [CLAUDE.md](CLAUDE.md) - Guide for Claude Code sessions

## Tech Stack

- **Next.js 15** - React framework with App Router
- **Supabase** - PostgreSQL database + Auth + RLS
- **Prisma** - Type-safe ORM
- **Doppler** - Secrets management
- **Tailwind CSS** - Styling
- **TypeScript** - Type safety
- **Vercel** - Deployment

## License

MIT
