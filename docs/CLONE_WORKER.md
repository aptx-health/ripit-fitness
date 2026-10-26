# Clone worker (BullMQ)

Large community programs (9+ weeks, 200+ exercises) took too long to clone inside a request, so cloning runs in a dedicated worker container.

## Flow

1. The API creates a shell program with `copyStatus='cloning'`, enqueues a job on the `program-clone-jobs` queue, and returns immediately.
2. The worker (`cloud-functions/clone-program/`) reads `programData` from `CommunityProgram`. It processes one week per transaction and updates `copyStatus` after each one (`cloning_week_1_of_9`, and so on), then sets `ready` at the end.
3. The frontend polls `/api/programs/[id]/copy-status` every 2 seconds while the program is cloning. A partially cloned program can already be viewed and activated.

## Components

- **Publisher** (`lib/queue/clone-jobs.ts`): a lazy singleton Redis connection from `REDIS_URL`. Jobs get 3 attempts with exponential backoff.
- **Worker:**
  - Runs at concurrency 1.
  - Serves health checks on port 8080 (`/healthz`, `/readyz`).
  - Shuts down gracefully on SIGTERM and SIGINT.
  - Sets `copyStatus: 'failed'` only when the final retry fails.
  - Has its own `package.json`.
- **Build:** `deploy-clone-worker.yml` pushes `ghcr.io/aptx-health/clone-program`. It is deployed with Helm and ArgoCD from the infra repo.
- **Tests:** `__tests__/api/clone-worker.test.ts` (Postgres 15 and Redis 7 via Testcontainers) covers strength cloning, progressive loading and idempotency.
