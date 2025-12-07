# FitCSV Setup Guide

Complete setup instructions for local development and deployment.

## Prerequisites

- **Node.js 20+**
- **Supabase account** (free tier)
- **Doppler account** (free tier)
- **Vercel account** (free tier, for deployment)

## Part 1: Supabase Setup

### Create Project

1. Go to https://supabase.com/dashboard
2. Click "New project"
3. Choose organization and fill in:
   - **Project name**: `fitcsv` (or your choice)
   - **Database password**: Generate a strong password (save it!)
   - **Region**: Choose closest to you
4. Click "Create new project"
5. Wait ~2 minutes for provisioning

### Get Connection Details

**Database Connection Strings**:
1. Go to Settings → Database
2. Copy "Connection string" under "Connection pooling"
3. Replace `[YOUR-PASSWORD]` with your database password
4. You'll need TWO urls:
   - `DATABASE_URL`: Connection pooling URL (for app queries)
   - `DIRECT_URL`: Direct connection URL (for migrations)

Example:
```
# Connection pooling (for DATABASE_URL)
postgresql://postgres.xxxxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres

# Direct connection (for DIRECT_URL)
postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres
```

**API Credentials**:
1. Go to Settings → API
2. Copy:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJ...` (long JWT token)

## Part 2: Doppler Setup

### Install Doppler CLI

**macOS**:
```bash
brew install dopplerhq/cli/doppler
```

**Linux**:
```bash
curl -sLf --retry 3 --tlsv1.2 --proto "=https" 'https://packages.doppler.com/public/cli/install.sh' | sudo sh
```

**Windows**:
```powershell
scoop install doppler
```

### Login to Doppler

```bash
doppler login
```

This opens a browser for authentication.

### Create Doppler Project

1. Go to https://dashboard.doppler.com
2. Click "Create Project"
3. Name it `fitcsv`
4. Create three configs:
   - `dev_personal` (for your local machine)
   - `dev` (for dev branch deployments)
   - `production` (for main branch)

### Link Local Repository

In your project directory:

```bash
# Navigate to project
cd /path/to/fitcsv

# Setup Doppler
doppler setup

# Select:
# - Project: fitcsv
# - Config: dev_personal
```

This creates a `.doppler.yaml` file (already in .gitignore).

### Add Secrets to Doppler

**Via CLI**:
```bash
# Database (from Supabase)
doppler secrets set DATABASE_URL="postgresql://postgres.xxxxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
doppler secrets set DIRECT_URL="postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres"

# Supabase API (from Supabase)
doppler secrets set NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
doppler secrets set NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGc..."

# Application
doppler secrets set NODE_ENV="development"
doppler secrets set NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Or via Dashboard**:
1. Go to https://dashboard.doppler.com/workplace/projects/fitcsv
2. Select `dev_personal` config
3. Click "+ Add Secret" for each variable

### Verify Secrets

```bash
# List all secrets
doppler secrets

# Test that they load
doppler run -- env | grep DATABASE_URL
```

## Part 3: Initialize Application

### Install Dependencies

```bash
npm install
```

### Generate Prisma Client

```bash
doppler run -- npx prisma generate
```

### Create Database Migration

```bash
doppler run -- npx prisma migrate dev --name init
```

This:
1. Applies schema to Supabase database
2. Creates migration file in `prisma/migrations/`
3. Generates Prisma Client types

### Verify Database

```bash
# Open Prisma Studio
doppler run -- npx prisma studio
```

Opens http://localhost:5555 - you should see all tables (empty).

## Part 4: Enable Row Level Security

Supabase requires RLS policies for security. Run this SQL in Supabase SQL Editor (Dashboard → SQL Editor):

```sql
-- Enable RLS on all tables
ALTER TABLE "Program" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Week" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Workout" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Exercise" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PrescribedSet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkoutCompletion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LoggedSet" ENABLE ROW LEVEL SECURITY;

-- Users can only access their own programs
CREATE POLICY "users_own_programs" ON "Program"
  FOR ALL USING (auth.uid()::text = "userId");

-- Users can only access weeks from their programs
CREATE POLICY "users_own_weeks" ON "Week"
  FOR ALL USING (
    "programId" IN (
      SELECT id FROM "Program" WHERE "userId" = auth.uid()::text
    )
  );

-- Users can only access workouts from their weeks
CREATE POLICY "users_own_workouts" ON "Workout"
  FOR ALL USING (
    "weekId" IN (
      SELECT w.id FROM "Week" w
      JOIN "Program" p ON p.id = w."programId"
      WHERE p."userId" = auth.uid()::text
    )
  );

-- Users can only access exercises from their workouts
CREATE POLICY "users_own_exercises" ON "Exercise"
  FOR ALL USING (
    "workoutId" IN (
      SELECT wo.id FROM "Workout" wo
      JOIN "Week" w ON w.id = wo."weekId"
      JOIN "Program" p ON p.id = w."programId"
      WHERE p."userId" = auth.uid()::text
    )
  );

-- Users can only access prescribed sets from their exercises
CREATE POLICY "users_own_prescribed_sets" ON "PrescribedSet"
  FOR ALL USING (
    "exerciseId" IN (
      SELECT e.id FROM "Exercise" e
      JOIN "Workout" wo ON wo.id = e."workoutId"
      JOIN "Week" w ON w.id = wo."weekId"
      JOIN "Program" p ON p.id = w."programId"
      WHERE p."userId" = auth.uid()::text
    )
  );

-- Users can only access their own workout completions
CREATE POLICY "users_own_completions" ON "WorkoutCompletion"
  FOR ALL USING (auth.uid()::text = "userId");

-- Users can only access logged sets from their completions
CREATE POLICY "users_own_logged_sets" ON "LoggedSet"
  FOR ALL USING (
    "completionId" IN (
      SELECT id FROM "WorkoutCompletion" WHERE "userId" = auth.uid()::text
    )
  );
```

## Part 5: Start Development

```bash
doppler run -- npm run dev
```

Open http://localhost:3000

## Part 6: Vercel Deployment (Optional)

### Connect Repository

1. Go to https://vercel.com/new
2. Import your Git repository
3. Configure project:
   - **Framework**: Next.js
   - **Build command**: `prisma generate && next build`
   - Don't add environment variables yet

### Connect Doppler to Vercel

1. Go to Doppler dashboard → Integrations
2. Find and install "Vercel" integration
3. Authorize Doppler to access Vercel
4. Link configs:
   - `dev` → Vercel Preview
   - `production` → Vercel Production
5. Sync secrets automatically

### Deploy

```bash
git push origin main
```

Vercel auto-deploys. Secrets are injected from Doppler.

## Troubleshooting

### "DATABASE_URL not found"

You forgot to use `doppler run --`:
```bash
# ❌ Wrong
npx prisma migrate dev

# ✅ Correct
doppler run -- npx prisma migrate dev
```

### "Invalid `prisma.program.findMany()` invocation"

Database migration not applied:
```bash
doppler run -- npx prisma migrate dev
```

### "JWTExpired" or Auth Errors

1. Check Supabase credentials are correct in Doppler
2. Verify `NEXT_PUBLIC_SUPABASE_URL` has `https://`
3. Check anon key is complete (very long JWT)

### RLS Policy Errors

Make sure you ran the RLS SQL in Supabase SQL Editor (Part 4 above).

## Next Steps

- Create a user account: http://localhost:3000/signup
- Seed sample program: `doppler run -- npx prisma db seed` (coming soon)
- Import a CSV program
- Start logging workouts!
