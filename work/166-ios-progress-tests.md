---
id: 166
state: running
executor: ios-tests
skill: handoff-test-builder
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-07 Dustin (4h goal stretch: slice 4)
updated: 2026-11-07
waiting_on:
---
# iOS slice 4 (stretch): tests for Progress

## Goal
Failing Swift tests for `features/ios-app/progress.feature`, so the phone's Progress numbers match the web's.

## Read first
- `features/ios-app/progress.feature`. The web's pure functions are `lib/insights/progress-records.ts`, `lift-history.ts`, `pinned-lifts.ts`, `progress.ts`, plus the web pages `/progress` and `/progress/lift/[id]`.
- RipitCore at the current `feature/ios-skeleton` HEAD (slices 1-3 plus import, 124 tests green).

## Do
- **Golden files:** write a small script (`scripts/ios/progress-goldens.ts`, run with `npx tsx`) that feeds a few hand-built histories (mixed units, rep PRs, a gap week, several lifts) through the web's pure functions and writes the expected outputs as JSON into the test resources. The Swift tests load the same histories into a DB and compare against the goldens. Note how to regenerate them.
- Add a Progress API stub and a migration for pinned lifts if needed. Extend import to pinned exercises only as a stub and a test.
- Prove it the usual way, and lock the tests.

## Done when
- `mise run ios-check` shows the 124 existing tests passing; the new tests fail only on notImplemented.

## Don't touch
- `ios/App/`, the web's `lib/`, `work/`, `STATE.md`, `initiatives/`. Commit your paths only (ios-impl and reviewers are on this branch).

## Hand back
The `handoff-test-builder` packet, first line `Report: ...`, sent to wX:p1. Don't run rm.

## Log
- 2026-11-07 CST: created (stretch slice started early: slices 1-3 built).
- 2026-11-07 12:42 MST: dispatched to ios-tests (running)
