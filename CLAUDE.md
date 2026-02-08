# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Ripit Fitness** is a strength training tracker focused on flexibility and user control. Users import training programs via CSV and track workout completion without rigid app constraints.

**Key Principle**: No multi-tenancy. Single user per account.

## Tech Stack

- **Next.js 15** (App Router, TypeScript, React 19)
- **Supabase** (PostgreSQL + Auth)
- **Prisma** (ORM)
- **Doppler** (secrets management)
- **Tailwind CSS** (styling)
- **Vercel** (deployment)
- **GCP** (Pub/Sub + Cloud Run for background jobs)

## Development Commands

### Environment Setup

```bash
# ALWAYS use Doppler for environment variables
doppler run -- [command]

# Start all services (recommended)
overmind start                                # Starts Supabase, PubSub emulator, worker, Next.js

# Development server (if running services individually)
doppler run -- npm run dev

# Supabase local development
supabase start                                # Start local Supabase stack
supabase stop                                 # Stop local Supabase stack
supabase status                               # Check status and connection details
supabase status -o env                        # Export connection details as env vars
supabase db pull                              # Pull schema from linked production project

# Database operations
doppler run -- npx prisma studio              # Database GUI
doppler run -- npx prisma generate            # Generate Prisma client
supabase db reset                             # Reset local DB (runs migrations + seeds)

# Testing
doppler run -- npm test
doppler run -- npm run type-check
doppler run -- npm run lint
```

### Database Migration Strategy

We use **Prisma + Supabase CLI** for schema management. See `/docs/DATABASE_MIGRATIONS.md` for complete workflow.

**Quick Reference:**

```bash
# 1. Update prisma/schema.prisma with your changes

# 2. Create new migration file
supabase migration new describe_your_change

# 3. Generate SQL diff
doppler run -- npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel ./prisma/schema.prisma \
  --script > supabase/migrations/[TIMESTAMP]_describe_your_change.sql

# 4. Test locally
supabase db reset

# 5. Commit migration files
git add prisma/schema.prisma supabase/migrations/[TIMESTAMP]_*.sql
git commit -m "feat: describe your change"
```

**CRITICAL - Claude's Role in Migrations:**

When the user asks Claude to make schema changes:

1. ✅ **Claude CAN**:
   - Update `prisma/schema.prisma`
   - Create migration file with `supabase migration new`
   - Generate SQL diff with `npx prisma migrate diff`
   - Test locally with `supabase db reset`
   - Commit migration files to git

2. ❌ **Claude MUST NEVER**:
   - Run `supabase db push` (pushes to production)
   - Apply migrations directly to production
   - Execute SQL in production environment
   - Use `prisma migrate deploy` (production command)

3. 🛑 **When Claude completes a migration**:
   - Always end with: "Migration ready. **You must manually review and push to production** with `supabase db push`."
   - Never proceed to production deployment automatically

**Local Development**:
- Prototyping: Edit schema → `supabase db reset` (no migration files needed for experiments)
- Features: Follow the 5-step workflow above (creates versioned migration files)

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
  /gcp                  # GCP Pub/Sub client

/components             # React components
  /ui                   # Reusable UI components
  /features             # Feature-specific components

/prisma                 # Database schema and migrations
  schema.prisma         # Database schema
  /migrations           # Migration files (version controlled)

/docs                   # Project documentation
  ARCHITECTURE.md       # Architecture decisions and design
  CSV_SPEC.md          # CSV format specification
  /gcp                  # GCP setup guides and architecture docs

/__tests__              # Integration tests
  /api                  # API route tests

/cloud-functions        # GCP Cloud Run workers
  /clone-program        # Background program cloning service

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

### Background Jobs & GCP Integration

**Problem**: Community program cloning with 9+ weeks and 200+ exercises exceeds Vercel's serverless execution limits (90s max).

**Solution**: GCP Pub/Sub + Cloud Run worker architecture for reliable background processing.

#### Architecture

