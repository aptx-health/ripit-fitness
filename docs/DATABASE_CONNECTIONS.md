# Database Connections

How the app, the clone worker, and Prisma migrations connect to Postgres.

## Two URLs, two purposes

| Env var | Target | Port | Used by | Why |
|---|---|---|---|---|
| `DATABASE_URL` | PgBouncer (sidecar) | `6432` | Next.js app runtime, all `prisma.*` queries from API routes | Pooled, transaction-mode. Many short queries share a small set of upstream Postgres connections. |
| `DIRECT_URL` | Postgres (direct) | `5432` | `prisma migrate deploy`, the clone worker | Bypasses the pooler. Required for DDL (migrations) and for long-lived interactive transactions. |

Both URLs are wired into `prisma/schema.prisma`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

`directUrl` tells Prisma to use `DIRECT_URL` for migrations and introspection only — runtime queries still flow through `DATABASE_URL`.

## PgBouncer transaction-mode rules

PgBouncer in our cluster runs as a sidecar to the Postgres pod (`edoburu/pgbouncer:v1.25.1-p0`, `POOL_MODE=transaction`). Transaction-mode is efficient but breaks anything that depends on session state across queries:

- Named prepared statements (Prisma's default)
- `SET LOCAL` outside a transaction
- `LISTEN` / `NOTIFY`
- Session-scoped advisory locks
- Temporary tables held across statements

**Required**: `DATABASE_URL` must include `?pgbouncer=true`. This is a **Prisma-specific** query parameter — it tells the Prisma client to use unnamed prepared statements. Non-Prisma clients reading the same URL ignore the flag (harmless but meaningless to them).

```
postgresql://user:pass@host:6432/db?pgbouncer=true&connection_limit=5
```

Without the flag, the app intermittently throws `prepared statement "sN" does not exist` under load — failures appear when traffic is high enough that pgbouncer reuses a server connection for a different client request.

## Boot-time guard

`lib/db/assert-pgbouncer.ts` runs once at app startup (called from `lib/db.ts`). In `NODE_ENV=production` it throws if:

- `DATABASE_URL` points at `:6432` and is missing `pgbouncer=true`
- `DIRECT_URL` points at `:6432` (footgun guard — would hang `prisma migrate deploy` on advisory locks against the pooler)

In development/test the assertion logs a warning instead of throwing, so local Postgres without PgBouncer still works.

## Health endpoints (k8s probes)

- **`GET /api/health/live`** — liveness. No DB call. Always 200 unless the process is broken. K8s liveness probe target. A failing liveness probe restarts the pod, so a transient DB blip must not trigger it.
- **`GET /api/health/ready`** — readiness. Runs `SELECT 1` and reports `pgbouncerConfigured` (parsed from `DATABASE_URL`). 503 on DB failure. K8s readiness probe target. A failing readiness probe routes traffic away from the pod but does not restart it.
- **`GET /api/health`** — legacy alias for `/ready`, kept so existing external monitors don't break.

## Clone worker is special

`cloud-functions/clone-program/` is a long-running BullMQ worker that uses a 30-second `prisma.$transaction()` to insert one program week at a time. It's exactly the kind of workload that wants a direct Postgres connection rather than going through transaction-mode pooling, so it reads `DIRECT_URL` instead of `DATABASE_URL`:

```ts
const workerDbUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL
```

The worker is single-replica with `concurrency=1`, so it uses one or two direct Postgres connections — bounded and predictable. Its boot path also asserts in production that the URL does not point at `:6432`.

## Connection-limit math

`connection_limit` (in `DATABASE_URL`) is a **Prisma client** setting — the max number of upstream connections one app pod's Prisma instance opens to PgBouncer. Today: `connection_limit=5`.

`DEFAULT_POOL_SIZE` (PgBouncer config, in the infra repo) is the max number of upstream connections PgBouncer opens to Postgres, per database+user. Today: `25` (post-issue [infra #40]).

Saturation point: `DEFAULT_POOL_SIZE / connection_limit` = 25 / 5 = **5 app pods** before the pool is fully claimed. Past that, additional pods queue at PgBouncer (in transaction mode that's added latency, not failure). To scale further:

- Lower `connection_limit` per pod (e.g. 4 → supports 6 pods), or
- Bump `DEFAULT_POOL_SIZE` in infra

## Doppler config rollout order

When changing any of these URLs in Doppler:

1. **Staging first.** Apply changes, deploy, `curl https://staging.ripit.fit/api/health/ready`, verify `pgbouncerConfigured: true`.
2. **Bake** at least 5 minutes. Watch pod logs for prepared-statement errors or pool timeouts.
3. **Run load test.** Use infra's `~/repos/ripit-infra/load-tests/quick-hey-tests.sh staging` and compare to baseline at `load-tests/results/staging-20260406-baseline.md`.
4. **Then production.** Same checks against `https://ripit.fit/api/health/ready`.
