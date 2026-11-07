---
id: 145
state: accepted
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-07 Dustin ("yes" to start slice 3)
updated: 2026-11-07
---
# Workout library slice 3: build

Checkout: worktree2, branch `feature/workout-library-origin` (stacked on #1040). The locked tests are the contract.

## Read
- `features/workout-library/origin-new-archive.feature`
- `work/144-handback.md`, especially the lead's decisions at the end, and the header of `__tests__/features/workout-library/origin-new-archive.steps.ts`
- `initiatives/workout-library/docs/141-discovery.md`
- `AGENTS.md` (Database and migrations: `db push` + hand-written migration with the backfill; never `migrate dev`; never apply SQL to staging or prod; Prisma 6 `npx prisma@6.19.0`)

## Do
Make `__tests__/features/workout-library/origin-new-archive.steps.ts` and `__tests__/lib/saved-workout-groups-new.test.ts` pass without editing them. Schema: `origin`, `archivedAt`, `dismissedAt` on SavedWorkout, migration with the backfill (`origin = 'agent'` where an applied `saved_workout.create` proposal's `targetId` points at it). Set origin on every create path. Grouping, New region, row menu Archive, Undo toast action, Show archived, MCP list fields and order. If a locked test conflicts with the lead's decisions, stop and say which line.

## Done when
New tests pass; full suite and `npx tsc --noEmit` clean; `npm run perf:scan -- --changed origin/dev` clean; 390px screenshots (New group, row menu, Show archived open) in light, dark and E-INK in `initiatives/workout-library/docs/assets/145/`. Leave synthetic preview data for bodybuilder@synthetic.test (an unstarted agent workout, a few archived) in the wt2 DB and say how to remove it.

## Hand back
Use `handoff-implementer`. First line `Report: complete | needs decision | further handoff`. Don't edit `work/`, `STATE.md` or `status.md`. Send the packet with `herdr agent prompt wE:p1 '<packet>'`.

## Log
- 2026-11-07 CST: created; dispatched to implementer (wE:p7).
- 2026-11-07 CST: back complete; lead re-ran 74/74, tsc clean. Review 146 dispatched to coach-review (wE:pB).
- 2026-11-07 CST: Dustin on the phone preview: "Works fine approve". Accepted.
