Report: complete (implementer, wF:p2, 2026-11-01)

- New `getMuscleBalanceTargets(db, userId)` (lib/muscle-balance.ts): Settings row normalized, else defaults; never creates a row.
- Readers switched: profile DTO (`normalizeUserTrainingProfile(row, ratioTargets?)`), planner, `computeUserAggregates` (recompute goes through it).
- Writers: profile create writes default targets to the column; `updateUserTrainingProfile({ratioTargets})` writes Settings (full replace); `swapAnchors` new profile uses defaults.
- Staleness: new `getLastLoggedByExercise` (MAX(completedAt) per definition, completed + non-archived, no cap). `getBatchExercisePerformance` unchanged.
- Profile test edits as listed in 103.
- Choice raised: aggregates used raw stored Settings values (unclamped). Lead decided: clamp like everything else (see Log).
- Outside: `scripts/seed-synthetic-users.ts:145` wrote only the column.
- Implementer: 3056 passed / 4 skipped full suite. Lead re-ran the 5 files: 266 passed; tsc ok.

Follow-ups (2026-11-01): aggregates read `getMuscleBalanceTargets` (normalized); aggregates test uses lats 2 (1/3, 2/3). Seed script writes Settings targets, column gets defaults, cleanup deletes the settings row (script not run). Full suite 3056/4 skipped. Lead re-ran 17 related files: 917 pass; tsc ok.
