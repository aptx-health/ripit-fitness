# App Repo Migration Plan

## Overview

This document covers migration work **in this repository** (the app repo). It complements the infrastructure plan in `FITNESS-APP-MIGRATION-PLAN.md` and the future `rippit-infra` repo.

**Two users** will be migrated. The critical constraint is preserving existing Supabase Auth UUIDs so all program/workout data stays linked.

---

## Workstreams

Work is organized into 4 parallel workstreams. Workstreams A, C, and D can begin immediately. Workstream B (auth) can also start early but deploys after Phase 1 infra is validated.

```
Timeline (not to scale):

Infra Repo:  [Phase 0: VPS/k3s/ArgoCD] → [Phase 1: Deploy app] → [Phase 2: Self-host PG] → [Phase 4: Harden]
                                              ↑                        ↑                        ↑
App Repo:    [A: Containerize] ──────────────→┘                        │                        │
             [B: BetterAuth] ──── develop & test locally ─────────────→┘ deploy after PG migrated
             [C: RLS removal] ─────────────────────────────────────────→┘
             [D: Worker migration] ────────────────────────────────────→┘
```

---

## Workstream A: Containerize Next.js

**Can start immediately. Blocks infra Phase 1.**

### A1: Add `output: 'standalone'` to Next.js config

Update `next.config.ts` to enable standalone output mode. This produces a self-contained build that doesn't need `node_modules` at runtime.

```ts
// next.config.ts
const nextConfig = {
  output: 'standalone',
  // ... existing config
}
```

**Verify:** `npm run build` produces `.next/standalone/` directory.

### A2: Create multi-stage Dockerfile

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
RUN npx prisma generate

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

**Target:** < 200MB image size.

### A3: Add health check endpoint

Create `/api/health` that checks:
- App is running (200 OK)
- Database is reachable (Prisma `$queryRaw`)
- Returns `{ status: 'ok', db: 'connected' }` or appropriate error

This endpoint is used by k8s liveness/readiness probes.

### A4: GitHub Actions workflow — build & push to GHCR

New workflow: `.github/workflows/build-app.yml`
- Trigger: push to `main`
- Build Docker image with commit SHA tag
- Push to `ghcr.io/<org>/rippit:sha-<commit>`
- Also tag `latest` for convenience

**Note:** Vercel deployment stays active during migration. Both deploy targets work in parallel until cutover.

### A5: Update `.dockerignore`

Exclude test files, docs, cloud-functions, node_modules, .git, etc.

---

## Workstream B: Auth Migration (Supabase Auth → BetterAuth)

**Can start development immediately. Deploy after self-hosted PG is ready (infra Phase 2).**

This is the highest-risk workstream. Develop and test thoroughly before deploying.

### B1: Install and configure BetterAuth

- Add `better-auth` package
- Configure with PostgreSQL adapter (same database)
- BetterAuth creates its own tables: `user`, `session`, `account`, `verification`
- Configure email/password provider
- Configure OAuth providers (Google, GitHub) for future-proofing — low effort if done during initial setup
- Set up API route handler at `/api/auth/[...all]/route.ts`

**Auth tables live alongside existing app tables in the same database.**

### B2: User migration script (deferred to deploy time)

**Note:** Only 2 users in prod Supabase. Migration script should be written and tested locally, but executed as part of the coordinated production cutover — after B3-B7 are complete and the new code is ready to deploy. Running B2 before the code swap would leave users on Supabase Auth with no way to log in via BetterAuth.

Create a migration script that:
1. Reads existing user data from Supabase Auth (`auth.users` table)
2. Creates BetterAuth user records **preserving the original Supabase UUIDs as user IDs**
3. Both users will need to set new passwords (Supabase uses bcrypt, BetterAuth may use different hashing — verify compatibility)

**This is the critical step.** If user IDs are preserved, zero changes needed in any `userId` column across all 16 tables.

