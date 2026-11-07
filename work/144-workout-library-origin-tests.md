---
id: 144
state: accepted
waiting_on:
executor: test-builder
from: lead (lead-ripit-mcp)
confirmed: 2026-11-07 Dustin ("yes" to start slice 3; design from his 141 answers)
updated: 2026-11-07
---
# Workout library slice 3: tests

Checkout: worktree2, branch `feature/workout-library-origin` (stacked on `feature/workout-library-order`, PR #1040). No phone preview is running.

## Goal
Write the failing tests `features/workout-library/origin-new-archive.feature` will be judged by, before any build.

## Read
- `features/workout-library/origin-new-archive.feature` (the contract) and `features/workout-library/order-older.feature` (slice 1, built)
- `initiatives/workout-library/docs/141-discovery.md` (design: `origin String @default("session")`, `archivedAt DateTime?`; every create path with file:line; MCP `list_saved_workouts` at `lib/mcp/tools.ts:641-660`)
- Slice 1 code: `lib/saved-workouts/groups.ts`, `components/features/saved-workouts/SavedWorkoutsList.tsx`
- `AGENTS.md` "Database and migrations" (db push + hand-written migration with the backfill; never `migrate dev`)

## Shape to test against (the implementer follows the same names)
- Schema: `SavedWorkout.origin` (`session | agent | coach`, default `session`), `SavedWorkout.archivedAt`. Migration backfills `agent` for rows that an applied `saved_workout.create` proposal points at (`Proposal.targetId`).
- `groupSavedWorkouts` gains `new` (origin agent/coach, `lastUsedAt` null, not archived) and leaves archived out; `archived` list separate.
- Routes: archive / restore on the saved workout (PATCH with `{ archived: boolean }` is fine), scoped, rate limited, logged. Archive clears `pinnedAt` and returns what Undo needs.
- MCP `list_saved_workouts`: origin, lastUsedAt, pinned, archived; `includeArchived` option; order = last used, else created.
- New row shows the source name (agent token name; coach name later) from the proposal that created it.

## Do
1. DB tests: origin from each create path, the backfill SQL, archive/restore/unpin/Undo, scoping, rate limits, MCP list.
2. Pure tests for the grouping additions.
3. Component tests: New group (source label, Start, Dismiss + Undo), row menu Archive + Undo, Show archived (count, Restore, Delete), Training and quick actions skip archived.
4. Lock new files (`chmod a-w`) and run a break matrix in small batches.

## Done when
New tests fail on this branch for the right reason; existing tests still pass; break matrix recorded.

## Hand back
Use `handoff-test-builder`. First line `Report: complete | needs decision | further handoff`. Don't edit `work/`, `STATE.md` or `status.md`. Send the packet with `herdr agent prompt wE:p1 '<packet>'`.

## Log
- 2026-11-07 CST: created; dispatched to test-builder (wE:p9), working in worktree2.
- 2026-11-07 CST: back; lead re-ran (40 red). Decided: dismissedAt column; pinned beats New; MCP ignores pins; archive is not an edit for revert. Build 145 next.
- 2026-11-07 CST: Dustin on the phone preview: "Works fine approve". Accepted.
