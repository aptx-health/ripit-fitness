Report: complete

## Verdict
Checks out. All six fixes are in, and each was checked by real taps in my simulator using a scratch XCUITest harness. One related problem is outside the item: logged set rows still break at the largest text size (see Outside the item).

## Verified
- `mise run ios-check` → exit 0. 181 tests in 32 suites pass (178 before, plus 3 new), then xcodegen and the simulator build succeed.
- 174's two test files and `history.json` are unchanged (`git diff` against HEAD is empty) and still mode 444.
- **New `ExerciseInfoTests`.** I broke the code twice and both breaks were caught:
  - renaming "Mid Back" to "Mid-Back"
  - changing the empty-JSON fallback to `["x"]`
- Real taps on simulator `ripit-175-impl`. Screenshots are in `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/ba850211-9970-4a09-8ca1-a87a94c21da7/scratchpad/177/shots/` (`*-s.jpg` are the smaller copies).
  1. **Text size.** At the largest size the exercise name gets its own line, with the timer, ⓘ and ··· on one row below it (`1b`, `1c`). In History, PR and e1RM sit under "Open Workout" (`1e`). Default size is unchanged (`1a`, `1d`).
  2. **Scale switch.** On the Pull day, starting on RPE shows "RPE none". Tapping RIR gives Deadlift **RIR 2** (from the plan) and Pull-Up RIR 1 (from last time). Switching back gives RPE none.
  3. **Long-press.** A 1.5 s press on a set shows no "Mark as warm-up" menu (`3b`).
  4. **Warm-up effort.**
     - Picked RPE 9, turned on Warm-up, and logged. The set was saved as "warm-up" with no effort, and the menu still read RPE 9.
     - The next working set was saved with "RPE 9" (`3a`).
  5. **VoiceOver labels.** The set rows now read, for example, "Set 1, 135 lbs times 8, warm-up. Tap to change" and "Set 4, 155 lbs times 5, RPE 9. Tap to change".

## Not verified
- I didn't listen with VoiceOver itself. I read the accessibility labels through XCUITest.

## Files changed
- `ios/App/WorkoutView.swift`:
  - the header stacks at accessibility sizes
  - a scale switch calls the new `plannedEffort()`
  - the context menu is removed
  - a warm-up is saved without effort, and the `keepEffort` flag keeps the effort picked
  - the set row's spoken label comes from `setLabel(_:)`
- `ios/App/ExerciseHelpSheet.swift`: `SessionCard` stacks its header at accessibility sizes. The title and badges are split out.
- `ios/App/LoggingHelpViews.swift`: the rest timer chip uses `.fixedSize()`, so it no longer breaks one character per line.
- New `ios/RipitCore/Tests/RipitCoreTests/ExerciseInfoTests.swift` (3 tests):
  - `muscleName` against a copy of the web's `FAU_DISPLAY_NAMES`
  - an empty or broken JSON column and blank instructions read as none
  - notes are trimmed and blank notes read as none

## Decisions beyond the handoff
- I also tested `exerciseNotes` (trimmed, blank means none), since it lives in the same file.
- A switch re-applies the logger's own default for the program exercise (this session's last set, then last time, then the plan), not only the plan. For an ad-hoc exercise it clears the effort, as before.

## Outside the item (not fixed)
- **Logged set rows break at the largest text size.** "135 lbs" wraps one digit per line, in the logger (`SetRow`, from slice 1) and in History (`HistorySetRow`). The review's own screenshot shows the logger rows broken before slice 5's tags were added. Fix: stack weight × reps over the tags at accessibility sizes.
- **Harness gotcha.** The `-effortKind` launch argument pins the setting: values passed at launch override what the app saves. A scale switch can't be tested in a run that passes it.

## Cleanup
- Simulator `ripit-175-impl` (AC0A4C20-488B-4434-B0C3-0B1B31447959) is still booted.
- Scratch files: `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/ba850211-9970-4a09-8ca1-a87a94c21da7/scratchpad/177/` holds the harness, DerivedData `uidd/`, logs, shots and a fixture copy. `check177.log` is one level up.
- Nothing is committed.