**Confirmed:** BetterAuth supports custom IDs via `advanced.database.generateId: "uuid"` and direct DB inserts with explicit UUIDs. BetterAuth also has an [official Supabase migration guide](https://www.better-auth.com/docs/guides/supabase-migration-guide). Supabase bcrypt password hashes can be preserved by configuring BetterAuth to use bcrypt instead of its default scrypt — **no password resets needed**.

### B3: Swap `lib/auth/server.ts`

The `getCurrentUser()` function is the **single abstraction point** for auth across all 154 API routes. Update it to use BetterAuth's session API instead of Supabase's `auth.getUser()`.

```typescript
// Before
import { createClient } from '@/lib/supabase/server'
export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

// After
import { auth } from '@/lib/auth' // BetterAuth instance
export async function getCurrentUser() {
  const session = await auth.api.getSession(/* headers/cookies */)
  if (!session) return { user: null, error: 'Unauthorized' }
  return { user: { id: session.user.id, email: session.user.email }, error: null }
}
```

**Because all 154 routes use this single function, the swap is contained.** No route-by-route changes needed.

### B4: Update middleware

Replace Supabase session refresh with BetterAuth session validation in `middleware.ts` and `lib/supabase/middleware.ts`.

### B5: Rewrite auth pages

- **Login** (`app/(auth)/login/page.tsx`): Replace `supabase.auth.signInWithPassword()` with BetterAuth sign-in
- **Signup** (`app/(auth)/signup/page.tsx`): Replace `supabase.auth.signUp()` with BetterAuth sign-up
- **Signout** (`app/api/auth/signout/route.ts`): Replace `supabase.auth.signOut()` with BetterAuth sign-out
- **OAuth callback** (`app/auth/callback/route.ts`): Update or remove depending on OAuth setup

### B6: Update mock auth mode

The existing `USE_MOCK_AUTH` pattern in `lib/auth/server.ts` and `lib/supabase/middleware.ts` should be preserved for local development. Update it to bypass BetterAuth instead of Supabase.

### B7: Remove Supabase dependencies

- Remove `@supabase/ssr` and `@supabase/supabase-js` from `package.json`
- Delete `lib/supabase/server.ts`, `lib/supabase/client.ts`, `lib/supabase/middleware.ts`
- Remove `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars
- Clean up any remaining Supabase imports

### B8: Update integration tests

Update test helpers and factories that reference Supabase auth. Tests use Testcontainers with direct Prisma access, so auth changes are mostly about the `createTestUser()` factory.

---

## Workstream C: Database Cleanup (RLS Removal + Schema Changes)

**Deploy after self-hosted PG is ready (infra Phase 2). Can prepare migration files earlier.**

### C1: ~~Remove RLS policies~~ — DONE (unnecessary)

RLS was enabled via the Supabase dashboard, not in tracked migration files. The only migration referencing RLS (`20240107000000_optimize_rls_policies.sql`) created policies using `auth.uid()` — a Supabase-specific function that won't exist on self-hosted PG. That migration file has been deleted. No further action needed: RLS simply won't be enabled on the self-hosted database.

### C2: ~~Clean Prisma schema for self-hosted PG~~ — DONE

Removed `directUrl` from both Prisma schemas (app + clone worker), cleaned up `DIRECT_URL` references from test harness, `.env.example`, and worktree Doppler script. No `uuid-ossp` dependency — all IDs use `cuid()`.

### C3: Create clean migration baseline

After removing RLS and Supabase-specific elements, create a baseline migration that represents the clean schema. This becomes the starting point for the self-hosted database.

---

## Workstream D: Worker Migration (GCP → k8s + Redis)

**Deploy after Redis is available in the cluster. Can prepare code earlier.**

### D1: Redirect worker CI/CD to GHCR

Update `.github/workflows/deploy-clone-worker.yml`:
- Keep the Docker build step
- Push to `ghcr.io/<org>/rippit-clone-worker:sha-<commit>` instead of GCP Artifact Registry
- Remove GCP Cloud Run deployment steps
- Remove GCP service account authentication

The worker image will be pulled by k8s instead of deployed to Cloud Run.

### D2: Replace Pub/Sub with Redis queue

**Option: BullMQ** (most popular Node.js Redis queue, used with the Redis already deployed for sessions)

Changes in the worker (`cloud-functions/clone-program/`):
- Replace `@google-cloud/pubsub` with `bullmq`
- Replace Eventarc HTTP handler with BullMQ worker pattern
- Keep existing cloning logic (`cloning.ts`, `batch-insert.ts`) unchanged

Changes in the app (`lib/gcp/pubsub.ts`):
- Replace Pub/Sub publish with BullMQ queue add
- Rename/move to `lib/queue/clone-jobs.ts`

### D3: Update local development

- Remove Pub/Sub emulator from `Procfile` and `scripts/start-pubsub-emulator.sh`
- Add Redis to local dev (Docker container or use existing Supabase Redis if available)
- Update Overmind/Procfile to start worker with Redis connection
- Update test helpers (`lib/test/pubsub.ts`) to use BullMQ test utilities

### D4: Update clone worker tests

Update `__tests__/api/clone-worker.test.ts` to use Redis (via Testcontainers redis image) instead of Pub/Sub emulator.

---

## Testing Strategy

### This Repo (App Tests)

| Type | Location | What | Runs When |
|------|----------|------|-----------|
| Unit/Integration | `__tests__/api/` | API route logic, Prisma queries, auth flows | PR to dev/main (GH Actions) |
| Clone worker | `__tests__/api/clone-worker.test.ts` | Worker job processing, idempotency | PR to dev/main |
| Type checking | `npm run type-check` | TypeScript compilation | PR to dev/main |
| Local dev | Manual | Full app with mock auth or BetterAuth | During development |

**No changes to test infrastructure needed** except:
- Update `createTestUser()` factory for BetterAuth (B8)
- Update Pub/Sub test helpers for Redis/BullMQ (D4)

### Infra Repo (Deploy Tests)

| Type | Location | What | Runs When |
|------|----------|------|-----------|
| Helm validation | CI | `helm template` + `helm lint` | PR to infra repo |
| Smoke tests | Post-deploy job or GH Actions | Health check, auth flow, critical path (create/complete workout) | After ArgoCD sync |
| Cert checks | Monitoring/CronJob | TLS cert validity, expiry warning | Scheduled |
| Backup verification | CronJob | pg_dump completes, restore test | Scheduled |

Smoke tests run against the live deployment and verify end-to-end functionality. They should be lightweight (< 30 seconds) and test:
1. `GET /api/health` → 200
2. Auth: login → get session → access protected route
3. Critical path: fetch programs, fetch workouts (read-only to avoid test data pollution)

---

## Environment Variable Changes

### Remove (after migration complete)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY
GCP_PROJECT_ID
GCP_CREDENTIALS (service account key)
PUBSUB_EMULATOR_HOST
CLONE_WORKER_DATABASE_URL (separate from app DATABASE_URL)
```

### Add
```
BETTER_AUTH_SECRET          # Session signing secret
BETTER_AUTH_URL             # App URL for auth callbacks
REDIS_URL                  # Redis connection for sessions + job queue
```

### Keep (update values for self-hosted PG)
```
DATABASE_URL                # Points to in-cluster PostgreSQL
PINO_LOG_LEVEL
NEXT_PUBLIC_LOG_LEVEL
NEXT_PUBLIC_APP_URL
NODE_ENV
```

### Doppler Config
- Create new Doppler environment (e.g., `k8s_prod`) with the new values
- ESO syncs from Doppler → k8s Secrets
- Keep existing Doppler configs (`dev`, `dev_personal`, `dev_test`) for local dev

---

## Sequencing & Dependencies

```
WEEK 1-2 (parallel start):
  App Repo                          Infra Repo
  ─────────                         ──────────
  A1: standalone output mode        Phase 0: Provision VPS
  A2: Dockerfile                    Phase 0: Install k3s
  A3: Health endpoint               Phase 0: cert-manager
  A5: .dockerignore                 Phase 0: ArgoCD
  B1: Install BetterAuth            Phase 0: ESO + Doppler
  B2: User migration script

WEEK 2-3:
  A4: GHCR build workflow           Phase 1: Helm chart for app
  B3: Swap getCurrentUser()         Phase 1: Deploy to k3s (still using Supabase)
  B4: Update middleware             Phase 1: Validate app works
  B5: Rewrite auth pages
  B6: Update mock auth

WEEK 3-4:
  D1: Worker CI → GHCR             Phase 2: Deploy PostgreSQL
  D2: Replace Pub/Sub → BullMQ     Phase 2: Data migration from Supabase
  C1: Prepare RLS removal SQL      Phase 2: Deploy Redis

WEEK 4-5:
  B7: Remove Supabase deps         Deploy BetterAuth changes
  B8: Update tests                  Deploy RLS removal
  C2: Clean Prisma schema          Deploy worker to k3s
  C3: Baseline migration
  D3: Update local dev
  D4: Update worker tests

WEEK 5+:
                                    Phase 4: Monitoring, backups, NetworkPolicies
                                    Decommission: Vercel, Supabase, GCP
```

---

## Risk Checklist

| Risk | Mitigation |
|------|-----------|
| ~~BetterAuth doesn't support custom user IDs~~ | **RESOLVED:** `generateId: "uuid"` + direct DB INSERT supported. Official Supabase migration guide exists. |
| ~~Password hash incompatibility (Supabase bcrypt → BetterAuth)~~ | **RESOLVED:** Configure BetterAuth to use bcrypt. Existing hashes migrate directly, no password resets. |
| RLS removal exposes data | Every Prisma query already has `WHERE userId`. Integration tests validate this. Single-user-per-account model limits blast radius |
| Worker migration breaks cloning | Keep GCP worker running in parallel until k8s worker is validated |
| Standalone mode breaks Next.js features | Test thoroughly locally before deploying. Known issue: static files need explicit COPY in Dockerfile |
| Vercel-specific features relied upon | Audit for ISR, Edge functions, image optimization. Replace with self-hosted equivalents if needed |

---

## Decisions Made

- **Domain:** `strong.bookfriends.site` (current Vercel domain, will point to k8s after cutover)
- **Redis topology:** Single Redis instance for both BetterAuth sessions and BullMQ job queue. Appropriate for current scale.
- **Image optimization:** Only 3 components use `next/image`. Next.js standalone mode bundles `sharp` automatically — no custom loader needed.
- **Vercel decommission:** No parallel running. Vercel will be shut down once k8s deployment is validated and stable. DNS cutover is the switch.

## Open Questions

1. ~~**BetterAuth custom ID support**~~ — **RESOLVED.** Full support confirmed. See B2 section.
2. **BETTER_AUTH_URL:** `https://strong.bookfriends.site` — confirm this is correct for auth callbacks.
