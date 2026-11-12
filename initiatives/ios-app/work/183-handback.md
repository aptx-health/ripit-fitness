Report: complete

# 183 handback: iOS slice 6 re-check after fixes

## Verdict
**Accept.** All four fixes from review 181 hold up under real taps. The regression pass (summary after Finish, Save → Library, Start from detail) is unchanged and still passes. No new defects.

## Check
- `mise run ios-check` → exit 0. 208 tests in 35 suites pass (205 + 3 new `WorkoutNameTests`), then the app builds.

## First pass (real taps)
Simulator `parity-disco-173`, driven by the scratch XCUITest harness. The data is a fresh import of the fixture copy from 181.

| Fix | Result |
|---|---|
| 1 Blank rename | Rename `isEnabled` is **false** for an empty field and **false** for spaces only. Tapping it does nothing, and no error alert appears. With "Garage Day Two" typed it is **true**, and the row renames. **Pass** |
| 2 Name while open | Started from the detail sheet: logger title **"Garage Day Two"**, Training card **"Garage Day Two"**, prompt **"Garage Day Two is in progress"** / "Discard it and start Saturday Garage". The repeat opens titled **"Saturday Garage"**, and its card says the same. A plain ad-hoc workout keeps **"Workout"** / **"Ad-hoc workout"**. A program session keeps **"Pull"** / **"Strength Block · W1 · Pull"**. **Pass** |
| 3 Delete anchor | Deleting from Older's ··· menu: the popover now points at that row's ···. From Show archived it points at that row's Delete button. Tapping outside keeps the workout; confirming removes it. **Pass** (`recheck-sheet-fixes.png`) |
| 4 Largest text size | On Library rows, pin and ··· sit under the name, well apart (`recheck-sheet-ax-library.png`). At this size the logger title, Training card and prompt all show the name, and nothing breaks mid-word (`recheck-sheet-ax-names.png`). **Pass** |
| Dark mode | Library, the delete popover, the rename alert, the logger, Training's card and the prompt all read correctly (`recheck-sheet-dark.png`). **Pass** |
| Regression | Start from detail → log Pull-Up → Finish → summary "Garage Day Two", 8 Total reps, "+2 REPS VS LAST" → Save, suggested name "Workout — November 7" → Saved → Open Library › Workouts, where it's listed under Recent. **Pass** |

Code read (`41c6d5f2..HEAD -- ios/`): the changes are small and match the fixes. `WorkoutDetail.name` is optional with a default, so earlier callers are unaffected. The delete prompt moved into a per-row `DeleteConfirmation` modifier. `attempt` maps `SavedWorkoutError` to plain English. The new tests cover saved, repeat (falling back to "Open Workout") and the nil cases.

## Questions
None.

## Revised review
I read `work/182-handback.md` after my pass. It matches what I saw, and nothing changes. **Verdict: accept.**

## Notes (not defects of this item)
- At the largest text size the **delete popover is narrow** (it's anchored at the row's trailing ···), so its text is hyphenated ("re-moved", "work-outs") and the message scrolls (`recheck-ax-delete.png`). It's system rendering and still readable; leave it.
- The plain-English error messages are now hard to reach by tapping, since Rename can no longer send a blank name. I didn't trigger one; 182's shot 02 shows one.
- Repeating a plain ad-hoc workout names it "Open Workout" (tested). That matches the web's fallback name.

## Outside the item (not fixed)
- **Logger header at the largest text size:** ⓘ and ··· touch (`recheck-ax-logger.png`). This is slice 5's screen; 182 flagged it too.
- Still on the backlog from 181: relative dates ("Today") on Library rows.

## Cleanup for Dustin
- Simulator `parity-disco-173` (`06CEC7E3-537B-4866-8153-F71E8CC87FA1`), shut down. Its app data may hold an open "Garage Day Two" workout from the last run. Delete it with `xcrun simctl delete 06CEC7E3-537B-4866-8153-F71E8CC87FA1`.
- Scratch: `RecheckTests.swift`, logs `rc-*.log`, `check183.log`, sheets, under `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/e707016a-8e70-425e-b299-c1acfaf8cd6c/scratchpad`
- 30 `recheck-*` images added to `initiatives/ios-app/handoff/slice6-assets/` (git-ignored). `recheck-ax-delete-scrolled.png` is the delete popover scrolled, not a rename.
- `ios/Ripit.xcodeproj` was regenerated (git-ignored). Nothing committed or deleted.
