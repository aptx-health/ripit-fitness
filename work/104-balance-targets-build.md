---
id: 104
state: review
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-01 Dustin (Settings' copy is the source; no migration; staleness fix in the same PR)
updated: 2026-11-01
---
# Balance targets: one source of truth — build

Checkout: worktree2, branch `feature/balance-targets`. Dev server and builds are fine (no phone preview running).

## Goal
Make `features/agent-tools/balance-targets-source.feature` true: every reader of targets reads `UserMuscleBalanceSettings.targets`, nothing writes `UserTrainingProfile.ratioTargets`, and anchor staleness ignores archived workouts and isn't capped at 50.

## Read
- `work/103-handback.md` (tests, choices, the one listed test to fix).
- `work/024-handback.md` (discovery).

## Do
1. Readers: profile DTO (`lib/user-training-profile.ts`), planner (`lib/suggest/training-state-builder.ts`), aggregates (`lib/aggregates/recompute.ts`, both functions). No settings row → default targets, and reading never creates a row.
2. Writers: profile create no longer seeds the column from Settings; `updateUserTrainingProfile` with `ratioTargets` writes Settings targets instead; `lib/proposals/balance.ts` stops seeding. The column stays (no migration, no schema change); new rows need some value since the column is required: use the default targets, not Settings.
3. Staleness: its own last-logged query (completed, not archived, no row cap). Don't change `getBatchExercisePerformance`.
4. `user-training-profile.test.ts`: fix the assertion at lines 34-43 and rename the test at line 358, as the handback says.
5. Keep touched files under 1000 lines.

## Done when
The four test files from 103 plus `user-training-profile.test.ts` pass, the full suite passes, and tsc plus eslint/biome are clean on touched files. Don't edit the locked tests.

## Hand back
Use `handoff-implementer`. First line `Report: complete | needs decision | further handoff`. Don't edit `work/`, `STATE.md` or `status.md`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-01 21:52 CDT: created from 103; dispatched to implementer (wF:p2).
- 2026-11-01 22:05 CDT: back; lead re-ran 5 files (266 pass). Lead decision: aggregates use getMuscleBalanceTargets (normalized), so planner and stats agree; adjust the lats-3 test to an in-range value. Also fix seed-synthetic-users to write Settings. Sent back to implementer.
- 2026-11-01 22:20 CDT: follow-ups back; lead re-ran 17 files (917 pass), tsc ok. Review 105 dispatched.
