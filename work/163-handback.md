Report: complete

## Verdict
Checks out. All 8 findings are fixed in commit `e3ee71a6` (my paths only; locked tests untouched). `swift test --package-path ios/RipitCore --skip Program` → `✔ 69 tests in 13 suites passed`. That's 32 slice 1 + 29 import + 8 new. The simulator build passes.

## Verified
- New tests are in `Tests/RipitCoreTests/SliceOneFixTests.swift`:
  - weight: inf, -inf, NaN, -0.5, 2000.5 and 1e20 are refused and nothing is saved; the error is `invalidWeight(2500)`; 0 and 2000 are allowed
  - search: "BENCH-press!", "pull up" (all 4 Pull-Up variants), "lock off", "l sit pull up", "lockoff", "pullup"
  - removing an exercise: it goes with its sets, and finished workouts are refused
- The locked search tests (the bench set, "farmers walk", "cgbp") still pass under the new rule.
- Screenshots in `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/643821d1-2005-4e50-b99d-dd541f067605/scratchpad/shots163/` (phone-width copies in `small/`):
  - 3 (AX-XXXL): `3a-ax-workout`, `3b-ax-history`, `3c-ax-entry-row` (the fields stack, and Log is full width)
  - 4: `4a-workout-menu` (the … per exercise), `4b-remove-confirm`, `4c-finish-blocked` ("Log a set first, or discard")
  - 5: `5-select-all` (the prefilled 155 is selected when the field gets focus)

## Not verified
- I didn't test the Log debounce (0.6 s per exercise, in `WorkoutStore.logSet`) or the off-main-thread photo decoding by hand. Scroll smoothness still needs a real device.
- At AX-XXXL, set rows wrap ("135 / lbs") but stay readable. I only checked the top of the workout screen.

## Decisions beyond the handoff
- **"t bar row" from review 155:** the catalog has no T-Bar row, so it rightly finds nothing. The test says so and uses "lock off" and "l sit pull up" instead.
- **Empty workouts:** blocked in the UI only, not in `finishWorkout`. A locked slice 1 test (`twoSupersetsDistinct`) finishes a workout that has no sets.
- **Remove scope:** `removeExercise` works only on a draft's own exercises. Program plan exercises (`workoutId`) are never removed by it.
- **New public API:** `LoggedWeight.max`/`isValid` and `RipitCoreError.invalidWeight`, so the UI and the core share one rule.
- The per-set unit toggle is kept (lead call).

## Confirmed
- Import (160) never touches an existing `exerciseDefinition` row. Refs resolve to the existing id, so system rows keep their bundled `imageUrls` (`Import.swift`, `existingDefinition`).

## Outside this item
- Import doesn't apply the 0–2000 weight bound. A file with a weight over 2000 still imports. Worth a call for slice 2.

## Where to look first
- `ios/RipitCore/Sources/RipitCore/API.swift`: `search` and `normalize`.
- `ios/App/WorkoutView.swift`: `entryRow`, which stacks at AX sizes, plus select-all and the remove menu.

## Cleanup for Dustin
- The scratchpad `shots163/` folder.
- The simulator `ripit-154-impl` is still booted; its text size was set back to Large.
