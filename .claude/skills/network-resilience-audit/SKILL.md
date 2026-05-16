---
name: network-resilience-audit
description: Audit recently changed code for network fragility — silent fetch failures, missing retries, no loading/error UX, races on slow links, and server round-trip pile-ups. Use after a feature lands or before shipping to users on spotty connections.
allowed-tools: Read, Grep, Glob, Bash
argument-hint: [since-ref-or-days]
---

# Network Resilience Audit Skill

Audit recently-changed code for fragility under poor network conditions (cellular dead spots, gym wifi, PWA backgrounding). Most "weird bugs at the gym" are not logic bugs — they're a fetch that failed silently, an optimistic UI mismatch, or a server route that does N round trips when one would do.

## Scope

1. **Determine what to audit:**
   - `$ARGUMENTS` empty → last 3 days across all branches (`git log --since="3 days ago" --all`)
   - `$ARGUMENTS` is a git ref → diff since that ref (`git diff <ref> --name-only`)
   - `$ARGUMENTS` is a number → that many days (`git log --since="N days ago"`)

2. **Filter to relevant files:**
   - `app/api/**/*.ts` — server route handlers
   - `lib/**/*.ts` — server utilities and client fetch helpers
   - `components/**/*.tsx`, `hooks/**/*.ts` — client surfaces with `fetch(`
   - Skip pure style/markup/test-only changes

## What to check

Run these checks in parallel where possible. Severity guidance below.

### CRITICAL — silent fetch failures

A fetch that fails without telling the user is the #1 cause of "did that save?" bugs. Pattern to flag:

```tsx
// BAD — error is logged but UI looks like success
try {
  const res = await fetch(url, opts)
  if (!res.ok) {
    clientLogger.error('Failed:', err)  // silent to user
    return                              // state never reconciles
  }
  // ...
} catch (err) {
  clientLogger.error('Failed:', err)    // silent to user
}
```

Grep for: `clientLogger\.error.*\n.*return` near a `fetch(` and no nearby `toast.` call.

**Fix:** surface failure with a toast and either keep the action button enabled or expose a manual retry. Never `router.push` away from a screen on a failed mutation — the user thinks it saved.

### CRITICAL — navigation on unverified mutation

```tsx
// BAD — navigates even if DELETE failed
try {
  await fetch(url, { method: 'DELETE' })
} catch { /* swallowed */ }
router.push('/elsewhere')
```

Grep for: `router\.push` or `router\.refresh` after a fetch that's outside the `if (res.ok)` branch.

**Fix:** only navigate inside the success branch; on failure, toast and stay put.

### CRITICAL — no retry on idempotent operations

GET requests, PUT/DELETE with stable IDs, and POST upserts should retry on network errors and 5xx. Look for raw `fetch(` calls that aren't wrapped in a retry helper.

**Fix:** route all mutating + critical-read calls through a `fetchWithRetry` helper that:
- retries on network errors and 5xx + 408 + 429
- does NOT retry other 4xx
- uses exponential backoff (e.g., `BASE * 2 ** attempt`)
- surfaces the final failure to the caller as a typed error

Project convention: `lib/api/workout-sets.ts` has the reference implementation. Reuse or generalize it — don't reinvent.

### HIGH — no optimistic UI on hot-path mutations

Logging a set, ticking a box, typing into an input that saves — these should not block on a round trip. Look for `setIs*ing(true)` flags around `fetch` calls in critical interaction paths.

**Fix:** append to local state immediately with a `_syncStatus: 'pending'` marker; flip to `'synced'` on success, `'failed'` on terminal failure (with a tap-to-retry affordance).

### HIGH — no loading communication

After ~250ms of latency, users start second-guessing. Look for fetches in `useEffect` or click handlers where:
- there is no spinner, skeleton, or disabled-button state
- the only feedback is a state value flipping when the response arrives

**Fix:** track `isLoading` per action, render a spinner / skeleton / disabled button, and show a "retrying…" state on the second attempt.

### HIGH — server round-trip pile-ups inside transactions

Inside `prisma.$transaction(async (tx) => …)`, look for:

```ts
for (let i = 0; i < rows.length; i++) {
  await tx.model.update({ where: { id: rows[i].id }, data: { … } })
}
```

N updates = N round trips inside the tx. On a slow link to Postgres (or pooled via PgBouncer) this multiplies. Common offender: **renumbering after a delete.**

**Fix:** collapse to a single statement via raw SQL or a `WHERE > deletedValue` decrement:

```ts
await tx.$executeRaw`
  UPDATE "LoggedSet" SET "setNumber" = "setNumber" - 1
  WHERE "exerciseId" = ${exerciseId} AND "setNumber" > ${deletedSetNumber}
`
```

