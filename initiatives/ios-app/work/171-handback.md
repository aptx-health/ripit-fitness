Report: complete

## Verdict
Fixed in commit `197ef248` (my paths only). `mise run ios-check` → `✔ 151 tests in 25 suites passed`, then the simulator build, exit 0. The fix is all app-side, so there's no new core test. The flow is shown by screenshot and a database check.

## The fix
- `WorkoutStore.revision` goes up after every write. `ProgramEditView` reads it, so the program is re-read after each save. Before, it read `store.programs`, which a set edit doesn't change.
- The exercise sheet now holds an id (`editingId`) and looks the exercise up from the saved program when it opens, instead of keeping a stale `ProgramExercise`.

## Verified (reviewer's flow, replayed by `-demoEditFlow` on the sample program's Bench, 3 × 5 @ 75%)
Screenshots in `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/643821d1-2005-4e50-b99d-dd541f067605/scratchpad/shots171/small/`:
1. `1-first-open-3-sets`: the sheet with 3 sets.
2. The flow removes set 1 and saves. `2-reopened-after-save`: reopened, the sheet shows **2 sets**.
3. It changes a rep and saves again. `3-edit-screen-after-second-save`: the row reads "1 × 6 @ 75%, 1 × 5 @ 75%".
4. The database has 2 prescribed sets for Strength Base W1 D1 Bench (6 @ 75%, 5 @ 75%). The removed set didn't come back.
- **Before:** the reviewer's `r11-stale-reopen.png` and `r4-after-remove-warmup.png` (paths in `work/165-handback.md`). I didn't rebuild the old code to re-shoot it.

## Not verified
- I didn't tap through the exact warm-up case by hand. The flow removes the first set the same way.

## Cleanup for Dustin
- The scratchpad `shots171/` folder.
- The simulator `ripit-154-impl` is still booted.
