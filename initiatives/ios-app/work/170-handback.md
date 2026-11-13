Report: complete

## Verdict
Checks out. Commit `218f6592` (my paths only). `mise run ios-check` → `✔ Test run with 151 tests in 25 suites passed`, then xcodegen and the simulator build, exit 0. That's 144 locked tests, unchanged, plus 7 new.

## Verified
- New tests in `Tests/RipitCoreTests/ProgramEditingTests.swift`:
  - add week copies the last week, and every new id is a UUID
  - add week to an empty program gives week 1
  - add workout and add exercise, with RPE and warm-up kept
  - removing an exercise with logged sets is refused and it's kept; one without sets goes
  - regroup: set and clear a superset label
  - rename program and workout, and unknown ids are refused
  - a history entry carries its program name and week
- The UUID test fails against the old `hex(randomblob)` ids.
- Screenshots in `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/643821d1-2005-4e50-b99d-dd541f067605/scratchpad/shots170/small/`:
  - S1 `s1-builder-cancel`: "Discard this program? Nothing is saved until you tap Save."
  - S2 `s2a-training-resume-card`: "Strength Base · W1 · Lower A" in progress, with Resume and Discard and the "One workout at a time" line.
  - S2 `s2b-start-other`: the prompt "Resume Strength Base · W1 · Lower A" or "Discard it and start Strength Base · W2 · Full Body".
  - S2 `s2c-archived-draft`: the program is archived, the draft can still be resumed or discarded, and Training says "No active program".
  - History `h-history-rows`: rows read "Strength Base · W1 · Lower A", and ad-hoc rows are unchanged. `h-detail` shows the same title on the detail screen.

## How it works
- **S1:** `.interactiveDismissDisabled` while the builder has content, or the exercise sheet has unsaved changes. Cancel asks before discarding.
- **S2:**
  - **One start rule:** `WorkoutStore.startProgramWorkout` starts only when nothing is open, or the same workout is. Otherwise it sets `pendingStart`, and RootView shows one dialog for every entry point (Up Next, the week list and program detail).
  - **Up Next:** its button is no longer disabled-but-looking-enabled.
  - **Resume card:** Training's card shows for any workout in progress, with Discard (confirmed).
- **S3:** `EditableSet` carries `rpe`, `rir` and `isWarmup`, so they move with their set. The positional merge is gone. "Add set" copies the last set's RPE and RIR, but not the warm-up flag.
- **Minor:**
  - `HistoryEntry` gained optional `programName` and `weekNumber` (defaults nil). `name` stays the workout name, as the locked `historyNamedAfterWorkout` test requires.
  - `Format.dayTitle` drops the "Day 1 · Day 1" repeat.
  - `addProgramWeek` copies sets with `newId()` UUIDs.
  - `.selectAllOnFocus()` is on the builder's program, workout, reps and weight fields, and on the editor's sets.

## Not verified
- S3 lives in the app target, which has no test target, so it isn't unit-tested. I checked it by reading the code, not by tapping.
- The swipe-down block itself can't be screenshotted. The Cancel prompt is.
- Light mode and AX sizes for these screens.

## Needs a call
- None.

## Where to look first
- `ios/App/WorkoutStore+Programs.swift`: `startProgramWorkout`, `discardAndStartPending`, `currentTitle`.
- `ios/App/RipitApp.swift`: the one conflict dialog.

## Cleanup for Dustin
- The scratchpad `shots170/` folder.
- The simulator `ripit-154-impl` is still booted.
