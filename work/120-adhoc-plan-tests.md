---
id: 120
state: accepted
waiting_on:
executor: test-builder
from: lead (lead-ripit-mcp)
confirmed: 2026-11-02 Dustin (one-line summary, tap to expand, remembered; pre-fill reps + RPE/RIR; spec "Yes, go")
updated: 2026-11-02
---
# Planned sets in the workout logger: tests

Checkout: worktree2, branch `feature/adhoc-planned-sets` (from dev; independent of pinned lifts, PR #1032). No phone preview is running.

## Goal
Write the failing tests that `features/workout-logging/adhoc-planned-sets.feature` will be judged by, before any build.

## Read
- `features/workout-logging/adhoc-planned-sets.feature` (the contract)
- Where plans come from: `lib/workouts/start-draft.ts` (copies saved/generated workout plans into PrescribedSets), `lib/proposals/saved-workout.ts`
- The ad-hoc logger: `app/(app)/training/adhoc/[completionId]/page.tsx` (loader; selects no prescribedSets today), `components/adhoc/AdHocLoggerView.tsx:797` (passes `prescribedSets={[]}`)
- How the program logger uses plans: `components/workout-logging/ExerciseDisplayTabs.tsx`, `components/workout-logging/SetList.tsx` (its `isAdhoc = prescribedSets.length === 0` switch: passing plans in would flip ad-hoc into program layout, which the spec doesn't want), and how the program logger pre-fills its form
- `UserSettings.intensityEnabled` (effort fields on/off)

## Shape to test against (the implementer follows the same names)
- Loader adds each exercise's `prescribedSets` (setNumber, reps, rpe, rir), ordered by setNumber.
- Pure `lib/workout-logging/plan-summary.ts`: `summarizePlan(prescribed, loggedCount)` → the Plan line text in the feature; `nextPlannedSet(prescribed, loggedCount)`.
- Component `components/adhoc/PlanLine.tsx`: collapsed line (48px button, `aria-expanded`), expanded per-set list with done/next marks; expanded state in localStorage (guarded try/catch).
- Pre-fill: reps and RPE/RIR for the next planned set when the form is untouched; weight unchanged.

## Do
1. Unit tests for `summarizePlan` and `nextPlannedSet` (uniform, mixed, RIR, reps-only, done, extra sets).
2. A DB test that the loader returns plans for a session started from a saved workout and none for a fresh session, user-scoped.
3. Component tests for the Plan line, expand/remember, pre-fill rules (untouched only, intensity off), and no-plan exercises unchanged.
4. Lock new files (`chmod a-w`) and run a break matrix in small batches.

## Done when
New tests fail on this branch for the right reason; existing logger tests still pass; break matrix recorded.

## Hand back
Use `handoff-test-builder`. First line `Report: complete | needs decision | further handoff`. Don't edit `work/`, `STATE.md` or `status.md`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-02 CST: created; confirmed by Dustin; dispatched to test-builder (wF:p1).
- 2026-11-02 CST: back; lead re-ran (80 red). Decisions answered (120-handback.md). Branch fast-forwarded to dev + prisma generate. Build 121 dispatched.
- 2026-11-02 CST: Dustin checked the phone preview ("really nice. Perfect."). Accepted.
