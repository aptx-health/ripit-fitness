---
name: perf-check
description: Use when reviewing or finishing any UI or API change, to catch what is fast on localhost but slow on a phone - a tap with no feedback, a client request waterfall, sequential awaits, per-row queries. Static scan, a throttled tap test, and a query-count helper for DB tests.
argument-hint: [changed-since-ref]
---

# perf-check

Localhost answers in a few ms, so a review there can't see a 1-2 s blank tap on a phone (work 129: the lift page had no `loading.tsx`, so a tap waited on a server round trip, then route JS, then a client fetch). These checks measure instead of relying on rules you have to remember. Run them from the repo root.

| Check | When | Command | Fails on |
|---|---|---|---|
| Static scan | every UI or API change | `npm run perf:scan -- --changed origin/dev` | a page with no loading boundary, sequential awaits, awaits in loops |
| Tap test | a change to a page, a link to one, or what a page loads | `npm run perf:tap -- <options>` against a production build | feedback > 100 ms or content > 2 s after a tap |
| Query count | a DB test for a route or loader that reads lists | `countQueries` in the test | your assertion (≤ N queries, same for 1 row and 10) |

## 1. Static scan (seconds, no server)

```bash
npm run perf:scan -- --changed origin/dev     # files changed on this branch (the review default)
npm run perf:scan                             # the whole app
npm run perf:scan -- app/api/progress lib/insights   # paths
```

Prints `file:line  [check]  message` and exits 1 when a blocking finding is left. `--report-only` always exits 0; `--json` for tools.

- **no-loading** (blocking): a page under `app/(app)/` that loads data (a `[dynamic]` segment, awaits in the page beyond `params`/`searchParams`, or a client page or directly imported client component that calls `fetch`) with no `loading.tsx` in its folder or any folder above it. Without one a tap shows nothing until the server answers, and production can't prefetch an instant loading state. Fix: add a `loading.tsx` with the page's skeleton.
- **sequential-awaits** (blocking): in `route.ts`, `page.tsx`, `layout.tsx` and `lib/`, an awaited read right after another one whose result it doesn't use: `Promise.all` them. Awaits of auth, rate limits, `params`, request bodies, writes, bare `await x()` and `tx.` calls end a run, since their order is usually meant. Low noise: 8 on all of dev, 7 plausible. The eighth is `lib/admin/analytics-queries.ts`, which batches on purpose to stay inside PgBouncer's `connection_limit=5`, so keep any one `Promise.all` to a few queries. It misses runs split by a plain statement and dependencies through side effects.
- **await-in-loop** (blocking): an `await` in a `for`/`while` body (sleep/retry waits skipped), an `async` `forEach`, or `.map(async)` that awaits `prisma.`/`tx.`/`db.`/`fetch(` per item. One round trip per row: batch with `in`, `createMany`, or one query. Retry loops and ordered writes inside a transaction are expected hits: allowlist them.
- **mount-fetch** (report only, never fails): a client component that fetches in `useEffect` on mount (deps `[]` or only the fetching callback). Ask whether the server page could pass the data in and skip a round trip. Often fine (week pickers, data that changes on the page): judge it.

**Allowlist** accepted cases in `.claude/skills/perf-check/allowlist.json`, with a reason. `match` is optional text from the flagged line or message, so entries survive line moves:

```json
[{ "check": "await-in-loop", "file": "lib/api/fetch.ts", "match": "await fetch(url, init)", "reason": "retry loop: attempts must be sequential" }]
```

## 2. Throttled tap test (a minute or two, needs a production build)

`next dev` compiles routes on demand and never prefetches, so test a production build:

```bash
.claude/skills/perf-check/scripts/serve-build.sh start     # builds, serves on 3000 + slot*100 + 50 (PERF_PORT)
npm run perf:tap -- --base http://localhost:3150 --login bodybuilder@synthetic.test:password \
  --start '/progress?week=2026-10-26' --before 'role=tab[name=/Lifts/]' \
  --tap 'a[href^="/progress/lift/"]' --content 'section[aria-label="Chart"]'
.claude/skills/perf-check/scripts/serve-build.sh stop      # stops the server, and the DB if start started it
```

On a phone at 390px with touch, over an emulated link (150 ms RTT, 1.5 Mbps down, 750 kbps up, CPU 4× slower), it loads `--start`, taps each `--before` (e.g. a tab), waits for prefetches to settle, taps `--tap` and measures from the touch:

- **feedback**: the first visible change (an element added, removed or restyled in view). Budget `--feedback-ms 100`.
- **content**: until `--content` (CSS) is visible. Budget `--content-ms 2000`.
- **chain depth**: the longest run of same-origin requests where each starts after the previous one ended, i.e. the waterfall, listed with timings. Report only, unless you pass `--max-chain N`. Timing-based, so an unrelated request can sit in the chain: read the list.

The verdict is on the median of `--runs 3` (each run is a fresh load). On a fail it says which budget and why. The timeline (`timeline.json`: every request after the tap, the marks, before and after screenshots per run) goes to `--out` (default `$TMPDIR/perf-check/tap-<time>`). Link and CPU are `--rtt`, `--down-kbps`, `--up-kbps` and `--cpu`.

- Use a seed user with data in the week you open (`?week=`), and a `--content` selector that the skeleton doesn't have.
- Logging in writes `session` and `AppEvent` rows. Delete them afterwards, or use a cloned DB (`CREATE DATABASE x TEMPLATE ripit`, then `PERF_DATABASE_URL`).
- `npm run perf:tap` loads Playwright through `npx -p playwright@1.63.0`, because Playwright isn't a repo dependency.

Proof (work 130, PR #1035's lift page, Progress Lifts row → lift page, median of 3):

| Build | Feedback | Content | Chain | Verdict |
|---|---|---|---|---|
| without `loading.tsx` | 212 ms | 426 ms | 3 (RSC → page → API) | FAIL |
| with `loading.tsx` | 44 ms | 539 ms | 3 | PASS |

## 3. Query counts in DB tests

`lib/test/query-count.ts` counts the SQL a call sends through the test client. That client is built with query events; BEGIN and COMMIT aren't counted. Pin the count with one row and with many, so per-row queries fail the test:

```ts
import { countQueries } from '@/lib/test/query-count'

const one = await countQueries(prisma, () => call('?start=2026-10-26&tz=America%2FDenver'))
// ...add nine more workouts...
const ten = await countQueries(prisma, () => call('?start=2026-10-26&tz=America%2FDenver'))
expect(ten.count).toBe(one.count)
expect(ten.count).toBeLessThanOrEqual(11)
```

`queries` lists the SQL when a count surprises you. Example: `__tests__/api/progress-week.test.ts` ("query count").

## What the other skills cover

Run these too. perf-check doesn't repeat them.

- **`prisma-check`** (read-only review): Prisma shapes in DB code, such as N+1 loops, delete/update loops, overfetching (`include` without `select`), missing `createMany`, and unbounded `findMany`. The static scan's **await-in-loop** catches the loop part mechanically; prisma-check is the judgement on query shape.
- **`network-resilience-audit`** (read-only review): what happens when the network is bad, such as silent fetch failures, navigation on an unverified mutation, missing retries, optimistic UI, loading UX, round trips inside transactions, read-then-write races, and `no-store`. Its "sequential awaits" and "no loading communication" items are what **sequential-awaits** and the tap test now measure.
- perf-check owns speed on a phone link: tap feedback, the waterfall, awaits, and query counts.
