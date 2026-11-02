---
id: 103
state: review
waiting_on:
executor: test-builder
from: lead (lead-ripit-mcp)
confirmed: 2026-11-01 Dustin (Settings' copy is the source; staleness fix in the same PR; tests → build → review)
updated: 2026-11-01
---
# Balance targets: one source of truth — tests

Checkout: worktree2, branch `feature/balance-targets` (from dev). Phone preview is off; dev server and builds are fine.

## Goal
Write the failing tests that `features/agent-tools/balance-targets-source.feature` will be judged by, before any build.

## Context
- Discovery: `work/024-handback.md` (the "Second store" bullet and "Out of scope").
- Source of truth: `UserMuscleBalanceSettings.targets` (`lib/muscle-balance.ts`, `app/api/settings/muscle-balance/route.ts`, `lib/proposals/balance.ts`).
- Old copy readers: `lib/user-training-profile.ts` (DTO `ratioTargets`, create seeding, update), `lib/suggest/training-state-builder.ts` (`ratio_targets`), `lib/aggregates/recompute.ts` (`computeUserAggregates`, `recomputeUserAggregates`, also used by `cloud-functions/clone-program`). Writer to drop: `lib/proposals/balance.ts` profile create.
- Staleness: `lib/recommendations/anchor-staleness.ts` `getAnchorStaleness` uses `getBatchExercisePerformance` (last 50 completions, no `isArchived` filter). Don't change `getBatchExercisePerformance` itself (prefill uses it); staleness needs its own last-logged query.
- Existing tests touching `ratioTargets` (update, don't delete coverage): `__tests__/api/user-training-profile.test.ts`, `__tests__/api/user-training-aggregates.test.ts`, `__tests__/lib/suggest/training-state-builder.test.ts`, `__tests__/features/agent-tools/balance-proposals.steps.ts`, `equipment.test.ts`.

## Do
1. One test per scenario, against a real test DB (testcontainers), named after the scenario.
2. Lock new test files read-only (`chmod a-w`) and run a break matrix (`break-matrix` skill).
3. Existing tests that assert the old behaviour: list them in the packet with the change each needs; edit only ones that would contradict the feature.

## Done when
New tests fail on dev for the right reason; break matrix recorded in the packet.

## Hand back
Use `handoff-test-builder`. First line `Report: complete | needs decision | further handoff`. Don't edit `work/`, `STATE.md` or `status.md`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-01 21:30 CDT: created; confirmed by Dustin.
- 2026-11-01 21:32 CDT: dispatched to test-builder (wF:p1).
- 2026-11-01 21:50 CDT: back; lead re-ran (11 red as stated). Handback saved.
