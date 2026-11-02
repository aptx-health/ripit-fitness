Report: complete (test-builder, wF:p1, 2026-11-01)

- New, locked: `__tests__/features/agent-tools/balance-targets-source.steps.ts` (8 scenarios, 27 steps; 9 red on dev for the right reason).
- Edited (contradicted the feature): `balance-proposals.steps.ts` (anchor approve no longer seeds from Settings; 2 red on dev; re-locked), `user-training-aggregates.test.ts` and `training-state-builder.test.ts` (also write the Settings row; green before and after).
- Listed, not edited: `user-training-profile.test.ts` lines 34-43 (pure `normalizeUserTrainingProfile({ratioTargets})` expects chest 1.5; drop or move if the normalizer stops reading the column); the test at line 358 still passes but its name is now wrong.
- Break matrix: 20 breaks across planner, aggregates, profile DTO, writers and staleness; all killed.
- Choices: Settings edits through `updateMuscleBalanceSettings`; profile read through `getOrCreateUserTrainingProfile`; the new-profile column value is unpinned but must not carry Settings values; staleness pins archived and the 50 limit, not the status filter; targets compared with toBeCloseTo.
- Not covered: HTTP routes, the clone-program cloud function's call, Settings UI, target picker.
- Lead re-ran: 11 failed / 223 passed across the 4 files, matching the packet.
