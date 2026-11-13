Report: complete

## Verdict
Checks out. Commit `84adc531` (my paths only). `mise run ios-check` → `✔ Test run with 128 tests in 22 suites passed`, then the simulator build. That's the 124 earlier tests, unchanged, plus 4 new. The reviewer's `renumbered.json` now imports.

## Verified
- New tests in `Tests/RipitCoreTests/ImportRenumberTests.swift`:
  - The renumbered file imports: the deleted squat set is gone, the remaining sets are numbered 1, 2, and the report says removed 1, updated 1.
  - Importing the same renumbered file again changes nothing (same snapshot, removed 0).
  - A phone-logged set in an imported session survives a file that deletes a set.
  - A phone set on the number a new file set takes: both are kept, numbered 1..4, with the phone set last.
- With the fix disabled, all 4 fail (5 issues). I restored it.
- The repro file itself, in the simulator (fixture, then `renumbered.json`): squat sets are `rzbxiy` 1 and `7bxkv5` 2, and the alert reads "Nothing new to add; updated 1; removed 1 set; 5 already up to date." Screenshot: `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/643821d1-2005-4e50-b99d-dd541f067605/scratchpad/shots167/small/2-renumbered.png`.

## How it works
`Import.swift` `reconcileSets` runs only for a session that came from an earlier file (not a new one, and not a phone session):
1. It deletes the file-origin sets the file no longer lists. Phone sets (`importHash` NULL) are never deleted.
2. Pass 1 moves the remaining file-origin sets, and any phone set sitting on a number the file wants, to unique negative numbers.
3. Pass 2 gives the file sets their file numbers. The usual upserts then compare the rest of their values.
4. Displaced phone sets are numbered after the file's sets for their exercise, in their old order.

`ImportReport.removedSets` is new, with a default of 0 in `init`. The summary adds "removed N sets".

## Not verified
- I didn't trace a program session that both resumes on the phone and is renumbered on the web through the app by hand. The core tests cover the set rules.

## Outside this item
- Another agent has untracked slice 4 files in this worktree (`Sources/RipitCore/Progress.swift`, `Tests/Fixtures/progress/`, `scripts/ios/progress-goldens.ts`). My 128-test run compiled them. I didn't commit them.

## Cleanup for Dustin
- The scratchpad `shots167/` folder and `renumbered.json` (my copy of the repro).
- `Documents/renumbered.json` inside the sim app's container.
- The simulator `ripit-154-impl` is still booted.
