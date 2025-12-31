# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**FitCSV** is a strength training tracker focused on flexibility and user control. Users import training programs via CSV and track workout completion without rigid app constraints.

**Key Principle**: No multi-tenancy. Single user per account.

## Tech Stack

- **Next.js 15** (App Router, TypeScript, React 19)
- **Supabase** (PostgreSQL + Auth)
- **Prisma** (ORM)
- **Doppler** (secrets management)
- **Tailwind CSS** (styling)
- **Vercel** (deployment)

## Development Commands

### Environment Setup

```bash
# ALWAYS use Doppler for environment variables
doppler run -- [command]

# Development server
doppler run -- npm run dev

# Database operations
doppler run -- npx prisma studio              # Database GUI
doppler run -- npx prisma migrate dev         # Create migration (for features)
doppler run -- npx prisma db push             # Prototype only (no migration files)
doppler run -- npx prisma generate            # Generate Prisma client
doppler run -- npx prisma migrate deploy      # Apply migrations (production)

# Testing
doppler run -- npm test
doppler run -- npm run type-check
doppler run -- npm run lint
```

### Database Migration Strategy

- **Prototyping**: `npx prisma db push` (experimenting, no migration files)
- **Features**: `npx prisma migrate dev --name feature_name` (creates migration files)
- **Production**: ONLY deploy via migration files, never `db push`
- **Always commit migration files** with schema changes

## Project Structure

```
/app                    # Next.js App Router
  /api                  # API route handlers
  /(auth)               # Auth pages (login, signup)
  /(app)                # Main app pages (dashboard, programs, workouts)
    /programs           # Program management
    /workouts           # Workout logging

/lib                    # Business logic (max 200 lines per file)
  /db                   # Database client and utilities
  /csv                  # CSV parsing and validation
  /auth                 # Auth utilities (if needed)

/components             # React components
  /ui                   # Reusable UI components
  /features             # Feature-specific components

/prisma                 # Database schema and migrations
  schema.prisma         # Database schema
  /migrations           # Migration files (version controlled)

/docs                   # Project documentation
  ARCHITECTURE.md       # Architecture decisions and design
  CSV_SPEC.md          # CSV format specification

/types                  # Shared TypeScript types
/hooks                  # React hooks
```

## Core Architecture

### Data Hierarchy

```
Program
└── Week (1, 2, 3...)
    └── Workout (Day 1, Day 2...)
        └── Exercise (Bench Press, Squat...)
            └── PrescribedSet (template: "3x5 @ 135lbs")
            └── LoggedSet (actual: "3x5 @ 135lbs, RPE 8")
```

### Key Database Tables

- **Program**: User's training programs (only one active strength program)
- **Week**: Weeks within a program
- **Workout**: Individual training sessions
- **Exercise**: Exercises within a workout
- **PrescribedSet**: Template/plan (what program prescribes)
- **LoggedSet**: Actual performance (what user logged)
- **WorkoutCompletion**: Tracks completed/incomplete/abandoned workouts

**Important**: We store BOTH prescribed and logged sets to enable plan vs reality comparison.

### Authentication & Security

- **Supabase Auth** (email/password)
- **Row Level Security (RLS)** enforces data isolation at database level
- No multi-tenancy - simple user-to-data relationship
- RLS policies ensure users can only access their own programs/workouts

Example RLS policy:
```sql
CREATE POLICY "users_own_programs" ON programs
  FOR ALL USING (auth.uid() = user_id);
```

## CSV Import Strategy

### Format

Standard CSV with intelligent column detection:

```csv
week,day,workout_name,exercise,set,reps,weight,rir,notes
1,1,Upper Power,Bench Press,1,5,135lbs,2,
1,1,Upper Power,Bench Press,2,5,135lbs,2,
```

**Required columns**: `week`, `day`, `workout_name`, `exercise`, `set`, `reps`, `weight`

**Optional columns** (auto-detected): `rir`, `rpe`, `notes`

**Metadata inference**:
- Program name: from filename (`my-program.csv` → "My Program")
- Optional columns: detected from headers

See `docs/CSV_SPEC.md` for complete specification.

### Import Process

