# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Ripit Fitness** is a strength training tracker focused on flexibility and user control. Users import training programs via CSV and track workout completion without rigid app constraints.

**Key Principle**: No multi-tenancy. Single user per account.

## Tech Stack

- **Next.js 15** (App Router, TypeScript, React 19)
- **PostgreSQL 15** (self-hosted, local Docker container for dev)
- **Prisma** (ORM)
- **Doppler** (secrets management)
- **Tailwind CSS** (styling)
- **Self-hosted k8s** (deployment via ArgoCD, GHCR images)
- **BullMQ + Redis** (background job queue for clone worker)

## Development Commands

### Environment Setup

```bash
# ALWAYS use Doppler for environment variables
doppler run -- [command]

# Start all services (recommended)
overmind start                                # Starts PostgreSQL, Redis, worker, Next.js

# Development server (if running services individually)
doppler run -- npm run dev

# Database operations
doppler run -- npx prisma studio              # Database GUI
doppler run -- npx prisma generate            # Generate Prisma client
doppler run -- npx prisma db push             # Apply schema to local DB (no migration files)

# Testing
doppler run -- npm test
doppler run -- npm run type-check
doppler run -- npm run lint
```

### Database Migration Strategy

We use **Prisma** for schema management. `prisma db push` applies schema changes locally; production migrations are handled via the infra repo.

**Quick Reference:**

```bash
# 1. Update prisma/schema.prisma with your changes

# 2. Apply to local DB
doppler run -- npx prisma db push

# 3. Generate Prisma Client (if needed)
doppler run -- npx prisma generate

# 4. Commit schema changes
git add prisma/schema.prisma
git commit -m "feat: describe your change"
```

**CRITICAL - Claude's Role in Migrations:**

When the user asks Claude to make schema changes:

1. ✅ **Claude CAN**:
   - Update `prisma/schema.prisma`
   - Apply locally with `prisma db push`
   - Commit schema changes to git

2. ❌ **Claude MUST NEVER**:
   - Apply migrations directly to production
   - Execute SQL in production environment
   - Use `prisma migrate deploy` (production command)

3. 🛑 **When Claude completes a migration**:
   - Always end with: "Schema updated locally. **Production migration is handled via the infra repo.**"
   - Never proceed to production deployment automatically

**Local Development**:
- Edit schema → `doppler run -- npx prisma db push` (applies directly, no migration files)

## Project Structure

```
/app                    # Next.js App Router
  /api                  # API route handlers
  /(auth)               # Auth pages (login, signup)
  /(app)                # Main app pages (dashboard, programs, workouts)
    /programs           # Program management
    /workouts           # Workout logging

/lib                    # Business logic (max 500 lines per file)
  /db                   # Database client and utilities
  /csv                  # CSV parsing and validation
  /auth                 # Auth utilities (if needed)
  /queue                # BullMQ job queue (clone jobs)

/components             # React components
  /ui                   # Reusable UI components
  /features             # Feature-specific components

/prisma                 # Database schema and migrations
  schema.prisma         # Database schema
  /migrations           # Migration files (version controlled)

/docs                   # Project documentation
  ARCHITECTURE.md       # Architecture decisions and design
  CSV_SPEC.md          # CSV format specification
  /archive/gcp          # Archived GCP documentation

/__tests__              # Integration tests
  /api                  # API route tests

/cloud-functions        # Background workers
  /clone-program        # BullMQ-based program cloning worker

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

- **BetterAuth** (email/password, self-hosted)
- No multi-tenancy - simple user-to-data relationship
- Auth enforced at the API layer (middleware + route handlers)

### Background Jobs (BullMQ + Redis)

**Problem**: Community program cloning with 9+ weeks and 200+ exercises exceeds Vercel's serverless execution limits (90s max).

**Solution**: BullMQ queue backed by Redis, processed by a dedicated worker container.

#### Architecture

```
Next.js API (Vercel)
  └─> Create shell program (copyStatus='cloning')
  └─> Enqueue job to BullMQ queue via Redis
  └─> Return immediately to user

BullMQ Worker (clone-program container)
  └─> Polls Redis queue for jobs
  └─> Fetches programData from CommunityProgram table
  └─> Processes one week per transaction (progressive loading)
  └─> Updates copyStatus per week (cloning_week_1_of_9, etc.)
  └─> Marks program as 'ready' when complete
  └─> Automatic retries (3 attempts, exponential backoff)

