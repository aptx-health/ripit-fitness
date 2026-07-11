# Post-deploy staging smoke test — aggregates recompute pipeline

Tracks issue #940. Follow-up to #919 / PR #939.

## Why

PR #939 added an in-process Testcontainers regression test that proves the
aggregates BullMQ publisher re-enqueues correctly after a job completes (the
`removeOnComplete` retention bug). That guards queue *semantics* on every PR.

It does **not** exercise the deployed topology. These failures are invisible to
unit/integration tests and only surface against a running stack:

- queue-name drift between publisher (`lib/queue/aggregates-jobs.ts`) and worker
  (`cloud-functions/clone-program`)
- the second `Worker` silently never registering / not consuming
  `user-training-aggregates`
- wrong Redis **db number** in the worker pod vs. the app (prod/staging use
  separate Redis instances)
- `DIRECT_URL` / env wiring differences in the worker pod

## What it does

`scripts/smoke-test-aggregates.sh` drives a real end-to-end path against a
deployed stack:

```
app (completion route) -> publisher -> Redis -> BullMQ worker
  -> recomputeUserAggregates -> UserTrainingAggregates row
```

1. Signs in as a dedicated smoke-test user.
2. Reads the baseline `computedAt` via `GET /api/debug/aggregates-status`.
3. Seeds + completes a freestyle (ad-hoc) workout via the API.
4. Polls the status endpoint until `computedAt` advances past the baseline,
   with a bounded timeout.
5. On timeout, prints diagnostics that distinguish "worker not consuming" vs
   "compute error" vs "wiring/timeout".

## The read surface

`GET /api/debug/aggregates-status` returns only the authenticated caller's own
recompute metadata (`computedAt`, `dataMaturity`, `qualifyingSessionsTotal`,
`sessionsLast7d`, `lastSessionAt`) — no training-data blobs — so it is safe to
leave enabled in every environment.

## CI wiring

`.github/workflows/smoke-test-staging.yml` runs after "Build and Push App Image"
completes on `dev`, waits for staging readiness (ArgoCD rollout is async
relative to the image push), then runs the script. Also runnable on demand via
`workflow_dispatch`.

Configure these in the GitHub **`staging`** environment:

| Name | Kind | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | var | Staging base URL (defaults to `https://staging.ripit.fit`) |
| `SMOKE_USER_EMAIL` | secret | Dedicated staging smoke-test account |
| `SMOKE_USER_PASSWORD` | secret | Password for that account |
| `DISCORD_WEBHOOK_URL` | secret | Optional — failure alert |

The smoke user must be a real, seeded staging account (email/password login).
It only ever reads/writes its own data, so a throwaway account is fine.

## Running locally against staging

```bash
BASE_URL=https://staging.ripit.fit \
SMOKE_USER_EMAIL=... SMOKE_USER_PASSWORD=... \
scripts/smoke-test-aggregates.sh
```

Exit codes: `0` pass, `1` setup/auth/seed failure (pipeline not reached), `2`
timeout waiting for the worker to refresh the row.

## Future work

The clone-program pipeline has the same blind spot. The script + workflow are a
reasonable template to generalize into a shared "post-deploy smoke" harness.