1. Parse CSV and detect columns
2. Validate required fields and structure
3. Flatten into database: Program → Weeks → Workouts → Exercises → PrescribedSets
4. Enable for user selection

## Next.js 15 Specific Patterns

### Dynamic Route Params (IMPORTANT)

Params are now Promise-based in Next.js 15:

```typescript
// ✅ Correct
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
}

// ❌ Wrong (Next.js 14 style)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id; // Won't work in Next.js 15
}
```

### API Route Pattern

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch data (RLS will enforce user isolation)
    const programs = await prisma.program.findMany({
      where: { userId: user.id },
      include: { weeks: true }
    });

    return NextResponse.json({ data: programs });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

## Common Patterns

### File Size Limit

**Max 200 lines per file**. If exceeded, split into multiple files following Single Responsibility Principle.

### Import Organization

```typescript
// 1. External dependencies
import { NextRequest, NextResponse } from 'next/server';

// 2. Types
import type { Program, Week } from '@prisma/client';

// 3. Internal utilities
import { prisma } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

// 4. Components
import { Button } from '@/components/ui/button';
```

### Error Handling

All API routes must include comprehensive error handling:

```typescript
try {
  // Logic here
} catch (error) {
  console.error('Route error:', error);
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
```

### Avoid N+1 Queries

```typescript
// ❌ Bad - N+1 query
const weeks = await prisma.week.findMany();
for (const week of weeks) {
  const workouts = await prisma.workout.findMany({ where: { weekId: week.id } });
}

// ✅ Good - Single query
const weeks = await prisma.week.findMany({
  include: { workouts: true }
});
```

## Development Workflow

### Git Workflow
```
main (production)         ← Protected, auto-deploy to Vercel
└── dev                  ← Development branch
    └── feature/[name]   ← Feature branches
```

### Prisma Development Flow

```bash
# 1. Update schema.prisma
# 2. Create migration
doppler run -- npx prisma migrate dev --name add_feature

# 3. Generate Prisma Client
doppler run -- npx prisma generate

# 4. Test changes
doppler run -- npm run dev

# 5. Commit schema + migration files
git add prisma/
git commit -m "feat: add feature"
```

## Current Development Phase

**Phase 1: POC (In Progress)**
- [ ] Next.js + Supabase + Doppler setup
- [ ] Supabase Auth (email/password)
- [ ] Prisma schema + migrations + RLS policies
- [ ] Seed one hardcoded program
- [ ] Basic UI: Program → Week → Workout → Exercise
- [ ] Log sets (reps + weight)
- [ ] Mark workout complete
- [ ] Deploy to Vercel

**Future Phases**:
- Phase 2: CSV Import
- Phase 3: Polish (UI/UX improvements, week navigation)
- Phase 4: Advanced features (cardio, export, templates)

## Key Decisions

- **No multi-tenancy**: One user per account (simpler auth, faster queries)
- **Supabase Auth + RLS**: Security enforced at database level
- **Flatten CSV to DB**: Better querying, no runtime parsing
- **Infer metadata**: Standard CSV format, user-friendly
- **Store prescribed + logged**: Enables plan vs actual comparison
- **Flexible weight field**: Supports "135lbs", "65%", "RPE 8"

## Reference Documents

- `/docs/ARCHITECTURE.md` - Complete architecture and design decisions
- `/docs/CSV_SPEC.md` - CSV format specification and examples
- `/NEW_PROJECT_REFERENCE.md` - Next.js + Supabase best practices (reference only, contains multi-tenant patterns we're NOT using)

## Important Notes

- Use `fd` instead of `find` for file searching
- Always use Doppler for environment variables (`doppler run -- [command]`)
- RLS policies must be created for all user-owned tables
- No emojis in code or commits unless explicitly requested
- Keep solutions simple - avoid over-engineering
- **Prisma version**: Stay on v6.x (Supabase recommendation). Use `npx prisma@6.19.0` to avoid installing v7
- **Prisma migrations**: If `migrate dev` fails with "permission denied to terminate process", use `db push` instead (Supabase pooler limitation)
- For local testing, use the doppler config `dev_test`. Example: `doppler run --config dev_test -- npm run test` This will ensure that the proper Testcontainer with the test database is utilized.