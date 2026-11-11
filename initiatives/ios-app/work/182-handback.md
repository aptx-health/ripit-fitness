Report: complete

## Verdict
Checks out. All four fixes from review 181 are in and checked in my simulator (`ripit-180-impl`), with screenshots at the default and the largest text size. `mise run ios-check` exits 0, and 179's locked files are unchanged.

## Not verified
- Most checks used debug launch hooks; only the rename check below used real taps.
  - **Rename disabled** was checked by real taps. I used a copy of the reviewer's scratch XCUITest harness. It printed `isEnabled`: false when the field is blank, false for spaces only, and true once there is text.
- **Delete at the largest text size** (shot 14): the prompt is the system popover. Its text is very large, and the row it points at was off screen when the hook opened it.
- Dark mode not rechecked.

## Summary
1. **Blank rename.** Rename is disabled while the trimmed name is empty, as Save already is. Any `SavedWorkoutError` now shows a plain-English message ("Give the workout a name.") instead of "nameRequired".
2. **Name while open.** `WorkoutDetail` has a new `name` property (optional, default nil, read from `workoutCompletion.name`). The logger title, Training's in-progress card and the Resume/Discard prompt now show it. Program sessions still show their program title, and a plain ad-hoc workout still says "Ad-hoc workout" / "Workout".
3. **Delete prompt.** It is attached to the row's own ··· menu or Delete button, so it points at the right row.
4. **Pin and ··· at the largest text size.** They now sit under the name, 24 pt apart, and their tap targets grow with the text.

## Scenario → test map
| Fix | Tests / checks | Result |
|---|---|---|
| 1 Blank rename | XCUITest `testBlankRenameDisabled` (scratch harness); shot 02 shows the message | pass |
| 2 Name while open | new `WorkoutNameTests`: saved-workout start (after a rename and a relaunch), repeat ("Open Workout"), plain ad-hoc and program session (nil) | pass. Breaking the field made the first two fail (4 issues). |
| 3 Delete prompt | shots 03, 14 | pass |
| 4 Pin and ··· spacing | shots 15 (largest size), 17 (default) | pass |

## Files changed
- `RipitCore/Sources/RipitCore/API.swift`, `AppDatabase.swift`: `WorkoutDetail.name`
- `RipitCore/Tests/RipitCoreTests/WorkoutNameTests.swift` (new): 3 tests
- `App/WorkoutStore.swift`, `WorkoutStore+Saved.swift`: error messages
- `App/WorkoutStore+Programs.swift` (`currentTitle`), `WorkoutView.swift` (title)
- `App/LibraryView.swift`: Rename disabled; delete prompt on each row; layout at the largest text size
- `App/DebugHooks.swift`: `-demoLibrary rename | renameError | pinned`; `delete` now targets the first Older row

## Verification
- `mise run ios-check` → exit 0; "208 tests in 35 suites passed" (205 + 3 new); 0 warnings.
- `git diff` on 179's tests and fixture: empty.

## Decisions beyond the handoff
- The `SavedWorkoutError` messages are my own wording (listed in `WorkoutStore+Saved.swift`). The alert title is still "Something went wrong".

## Open questions and risks (outside the item, not fixed)
- At the largest text size, the logger's exercise header has ⓘ and ··· touching (shot 11). This is the same issue as fix 4, but on the slice 5 screen.

## Where to look first
- `ios/App/LibraryView.swift`: `SavedRow` (layout at large text, delete prompt) and `DeleteConfirmation`
- `ios/App/WorkoutStore+Programs.swift`: `currentTitle`

## Screenshots
In `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/3b341d8a-5281-42dc-ab51-6e6f0dbe963e/scratchpad/shots182/`; phone-size copies are in `small/`. Files 11–16 are at the largest text size.
- 01: blank rename
- 02: error message
- 03: delete anchored to the Older row
- 04: logger titled "Pinned newest"
- 05: in-progress card
- 06: prompt "Pinned newest is in progress"
- 11–13: name in the logger, card and prompt
- 14: delete
- 15: pinned rows
- 17: rows at default size

## Cleanup
Not removed; delete when done:
- Simulator `ripit-180-impl` (847C269E-110B-4740-A238-5BC627E12379)
- In the scratchpad above: `shots182/`, `uitest182/` (harness copy and its generated project), `dd182/` (DerivedData), `ui182.log`, `check182.log`; the 180 items listed in `work/180-handback.md`
- `ios/Ripit.xcodeproj` and `ios/build` were regenerated (git-ignored)

Nothing is committed.
