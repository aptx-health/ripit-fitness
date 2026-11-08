---
id: 147
state: accepted
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-07 Dustin (slice 3); lead decides fix details
updated: 2026-11-07
---
# Workout library slice 3: fixes after review 146

Checkout: worktree2, branch `feature/workout-library-origin`, uncommitted. Small: write tests yourself for 2 and 3.

## Read
`work/146-handback.md` (findings with file:line).

## Do
0. Rebase onto dev first: #1040 and #1041 are merged. Commit nothing; stash or carry the uncommitted work onto a branch from `origin/dev` (keep the name `feature/workout-library-origin`). Regenerate the Prisma client (`npx prisma@6.19.0 generate`); the wt2 DB needs the coaching tables too (apply its migration SQL the same way you applied yours: `db execute` + `migrate resolve --applied`).
1. `p.agentToken?.name ?? null` in `app/api/workouts/saved/route.ts:216`; a coach-sent row (coachLinkId, no token) reads "From your coach". tsc clean on dev.
2. Undo only when the row is archived, and only a `pinnedAt` no later than now; otherwise 400.
3. Starting an archived workout restores it (same as Restore) so it shows in Recent afterwards.
4. Toast Close button gets a 48px target.
5. Allowlist `app/(app)/welcome/page.tsx` no-loading in `.claude/skills/perf-check/allowlist.json` with a reason; `npm run perf:scan -- --changed origin/dev` exits 0.

## Done when
Locked slice 3 tests still pass; full suite and tsc clean on the dev base; perf:scan exits 0. Preview data still in the wt2 DB.

## Hand back
Use `handoff-implementer`. First line `Report: complete | needs decision | further handoff`. Don't edit `work/`, `STATE.md` or `status.md`. Send the packet with `herdr agent prompt wE:p1 '<packet>'`.

## Log
- 2026-11-07 CST: created after review 146; dispatched to implementer (wE:p7).
- 2026-11-07 CST: back; lead re-ran 64/64, tsc clean. Phone preview for Dustin.
- 2026-11-07 CST: Dustin on the phone preview: "Works fine approve". Accepted.
