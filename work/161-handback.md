Report: complete

## Verdict
Checks out. All 42 locked Programs tests pass, slice 1 and the Import suites stay green, and the simulator build passes. Branch `feature/ios-programs` at `590d0570` already includes `feature/ios-skeleton` up to `e3ee71a6` (160 import and the 163 slice 1 fixes); both merges are resolved.

## Verified
- `mise run ios-check` → `✔ Test run with 112 tests in 17 suites passed`, then xcodegen and the simulator build pass with no errors or warnings.
- Spot check: with restart not raising the cycle, 3 Schedule tests fail. Restored afterwards.
- Simulator `ripit-161-impl` (iPhone 17, iOS 27.2). Screens are in `/private/tmp/claude-501/-Users-dustin-projects-worktrees-ripit-fitness-worktree5/76ad4392-92f4-42ed-bc0b-9906a5acf6d6/scratchpad/shots/`:
  - `01` Training with no program
  - `02` Up Next is Week 1 Day 2
  - `03` program list
  - `04` program detail by week
  - `05` builder
  - `06` editor
  - `07` exercise edit sheet
  - `08` session with plan chips and the prefill (225 x 5)
  - `09` week 2 current
  - `10` complete, with Restart
  - `11` History, with program sessions named after their workout
- Full flow: `02` → `08` → `12-flow-after-finish.png`. It starts Up Next (Day 2), logs a set, taps Finish, and Up Next becomes Day 3 with Day 2 ticked.

## Not verified
- I had no tap tool (no idb or cliclick), so the flow ran through debug launch hooks. Starting and logging go through RipitCore. The Finish step is the view's own `finish()`, via slice 1's `-demoFinish`. Typing in the builder, editor and set edit was not exercised by hand.
- perf-check isn't run: it is for the web app.
- Dark mode was not screenshotted.

## Files changed
- RipitCore: `Programs.swift` (contract bodies), new `ProgramsSupport.swift` (helpers and prefill), new `ProgramsEditing.swift` (editor calls).
- `Schema.swift`: migration `v3-program-cycle`.
- `AppDatabase.swift`: `logSet` and `deleteSet` handle program exercises; `detail` is internal.
- App: new `TrainingView`, `ProgramViews` (list and detail), `ProgramBuilderView`, `ProgramEditView`, `WorkoutStore+Programs`.
- App edits: `RipitApp` (Training and History tabs), `WorkoutView` (plan chips, web prefill, tap a set to change it), `WorkoutStore` (program state), `DebugHooks` (`-demoProgram`, `-demoDone`, `-demoSession`, `-demoScreen`).

## Decisions beyond the handoff
- **New migration `v3-program-cycle`.** It adds `program.cycleNumber` so restart can raise the cycle. The current cycle is the larger of that column and the highest completion cycle, so imported programs stay right.
- **Start resumes a draft.** `startProgramWorkout` resumes an unfinished session of that workout instead of making a second one.
- **Editor calls outside the contract.** I added `addProgramWeek` (copies the last week), `addProgramWorkout`, `addProgramExercise`, `removeProgramExercise` (refused when it has logged sets), `setProgramExerciseGroup`, `renameProgram`, `renameProgramWorkout` and `doneWorkoutIds`. They have no locked tests.
- **New programs.** A new program becomes active only when no program is active.
- **Program sessions.** They hide Superset and the per-exercise Remove menu. Edit those in the program editor.

## Needs a call
- None blocking. The new editor calls are untested. Should a test builder cover them?

## Open questions and risks
- Restart archives completions, including an open draft. `inProgressWorkout()` could still offer an archived draft to resume.
- WIP commits: `62d69024` and `38298693`, plus merges `19648bd6` and `590d0570`. I committed only so the merges you asked for had a clean base, and pushed nothing.

## Where to look first
- `ios/RipitCore/Sources/RipitCore/AppDatabase.swift` `logSet`: how a program exercise finds its session.
- `ios/RipitCore/Sources/RipitCore/Programs.swift` `prefill`: the "last time" query.
- `ios/App/WorkoutView.swift` around the merged entry row (`editingSet` alongside 163's changes).

## Cleanup for Dustin (don't rm while away)
- Simulator `ripit-161-impl` (`03769AD8-8523-4EAA-8A1E-831C5F585B26`): `xcrun simctl delete` it once accepted.
- The `shots/` folder and `dh.py` / `extra.swift` in the scratchpad above.