### HIGH — `$transaction([array of creates])` instead of `createManyAndReturn`

```ts
await prisma.$transaction(
  items.map((x) => prisma.model.create({ data: x, include: {...} }))
)
```

This is N inserts in serial inside a tx. Prefer `createManyAndReturn` (Postgres) — single round trip.

### MEDIUM — read-then-write races without DB-level guards

Pattern: query for "is there already one?" then `create`. Two parallel requests both see "no" and both create. Common in:
- "active draft" guards
- "next order number" computations
- "unique-within-X" assignments

**Fix:** use a partial unique index or `SELECT … FOR UPDATE` inside a tx. Single-user-per-account doesn't fully save you here — the same user can double-tap on a slow link.

### MEDIUM — sequential awaits where parallel works

```ts
const a = await fetchA()
const b = await fetchB()   // doesn't depend on a
```

**Fix:** `Promise.all([fetchA(), fetchB()])`. Note: only flag when the second await doesn't read from the first.

### MEDIUM — context/provider that refetches without retry

`DraftWorkoutContext`-style providers that re-fetch on focus/pathname change are good for staleness, but a single failed fetch on a slow link can leave the context permanently stale until next trigger. Check for retry + a way to surface "couldn't sync" to the user.

### LOW — `cache: 'no-store'` on calls that could tolerate staleness

Not a fragility issue per se, but each `no-store` is a guaranteed round trip. Worth flagging if the data is OK to be a few seconds old.

## Output format

```
## Network Resilience Audit

### Scope
- Range: last 3 days (`git log --since="3 days ago" --all`)
- Files scanned: 12 (4 API routes, 3 client components, 5 lib)

### Findings

**CRITICAL** — Silent fetch failure
`components/adhoc/AdHocLoggerView.tsx:341-378` (handleLogSet)
On failure, `isLoggingSet` resets and nothing tells the user. The set isn't appended to state, so the user re-taps. Eventually the request lands → upsert deduplicates server-side, but the user sees no feedback during the round trip.
**Fix:** optimistic append with `_syncStatus: 'pending'`; toast on terminal failure.

---

**CRITICAL** — Navigates on unverified discard
`components/adhoc/AdHocLoggerView.tsx:460-471` (handleExitDiscard)
`router.push('/training')` runs whether or not the DELETE succeeded. Stale draft remains on the server; on next load, "resume draft" appears for a workout the user thought they discarded.
**Fix:** await response, branch on `res.ok`, toast + keep modal open on failure.

---

**HIGH** — Sequential renumber inside tx
`app/api/workouts/adhoc/[completionId]/sets/[setId]/route.ts:65-74`
Up to N round trips inside a transaction for set deletion.
**Fix:** single `$executeRaw` decrement on `setNumber > deletedSetNumber`.

### Summary
- Critical: 2
- High: 3
- Medium: 1
- Low: 0

### Recommended order
1. Generalize the existing `fetchWithRetry` (`lib/api/workout-sets.ts`) and route ad-hoc calls through it.
2. Add toast feedback + optimistic UI to `AdHocLoggerView` mutations.
3. Replace renumber loops with bulk SQL.
4. Add partial unique index for active drafts (schema change — flag for human review).
```

## Patterns table (fast grep reference)

| Pattern | Severity | Grep |
|---------|----------|------|
| `clientLogger.error` near `fetch(` with no `toast.` | Critical | `rg -B2 -A2 'clientLogger\.error' \| rg -B5 'fetch\('` |
| `router.push` after un-checked fetch | Critical | `rg -A5 'fetch\(' \| rg 'router\.(push\|refresh)'` |
| Raw `fetch(` in client (no helper) | High | `rg "await fetch\(" components/ hooks/` |
| `for.*await tx\.` in `$transaction` | High | `rg -B5 'await tx\.' \| rg '\$transaction'` |
| `$transaction\(\s*\[?\w+\.map` | High | `rg '\$transaction\(\s*\w+\.map'` |
| read-then-create without tx | Medium | manual review — `findFirst` then `create` with same predicate |
| `const \w+ = await.*\n\s*const \w+ = await` | Medium | `rg -U 'const \w+ = await[^\n]+\n\s+const \w+ = await'` |

## Notes

- Heuristic — confirm by reading context. A `clientLogger.error` followed by `setError(...)` that's rendered in the UI is fine.
- "One user per account" (no multi-tenant) does **not** eliminate races — same user, two tabs, or a double-tap on slow net both trigger them.
- For PWA / mobile users, assume:
  - 30%+ of mutations will see a >1s round trip at some point
  - 1–5% will see a hard failure
  - Background tab + foreground returns is a constant pattern
- Don't fix everything in one PR. Group by surface (e.g., "ad-hoc logger resilience") so reviewers can verify each behavior change in isolation.
