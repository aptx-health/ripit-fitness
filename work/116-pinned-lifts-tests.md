---
id: 116
state: accepted
waiting_on:
executor: test-builder
from: lead (lead-ripit-mcp)
confirmed: 2026-11-02 Dustin (pin from Lifts rows + an editor; default = anchor lifts; chart page next slice; spec "Yes, go")
updated: 2026-11-02
---
# Progress S3 (pinned lifts): tests

Checkout: worktree2, branch `feature/pinned-lifts`, branched from `feature/progress-records` (S2, PR #1031 into dev, not merged yet). No phone preview is running.

## Goal
Write the failing tests that `features/analytics/pinned-lifts.feature` will be judged by, before any build.

## Read
- `features/analytics/pinned-lifts.feature` (the contract)
- S2 code it extends: `lib/insights/progress-records.ts`, `lib/insights/progress.ts` (`getWeeklyReport`, `earlierBestSets`), `components/features/progress/RecordsLifts.tsx`, and the S2 tests (locked; don't edit)
- Anchors: `prisma/schema.prisma` `UserTrainingProfile.targetMovements` (`{ [pattern]: exerciseDefinitionId[] }`, order = `ANCHOR_PATTERNS` in `lib/exercises/anchor-patterns`), `components/features/target-movements/TargetMovementsEditor.tsx` (existing exercise search UX to mirror)
- Saved workouts already pin (`SavedWorkout.pinnedAt`), for API conventions

## Shape to test against (the implementer follows the same names)
- Prisma: `PinnedExercise { id, userId, exerciseDefinitionId, position Int, createdAt }`, unique `(userId, exerciseDefinitionId)`; `UserSettings.pinnedLiftsCustomized Boolean @default(false)`. Additive migration, test DB only.
- `lib/insights/pinned-lifts.ts`: `resolvePins(db, userId)` → ordered exercise definition ids (anchors deduped in pattern order when not customized; max 12); `savePins(db, userId, ids)` replaces in order and sets customized.
- `getWeeklyReport` adds `pinned: Array<{ exerciseDefinitionId, name, lift | null, last: { weight, reps, e1rm, completedAt } | null }>`, with `last` only from sessions before the week end. Bounded queries (no per-pin N+1).
- `PUT /api/progress/pins` `{ exerciseDefinitionIds: string[] }`: auth, rate limit, 400 on unknown/duplicate/over 12; AGENTS.md conventions.
- UI: Lifts tab groups "Pinned" and "Also this week (N)" (collapsed), pin toggle per row (48px), "Edit tracked lifts" editor (search, add, remove, move up/down), the strings in the feature.

## Do
1. Unit tests for default resolution, ordering, dedup, limit.
2. DB tests with testcontainers: per-user isolation, customized flag, `last` from before the week end, query count flat in pin count.
3. API tests for PUT validation and auth.
4. Component tests for the groups, the pin toggle, the editor and its strings.
5. Lock new files (`chmod a-w`) and run a break matrix in small batches.

## Done when
New tests fail on this branch for the right reason, S1/S2 tests still pass, break matrix recorded.

## Hand back
Use `handoff-test-builder`. First line `Report: complete | needs decision | further handoff`. Don't edit `work/`, `STATE.md` or `status.md`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-02 CST: created; confirmed by Dustin; dispatched to test-builder (wF:p1).
- 2026-11-02 CST: back; lead re-ran (129 red). Decisions accepted (116-handback.md). Build 117 dispatched.
- 2026-11-02 CST: Dustin checked the phone preview ("Looks great"). Accepted.
