Report: complete

## Verdict
Checks out. At the largest text size, logged set rows in the logger and in History now break only at spaces, never inside a number. Default size looks the same. One related problem is outside this item: the "Last time" line also breaks mid-word at that size (see Outside the item).

## Verified
- `mise run ios-check` → exit 0. 181 tests in 32 suites pass, then xcodegen and the simulator build succeed.
- I took screenshots through the scratch XCUITest harness on simulator `ripit-175-impl`. They are in `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/ba850211-9970-4a09-8ca1-a87a94c21da7/scratchpad/177/shots7/` (`*-s.jpg` are the smaller copies):
  - **Logger.** `7a` is the default size, unchanged. In `7b` (largest size) a set reads "2 / 155 lbs × 5 / @ RPE 8", and the W badge sits on the tag line.
  - **History.** `7c` is the default size, unchanged. In `7d` and `7e` (largest size) the rows read "4 / 160 lbs × 5 / @ RPE 8".
- The spoken labels are unchanged at the largest size, for example "Set 1, 135 lbs times 8, warm-up. Tap to change".

## Not verified
- **Finished-workout detail at the largest size.** The `-demoDetail` launch landed on Training (`7f`), so I have no screenshot. That screen uses the same `SetRow`, and so the same new `SetLine`.

## Files changed
- `ios/App/HistoryView.swift`:
  - New `SetLine` view, shared by both rows. At the largest sizes it shows the set number, then "weight × reps" as one Text that can only wrap at spaces, then the tags on the next line. At other sizes it keeps the old single row.
  - `SetRow` now uses it.
- `ios/App/ExerciseHelpSheet.swift`: `HistorySetRow` now uses `SetLine`.

## Decisions beyond the handoff
- I merged the two identical row layouts into `SetLine`, so the fix lives in one place.

## Outside the item (not fixed)
- **The "Last time" line breaks mid-word at the largest size** (`7b`): "LA/ST/TI/ME", "No/v 7". That is `LastTimeLine` in `LoggingHelpViews.swift`, which puts the label, date and "Use" in one row. Fix: at accessibility sizes, stack the label and date, and put "Use" under the summary.

## Cleanup
- Simulator `ripit-175-impl` (AC0A4C20-488B-4434-B0C3-0B1B31447959) is still booted.
- Scratch files: `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/ba850211-9970-4a09-8ca1-a87a94c21da7/scratchpad/177/` (`shots7/`, `ui4.log`, the harness with its new `test4_SetRows`), and `check177b.log` one level up.
- Nothing is committed.
