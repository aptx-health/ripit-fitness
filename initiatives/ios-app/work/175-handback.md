Report: complete

## Verdict
Checks out. All of 174's tests pass, with none changed, and every scenario works in my simulator. Two items were checked with debug launch flags instead of real taps (see Not verified).

## Verified
- `mise run ios-check` → exit 0. 178 tests in 31 suites pass, then xcodegen and the simulator build succeed.
- 174's test files and `history.json` are still mode 444 and unchanged.
- Spot-check: I changed the PR tie rule (`>` to `>=`) and the deadlift golden failed. Then I restored it.
- Simulator `ripit-175-impl` (iPhone 16, iOS 27.2). Screenshots are in `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/ba850211-9970-4a09-8ca1-a87a94c21da7/scratchpad/shots/` (`*-s.png` are the smaller copies):
  - `01-logger`, `02-later`: the workout clock, the rest timers (ticking from 1:37 to 1:48), the Last time line, the RPE menu, the Warm-up toggle, and a "W" label plus "@ RPE 8" on logged sets.
  - `06-usefill`: tapping Last time fills 160 / 5 / RPE 8.
  - `07-notes-rir`: after quitting the app and reopening it, the rest timer went from 1:37 to 1:42 and the clock from 20:02 to 20:07 (true time). It also shows inline notes and the RIR scale.
  - `03-info`, `08-notes-sheet`, `03-history`: Info (photos and instructions), Notes, and History (PR marked, warm-ups collapsed).
  - `05-finish`: the Finish alert with Cancel / Finish.
  - `09-program`: a program session (plan, rest timer, Last time). Row shows no timer before its first set.

## Not verified
- **Real taps.** I had no tap tool. Tap-to-fill and opening each sheet ran through debug flags that call the same code. Still worth trying by hand: the RPE/RIR menu, the Warm-up toggle, long-pressing a set → "Mark as warm-up", and Cancel on the Finish alert.
- **Muscles and equipment in Info.** They sit below the fold, so they aren't in the screenshot. The data is in the database (`chest, triceps` / `front-delts` / `barbell, bench`).
- **Locking the phone for 2 minutes.** I quit and reopened the app after about 20 s instead of locking it.

## Files changed
- `RipitCore/LoggingHelp.swift`: the stubs are implemented.
- `AppDatabase.swift`: the old `logSet` now calls the new one, and `detail` reads rpe/rir/isWarmup.
- `ProgressMath.swift`: `toLbs` and `epley` are no longer private, so History reuses them.
- New `RipitCore/ExerciseInfo.swift`: `exerciseInfo(definitionId:)` and `exerciseNotes(exerciseId:)`. The handoff didn't name these; the Info and Notes screens need them, and they have no tests.
- New `App/LoggingHelpViews.swift`, `App/ExerciseHelpSheet.swift`, `App/WorkoutStore+Logging.swift`.
- `WorkoutView.swift`: wires everything in. `SetRow` gets the tags. `DebugHooks.swift` gets `-demoEffort`, `-demoHelp <tab>` and `-demoUseLastTime`.

## Decisions beyond the handoff
- Info, Notes and History open in one sheet with tabs, from an ⓘ button. The Notes tab appears only when there are notes. Notes also show inline under the exercise.
- The RPE/RIR toggle sits next to the workout clock and is stored as `effortKind`. Switching scale clears the effort picked for the next set.
- Finish uses an alert. On iOS 27 a confirmation dialog showed as a popover with no Cancel button.
- Editing a set changes only its warm-up flag, not its effort; `updateSet` has no effort field.

## Needs a call
- None.

## Cleanup
- Simulator `ripit-175-impl` (AC0A4C20-488B-4434-B0C3-0B1B31447959) is still booted.
- Scratch files: `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/ba850211-9970-4a09-8ca1-a87a94c21da7/scratchpad/` (`shots/`, `check.log`, `LoggingHelp.bak`).
- Nothing is committed.