```
Next.js API (Vercel)
  └─> Create shell program (copyStatus='cloning')
  └─> Publish job to Pub/Sub topic
  └─> Return immediately to user

Pub/Sub Topic (program-clone-jobs)
  └─> Delivers message to Cloud Run worker
  └─> Automatic retries on failure

Cloud Run Worker (clone-program service)
  └─> Receives Eventarc POST request
  └─> Fetches programData from CommunityProgram table
  └─> Processes one week per transaction (progressive loading)
  └─> Updates copyStatus per week (cloning_week_1_of_9, etc.)
  └─> Marks program as 'ready' when complete

Frontend (polling via /api/programs/[id]/copy-status)
  └─> Polls every 2 seconds while copyStatus = 'cloning'
  └─> Shows progress indicator with week count
  └─> Updates UI when copyStatus = 'ready'
  └─> Allows viewing/activating partially-cloned programs
```

#### Key Components

**Publisher** (`lib/gcp/pubsub.ts`):
- Next.js publishes jobs to Pub/Sub
- Sends only `communityProgramId` (not full programData) to minimize message size
- Emulator support for local testing

**Worker** (`cloud-functions/clone-program/`):
- Express app receives Eventarc POST requests
- Processes one week per 30s transaction (resilient to failures)
- Idempotency: detects complete/partial clones on retry
- Marks as `failed` if partial weeks detected (corrupted state)

**Deployment** (`.github/workflows/deploy-clone-worker.yml`):
- Triggers on changes to `cloud-functions/clone-program/**` or `prisma/schema.prisma`
- Builds Docker image, pushes to Artifact Registry (us-central1)
- Deploys to Cloud Run with 540s timeout, 1GB memory
- Uses dedicated `clone-worker` service account (zero GCP permissions, only Supabase access)

#### Testing

Integration tests in `__tests__/api/clone-worker.test.ts`:
- **Testcontainers**: PostgreSQL 15 + Pub/Sub emulator (messagebird image)
- Tests strength/cardio cloning, progressive loading, idempotency
- Shared subscription with programId filtering for concurrent execution
- Run with: `doppler run --config dev_test -- npm test`

See `/docs/gcp/` for detailed setup, architecture decisions, and emergency operations.

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
import { logger } from '@/lib/logger'

try {
  // Logic here
} catch (error) {
  logger.error({ error, context: 'route-name' }, 'Route error')
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}
```

### Logging

Use the centralized logging system instead of `console.log/error`:

**Server-side (API routes, server components):**
```typescript
import { logger } from '@/lib/logger'

// Debug logs (set PINO_LOG_LEVEL=debug to see)
logger.debug({ userId, programId }, 'User authenticated')

// Info logs (shown by default)
logger.info({ archivedCompletions: 5 }, 'Program restarted')

// Errors
logger.error({ error, programId }, 'Failed to restart program')
```

**Client-side (components):**
```typescript
import { clientLogger } from '@/lib/client-logger'

// Debug logs (set NEXT_PUBLIC_LOG_LEVEL=debug to see)
clientLogger.debug('[Modal] Opening modal')

// Errors
clientLogger.error('Error:', error)
```

**Configuration:**
- `PINO_LOG_LEVEL` - Server log level (trace|debug|info|warn|error|fatal|silent)
- `NEXT_PUBLIC_LOG_LEVEL` - Client log level (debug|info|silent)

See `/docs/LOGGING.md` for complete documentation.

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

## Testing

### Test Infrastructure

- **Framework**: Vitest
- **Database**: Testcontainers (PostgreSQL 15)
- **Approach**: Integration tests for API routes

### Running Tests

```bash
# Run all tests
doppler run --config dev_test -- npm test

# Run specific test file
doppler run --config dev_test -- npm test exercise-modifications

# Run with UI
doppler run --config dev_test -- npm run test:ui
```

**Note**: Docker must be running for Testcontainers to work.

### Test Structure

```
__tests__/
  api/
    draft.test.ts                    # Draft/logging API tests
    exercise-modifications.test.ts   # Add/swap/delete exercise tests
