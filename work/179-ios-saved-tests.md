---
id: 179
state: ready
waiting_on:
executor: ios-tests
skill: handoff-test-builder
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-07 Dustin (slice 6 as written, autonomous, no rating)
updated: 2026-11-07
---
# iOS slice 6: finish summary and saved workouts, tests

## Goal
`RipitCore` tests the slice 6 build is judged against, with expected values generated from the web's own functions.

## Read first
- `features/ios-app/saved-workouts.feature` and the oracle files in its header.
- Your slice 5 work (`LoggingHelp.swift`, `scripts/ios/logging-help-goldens.ts`), for the pattern.
- `ios/RipitCore/Sources/RipitCore/Schema.swift`: the `savedWorkout` table already exists (imported rows).

## Do
- Stubs (throw `notImplemented`) plus tests for:
  - the rollup, as goldens from `lib/stats/workout-rollup.ts` (bodyweight day, minimal, vs last, units)
  - saving (with the web's `workoutData` shape, so an export round-trips)
  - grouping (goldens from `groupSavedWorkouts` with a fixed `now`)
  - pin, rename, archive, restore, dismiss and delete
  - start-from-saved and repeat (exercises and planned sets, and `lastUsedAt`)
  - the Training lists (pinned order; recent with `canRepeat`)
- Break matrix as before. List the UI-only checks for the reviewer.

## Done when
- `mise run ios-check`: new tests fail only with `notImplemented`, and everything else stays green.
- Every scenario maps to a test or to the hands-on list.

## Decide alone
- Names and layout. A migration if needed (say so).

## Escalate to Dustin when
- The web's behavior looks like a bug you'd be copying.

## Don't touch
- `ios/App/`. `work/`, `STATE.md`, `status.md`, the roadmap. Don't `rm`.

## Hand back
The test-builder packet, plus the hands-on list.

## Log
- 2026-11-07: created (ready).
