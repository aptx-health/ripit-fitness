Report: complete

## Verdict
Checks out. All of 179's tests pass unchanged, the app builds, and every scenario ran in my simulator (`ripit-180-impl`). In the simulator I drove each flow with debug launch hooks that call the same store methods as the buttons, because this machine has no tool for tapping the screen.

## Not verified
- **Not tapped by hand.** No tap tool here (no idb, axe or XCUITest target). So every flow ran through `-demo…` hooks that call the same `WorkoutStore` methods the buttons call. A reviewer's thumb pass still matters most for:
  - Rename (alert with a text field)
  - "Discard it and start…" from the Resume/Discard prompt, for a saved workout or a repeat
  - Open Library › Workouts after Save
  - Dismiss on a New row
  - Restore
- The Resume/Discard prompt was seen (screenshot 15). Its Discard path for saved workouts and repeats is one `switch` in `discardAndStartPending`, not exercised.
- Only light mode; dark mode not checked.

## Summary
The `RipitCore` stubs are filled in, and `ExerciseDetail.planned` is filled in `AppDatabase.detail`. The UI has three new pieces:
- **Summary sheet after Finish**, replacing the jump straight back. Save shows for ad-hoc workouts only.
- **Library tab** (Training · Library · History · Progress) with Workouts: groups, the Older and Show archived folds, row actions, and a detail sheet with Start.
- **Pinned and Recent on Training**, with Start and Repeat.

A started or repeated workout shows its plan in the logger.

## Scenario → test map
| Scenario | Tests | Result |
|---|---|---|
| Summary after Finish | golden `rollup` ×11, `summaryText` ×8, `summaryOfPhoneWorkout`, `noSummaryWhileOpen`, `lastSevenDaysUsesNow` | pass; shots 06, 09 |
| Save an ad-hoc workout | golden `saving`, `storedJSON`, `suggestedName` ×3; `saveSurvivesRelaunch`, `saveOpenRefused`, `saveUnknown` | pass; shots 02, 07, 08 |
| Library › Workouts groups | golden `groups` | pass; shots 10, 10b (imported golden) |
| Manage | golden `manage` (16 steps); `manageSurvivesRelaunch`, `deleteKeepsHistory` | pass; shot 12 (delete asks) |
| Start a saved workout | golden `start` ×3; `startThenLog`, `refusedWhileOpen` | pass; shots 14, 15 |
| Training Pinned/Recent | golden `training`; `trainingRecent`, `trainingPinned` | pass; shot 13 |
| Repeat | golden `repeatWorkout` ×5; `repeatPhoneWorkout` | pass; shot 16 |

## Files changed
- `RipitCore/Sources/RipitCore/SavedWorkoutsStore.swift` (new): every database body
- `RollupFormat.swift` (new): summary wording, with JavaScript rounding
- `SavedWorkouts.swift`: `text()` and `suggestedName` bodies; the stub extension moved out. Shapes are unchanged.
- `AppDatabase.swift`: `detail` fills `planned`
- App, new: `SummaryView.swift`, `LibraryView.swift`, `WorkoutStore+Saved.swift`
- App, edited: `RipitApp.swift` (tab, summary sheet), `TrainingView.swift`, `WorkoutView.swift`, `WorkoutStore*.swift`, `PendingStart.swift` (now a kind), `Theme.swift` (`Format.minutes`), `DebugHooks.swift` (slice 6 flags)

## Verification
- `mise run ios-check` → exit 0; "205 tests in 34 suites passed"; app build has 0 warnings.
- Largest text size (AX5): checked Summary, Save, Library (top and bottom), detail, Training and the logger. I fixed three problems found there:
  - "Dis-miss" and "Restor-e" breaking mid-word (the buttons now stack)
  - the meta row wrapping mid-word
  - the Save labels wrapping

## Decisions beyond the handoff
- `planned` covers only the workout's own exercises. Filling it for program exercises broke `ProgramEditTests` ("plan edit doesn't change the session"), and program sessions already read their plan from `session`.
- The ad-hoc logger prefills reps and the warm-up flag from the next planned set when the reps are a plain number. "3-5" leaves reps empty.
- The rollup copies the web's 50-workout look-back for "vs last".
- Deleting a saved workout leaves `workoutCompletion.savedWorkoutId` as it was. The web has no foreign key there either.
- Library has only Workouts. Programs stays on Training.

## Open questions and risks
- A workout started from a saved one still shows as "Ad-hoc workout" in the in-progress card and the prompt, and its title is "Workout". `WorkoutDetail` has no name; showing one needs a small API addition. Worth a follow-up?
- The parity quirks the lead kept: kg volume is summed as lbs (shot 06: 62.5 kg × 10 → "625 lbs"), and bodyweight "vs last" uses last time's top set.

## Where to look first
- `ios/RipitCore/Sources/RipitCore/SavedWorkoutsStore.swift`, `rollup(_:_:now:)`: summary order is `createdAt, rowid`.
- `ios/App/RipitApp.swift`: the summary opens from the full-screen cover's `onDismiss`.
- `ios/App/WorkoutView.swift`, `prefill()`.

## Screenshots
In `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/3b341d8a-5281-42dc-ab51-6e6f0dbe963e/scratchpad/shots180/`. Phone-size copies are in `small/`; 2x-and-up files are 20–27 (AX5).
- 01, 06: summary
- 02, 07: Save
- 08: Library after a save
- 09: program summary, no Save
- 10, 10b: imported golden groups, both folds
- 11: detail
- 12: delete asks
- 13: Training
- 14: started with its plan
- 15: Resume or Discard
- 16: repeat

## Cleanup
Not removed; delete when done:
- Simulator `ripit-180-impl` (847C269E-110B-4740-A238-5BC627E12379)
- Scratchpad: `shots180/`, `shot180.sh`, `sheet180.py`, `check180.log`
- `golden180.json` in the simulator app's Documents
- `ios/Ripit.xcodeproj` and `ios/build` were regenerated (git-ignored)

Nothing is committed.
