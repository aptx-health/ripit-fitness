# Rate Limiting

Rate limiting is enforced at the API-route layer using [`rate-limiter-flexible`](https://github.com/animir/node-rate-limiter-flexible) backed by Redis (with in-memory fallback). Limits are **tiered by blast radius**, not applied uniformly — a hot-path workout logging endpoint has a very different budget than a community-program clone that enqueues a multi-week background job.

## Tiers

| Tier | Limiter | Budget | Key | Purpose |
|---|---|---|---|---|
| T0 — queue protection | `communityCloneLimiter` | 3 / 60s | userId | Protects the BullMQ clone worker from being flooded with multi-week jobs |
| T1 — program mgmt | `programManagementLimiter` | 20 / 60s | userId | Program CRUD (create, duplicate, activate, restart) — the expensive ones enqueue or transact across many rows |
| T2 — destructive ops | `destructiveOpLimiter` | 10 / 60s | userId | Delete/archive program, bulk `applyToFuture` exercise replace/delete |
| T3 — admin | `adminLimiter` | 60 / 60s | userId | Admin write endpoints (`POST`/`PATCH`/`DELETE` under `/api/admin/*`). GETs are excluded per the read-endpoint policy below |
| T4 — workout writes | `workoutActionLimiter` | 10 / 10s | userId | Complete, skip, clear a workout |
| T4 — set logging | `setLoggingLimiter` | 60 / 10s | userId | Draft sync, per-set upsert, per-set delete — intentionally generous for live logging |
| T5 — auth sensitive | `authSensitiveLimiter` | 5 / 60s | **IP** | `/api/auth/complete-profile` (bypasses BetterAuth's own limiter) |
| T6 — feedback | `feedbackSubmissionLimiter` | 5 / 3600s | userId | Replaces a prior DB-count check — submissions per hour |

BetterAuth handles its own rate limiting on everything under `/api/auth/[...all]` (sign-in, sign-up, password reset, etc.). The `RELAXED_RATE_LIMITS` env var should be unset (or `false`) in production — it's only enabled in staging for load testing. This is **not** a place to add `lib/rate-limit.ts` limiters; don't double-wrap.

## What is NOT rate-limited (and why)

- **Read endpoints** (GETs). Cheap, cached, low abuse value. Add coverage case-by-case if a specific read becomes a problem.
- **Health endpoints** (`/api/health/*`). Probed by k8s — must never 429.
- **Signout**. Idempotent, harmless.
- **Week/workout parent CRUD**. Not attack vectors; set logging (the child) is what matters and is already covered.
- **Auth catch-all** (`/api/auth/[...all]`). BetterAuth handles it.

## How to add coverage to a new route

The simpler pattern (no headers-on-success):

```ts
import { checkRateLimit, programManagementLimiter } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const { user, error } = await getCurrentUser()
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = await checkRateLimit(programManagementLimiter, user.id)
  if (limited) return limited

  // ... rest of handler
}
```

If you want `X-RateLimit-*` headers on successful responses (so clients can self-throttle), use the richer helper:

```ts
import {
  checkRateLimitWithHeaders,
  communityCloneLimiter,
  withRateLimitHeaders,
} from '@/lib/rate-limit'

const rl = await checkRateLimitWithHeaders(communityCloneLimiter, user.id, {
  endpoint: 'POST /api/community/[id]/add',
})
if (rl.response) return rl.response

// ... do work ...

return withRateLimitHeaders(NextResponse.json({ ok: true }), rl)
```

For **admin** routes, prefer the `requireEditor({ rateLimit: true })` helper — it combines editor role check and rate limiting in one call:

```ts
const auth = await requireEditor({ rateLimit: true })
if (auth.response) return auth.response
```

For **pre-auth** or **auth-sensitive** routes, key by IP rather than user id:

```ts
import { authSensitiveLimiter, checkRateLimit, getClientIp } from '@/lib/rate-limit'

const limited = await checkRateLimit(authSensitiveLimiter, getClientIp(request))
if (limited) return limited
```

## Response contract

### On success
If you used `checkRateLimitWithHeaders` + `withRateLimitHeaders`, the response carries:

- `X-RateLimit-Limit` — the limiter's point budget
- `X-RateLimit-Remaining` — points left in the current window
- `X-RateLimit-Reset` — Unix epoch (seconds) when the window resets

### On 429
Always includes:

- `Retry-After` — seconds until next attempt should succeed
- `X-RateLimit-Limit`, `X-RateLimit-Remaining` (`0`), `X-RateLimit-Reset`

Body: `{ "error": "Too many requests" }`.

## Fail-open behavior

If Redis is unreachable and the in-memory fallback fails for any reason, `checkRateLimit` **allows the request through** rather than blocking legitimate users. We log the error at `error` level for alerting but do not 503. A best-effort rate limiter is better than an outage.

## Test bypass

`checkRateLimit` short-circuits when `NODE_ENV=test`, so integration tests against real limiters don't flake or require time-travel. To exercise the limiter logic from a unit test, temporarily flip `process.env.NODE_ENV` to `'development'` (see `__tests__/lib/rate-limit.test.ts` for the pattern).

## Observability

Hitting a rate limit logs at `info` (not `warn`) because it's expected and useful telemetry for tuning, not an alertable event:

```json
{ "level": "info", "msg": "rate limit hit", "key": "...", "endpoint": "POST /api/community/[id]/add", "retryAfter": 45, "limit": 3 }
```

Aggregate these in Grafana / Loki to see which endpoints are running hot. If an endpoint is hitting limits for legitimate users repeatedly, loosen it; if nothing is ever hit, tighten it.

## Tuning guidance

- **Start conservative, observe, then loosen.** Tightening after launch is harder (users complain); loosening is easy.
- **Check the log aggregation** for `rate limit hit` events before shipping a tightening.
- **If a single user keeps hitting a limit**, check their client — it's often a retry storm or a buggy polling loop, not actual abuse.
- **Redis pool pressure**: the limiter uses its own Redis connection (separate from BullMQ and app sessions). Not a factor in the Postgres connection math.