```

### Writing Tests

Tests use simulation functions that replicate API logic without HTTP requests:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { getTestDatabase } from '@/lib/test/database'
import { createTestUser, createMultiWeekProgram } from '@/lib/test/factories'

describe('API Feature', () => {
  let prisma: PrismaClient
  let userId: string

  beforeEach(async () => {
    const testDb = await getTestDatabase()
    prisma = testDb.getPrismaClient()
    await testDb.reset()

    const user = await createTestUser()
    userId = user.id
  })

  it('should test feature', async () => {
    // Arrange
    const { workouts } = await createMultiWeekProgram(prisma, userId, {
      weekCount: 2
    })

    // Act
    const result = await simulateApiCall(prisma, workouts[0].id, userId, {
      // request data
    })

    // Assert
    expect(result.success).toBe(true)
  })
})
```

### Test Factories

Helper functions in `/lib/test/factories.ts`:

- `createTestUser()` - Creates test user
- `createTestProgram()` - Creates program with weeks/workouts
- `createMultiWeekProgram()` - Creates multi-week program for future-week testing
- `createTestExerciseDefinition()` - Creates exercise definition
- `createTestWorkoutCompletion()` - Creates workout completion
- `createTestPrescribedSets()` - Creates prescribed sets
- `createTestLoggedSets()` - Creates logged sets

### Coverage Philosophy

- Focus on API layer (not UI components)
- Test critical paths and edge cases
- Verify database state, not just API responses
- Test authorization and validation
- Avoid excessive permutations

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
- **GCP Pub/Sub for background jobs**: Move large program cloning off Vercel serverless to Cloud Run (540s timeout, per-week transactions, progressive loading)

## Reference Documents

### Active Documentation
- `/docs/DATABASE_MIGRATIONS.md` - **CRITICAL**: Database migration workflow with Prisma + Supabase CLI
- `/docs/LOGGING.md` - Logging configuration and usage with Pino
- `/docs/STYLING.md` - DOOM theme color system and styling guide
- `/docs/features/CARDIO_DESIGN.md` - Cardio tracking system design
- `/docs/features/EXERCISE_PERFORMANCE_TRACKING.md` - Exercise tracking features
- `/docs/features/PROGRAM_MANAGEMENT_IMPROVEMENTS.md` - Program management enhancements
- `/docs/features/PERFORMANCE_ANALYSIS.md` - Performance analysis and optimizations
- `/docs/gcp/` - GCP Pub/Sub setup, clone worker architecture, and operations guides
- `/WORKTREE_SETUP.md` - Multi-worktree setup with isolated Supabase instances

### Reference Material
- `/NEW_PROJECT_REFERENCE.md` - Next.js + Supabase best practices (reference only, contains multi-tenant patterns we're NOT using)
- `/docs/archive/` - Historical design discussions and planning documents (may be outdated)

## Important Notes

- Use `fd` instead of `find` for file searching
- Always use Doppler for environment variables (`doppler run -- [command]`)
- RLS policies must be created for all user-owned tables
- No emojis in code or commits unless explicitly requested
- Keep solutions simple - avoid over-engineering
- **Git file paths with special characters**: Always wrap file paths containing brackets or other special characters in double quotes when using git commands to prevent shell glob expansion. Example: `git add "app/api/exercises/[exerciseId]/route.ts"` instead of `git add app/api/exercises/[exerciseId]/route.ts`
- **Local development**: Uses Supabase CLI for local PostgreSQL + Auth stack (replaces raw psql). Run `overmind start` to launch all services, or `supabase start` individually. The `dev_personal` Doppler config points to local Supabase (postgres@127.0.0.1:54322)
- **Prisma version**: Stay on v6.x (Supabase recommendation). Use `npx prisma@6.19.0` to avoid installing v7
- **Prisma migrations**: If `migrate dev` fails with "permission denied to terminate process", use `db push` instead (Supabase pooler limitation)
- For local testing, use the doppler config `dev_test`. Example: `doppler run --config dev_test -- npm run test` This will ensure that the proper Testcontainer with the test database is utilized.