Frontend (polling via /api/programs/[id]/copy-status)
  └─> Polls every 2 seconds while copyStatus = 'cloning'
  └─> Shows progress indicator with week count
  └─> Updates UI when copyStatus = 'ready'
  └─> Allows viewing/activating partially-cloned programs
```

#### Key Components

**Publisher** (`lib/queue/clone-jobs.ts`):
- Enqueues clone jobs to BullMQ `program-clone-jobs` queue
- Lazy singleton Redis connection from `REDIS_URL`
- Job options: 3 attempts, exponential backoff

**Worker** (`cloud-functions/clone-program/`):
- BullMQ Worker with concurrency 1
- Health server on port 8080 (`/healthz` liveness, `/readyz` readiness)
- Graceful shutdown on SIGTERM/SIGINT
- Marks `copyStatus: 'failed'` only on final retry failure

**Deployment** (`.github/workflows/deploy-clone-worker.yml`):
- Triggers on changes to `cloud-functions/clone-program/**` or `prisma/schema.prisma`
- Builds Docker image, pushes to GHCR (`ghcr.io/aptx-health/clone-program`)
- Deployed to k8s via Helm chart + ArgoCD (managed in infra repo)

#### Testing

Integration tests in `__tests__/api/clone-worker.test.ts`:
- **Testcontainers**: PostgreSQL 15 + Redis 7
- Tests strength/cardio cloning, progressive loading, idempotency
- Uses BullMQ Queue/Worker/QueueEvents for job processing
- Run with: `doppler run --config dev_test -- npm test clone-worker`

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
import { getCurrentUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const { user, error } = await getCurrentUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch data scoped to user
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

**Max 500 lines per file**. Enforced by Husky + lint-staged pre-commit hook. If exceeded, split into multiple files following Single Responsibility Principle.

### Import Organization

```typescript
// 1. External dependencies
import { NextRequest, NextResponse } from 'next/server';

// 2. Types
import type { Program, Week } from '@prisma/client';

// 3. Internal utilities
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/server';

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
main (production)         ← Protected, builds + deploys to production
└── dev                  ← Development branch, builds + deploys to staging
    └── feature/[name]   ← Feature branches (PR to dev triggers tests)
```

### CI/CD & Deployments

**GitHub Actions Workflows:**
- `test.yml` — Runs typecheck + tests on PRs to `dev` and `main`
- `build-app.yml` — Builds app Docker image on merge to `dev` or `main`
- `deploy-clone-worker.yml` — Builds clone worker image on merge to `dev` or `main` (path-filtered)

**Staging** (merge to `dev`):
- Images tagged as `:staging` (overwritten each merge)
- `ghcr.io/aptx-health/ripit-fitness:staging`
- `ghcr.io/aptx-health/clone-program:staging`
- Helm values use `imagePullPolicy: Always` — pods pick up new images on rollout
- URL: `https://staging.ripit.fit`

**Production** (merge to `main`):
- Images tagged as `:sha-<commit-sha>` (pinned, never overwritten)
- `ghcr.io/aptx-health/ripit-fitness:sha-<sha>`
- `ghcr.io/aptx-health/clone-program:<sha>`
- SHA manually updated in infra repo helm values
- URL: `https://ripit.fit`

**GitHub Environments:**
- `staging` — branch-restricted to `dev`, holds staging-specific vars (`NEXT_PUBLIC_APP_URL`)
- `production` — holds production-specific vars
- Environment vars override repo-level secrets with the same name

**Infrastructure:** ArgoCD (GitOps, auto-sync) manages k8s deployments. Secrets flow via Doppler → External Secrets Operator.

### Prisma Development Flow

```bash
# 1. Update schema.prisma
# 2. Apply to local DB
doppler run -- npx prisma db push

# 3. Generate Prisma Client (if needed)
doppler run -- npx prisma generate

# 4. Test changes
doppler run -- npm run dev

# 5. Commit schema changes
git add prisma/schema.prisma
git commit -m "feat: describe your change"
```

## Current Development Phase

Self-hosted k8s infrastructure is operational (staging + production). PostgreSQL with PgBouncer, Redis, and ArgoCD GitOps deployments are live. CI builds images on merge to `dev` (staging) and `main` (production).

## Key Decisions

- **No multi-tenancy**: One user per account (simpler auth, faster queries)
- **BetterAuth**: Self-hosted auth, no external auth dependencies
- **Flatten CSV to DB**: Better querying, no runtime parsing
- **Infer metadata**: Standard CSV format, user-friendly
- **Store prescribed + logged**: Enables plan vs actual comparison
- **Flexible weight field**: Supports "135lbs", "65%", "RPE 8"
- **BullMQ + Redis for background jobs**: Move large program cloning off Vercel serverless to a dedicated worker container (per-week transactions, progressive loading, automatic retries)

## Reference Documents

### Active Documentation
- `/docs/DATABASE_MIGRATIONS.md` - Database migration workflow with Prisma
- `/docs/LOGGING.md` - Logging configuration and usage with Pino
- `/docs/STYLING.md` - DOOM theme color system and styling guide
- `/docs/features/CARDIO_DESIGN.md` - Cardio tracking system design
- `/docs/features/EXERCISE_PERFORMANCE_TRACKING.md` - Exercise tracking features
- `/docs/features/PROGRAM_MANAGEMENT_IMPROVEMENTS.md` - Program management enhancements
- `/docs/features/PERFORMANCE_ANALYSIS.md` - Performance analysis and optimizations
- `/docs/archive/gcp/` - Archived GCP Pub/Sub documentation (historical reference)
- `/WORKTREE_SETUP.md` - Multi-worktree setup

### Reference Material
- `/NEW_PROJECT_REFERENCE.md` - Next.js best practices (reference only, may be outdated)
- `/docs/archive/` - Historical design discussions and planning documents (may be outdated)

## Important Notes

- Use `fd` instead of `find` for file searching
- Always use Doppler for environment variables (`doppler run -- [command]`)
- No emojis in code or commits unless explicitly requested
- Keep solutions simple - avoid over-engineering
- **Git file paths with special characters**: Always wrap file paths containing brackets or other special characters in double quotes when using git commands to prevent shell glob expansion. Example: `git add "app/api/exercises/[exerciseId]/route.ts"` instead of `git add app/api/exercises/[exerciseId]/route.ts`
- **Local development**: Run `overmind start` to launch PostgreSQL (Docker, port 5433), Redis, worker, and Next.js. The `dev_personal` Doppler config points to local PostgreSQL (`postgres@localhost:5433/ripit`)
- **Prisma version**: Stay on v6.x. Use `npx prisma@6.19.0` to avoid installing v7
-
For local testing, use the doppler config `dev_test`. Example: `doppler run --config dev_test -- npm run test` This will ensure that the proper Testcontainer with the test database is utilized.

## GitHub Discussions

Use GH Discussions (not Issues) for architectural decisions and design questions. The `gh` CLI has no native discussion support, so use the GraphQL API:

```bash
# Create a discussion (category "Ideas" for architecture decisions)
gh api graphql -f query='
mutation {
  createDiscussion(input: {
    repositoryId: "R_kgDOQjYwOQ",
    categoryId: "DIC_kwDOQjYwOc4C3fsH",
    title: "Your title",
    body: "Your markdown body"
  }) {
    discussion { url }
  }
}'
```

**Category IDs:**
- `DIC_kwDOQjYwOc4C3fsE` — Announcements
- `DIC_kwDOQjYwOc4C3fsF` — General
- `DIC_kwDOQjYwOc4C3fsH` — Ideas (use for architecture decisions)
- `DIC_kwDOQjYwOc4C3fsG` — Q&A

## Agent Messaging

You are connected to a shared message bus for coordinating with other AI agents.

Need to prefix agent message commands like publish with the identity like an env var.

**First thing you must do when starting a session:**
1. Run `agent-whoami` to claim your identity. Remember the name it gives you.
2. Run `agent-topics` to see recently active projects and channels.
3. Run `agent-check` to read any unread messages.

**Publishing messages:**
When you make changes that affect other repos (schema changes, API changes, dependency updates, breaking changes), notify other agents:
```
AGENT_NAME=<your-identity> agent-pub <project/channel> "<message>"
```

**Checking messages:**
- `agent-check` - all unread messages
- `agent-check myproject` - unread under myproject/*
- `agent-check myproject/backend` - exact topic

**Acknowledging messages:**
- `agent-ack <id>` or `agent-ack all [topic-prefix]`
