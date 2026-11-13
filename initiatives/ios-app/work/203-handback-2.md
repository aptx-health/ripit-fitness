Report: complete

## Verdict
Follow-up 1 is done. All three of Dustin's calls are now in the contract (`Logger.swift`, stubs only) and in locked tests. There is one new test file, `LoggerWeightKeypadTests.swift`, and `LoggerStoreTests.swift` has been extended. The golden `logger.json` is unchanged; it is still the web's pad. The known add-bug test is unchanged. Nothing is committed.

## What changed
1. **Weight keypad.** It is the web's pad plus a "." key, capped at 2000 (`LoggedWeight.max`).
   - Contract: `NumberKeypad(opening:decimal:)`, `KeypadKey.point`, `NumberKeypad.weightMax`, `NumberKeypad.decimalPlaces = 2`.
   - Rules:
     - "." can be used once.
     - At most 2 digits after the point. This matches how the phone shows weights today (`Theme.swift:437`, `fractionLength(0...2)`), and it allows 1.25 kg plates. The phone stores a `Double`.
     - "." pressed first, or on an empty value, gives "0.".
     - "0" followed by "." keeps the 0.
     - Done drops a trailing ".".
     - The reps pad is still the web's, and it ignores ".".
   - Departures from the web:
     - The 15 golden cases run through the weight pad too. Only "1000 is refused" departs: the weight pad takes 1000.
     - All 17 hand-written decimal and cap cases depart.
2. **Program swap and delete affect today only.** The tests now also require that, after a swap or delete, the program's plan for this day is unchanged and the next session after a restart has the plan's exercises again. The swap test also checks the finished workout keeps the swapped exercise.
3. **Supersets.** New contract: `removeFromSuperset(_:)`, used to ungroup from the plan list. Grouping still uses `groupAsSuperset`. New suite "supersets from the plan list" (6 tests):
   - Ungrouping one exercise of three leaves a pair.
   - Ungrouping one of a pair ends the superset.
   - Ungrouping an exercise that isn't in a superset does nothing.
   - An ungrouped exercise can be regrouped.
   - `deleteExercise` on one of a pair ends the superset, matching the web's normalise rule and today's `removeExercise`.
   - A finished workout's supersets can't be changed.

## Verified
- `mise run ios-check`: 347 tests, 206 issues, all in `Logger*Tests`.
  - 204 are `notImplemented`.
  - 2 are the known add bug.
  - No other suite has an issue.
  - The app builds. I ran xcodebuild separately, because ios-check stops when tests fail.
- **Fake:** the fake is updated, swapped in, and then restored byte for byte. With it, all 347 tests pass.
- **Break matrix (changed rules only):** 16 of 16 breaks are caught.
  - Keypad (8): reps pad takes ".", no leading 0, two points allowed, 3 decimal places, cap 999, cap 2500, Done keeps the ".", the reps pad at 1000.
  - Store (4): swap edits this day's plan row, swap across all weeks, delete removes the plan row, delete detaches the plan row. The new "this day / next session" assertions catch both "this day" breaks.
  - Supersets (4): delete leaves a lone group, ungroup clears the whole group, ungroup leaves a lone member, ungroup in a finished workout.
- **Changed-value check:** changing one expected value failed only that case.

## Hands-on list additions
10. **Plan list supersets (freestyle):**
    - The toolbar's "Superset" button is gone.
    - The plan list can group 2 or more exercises and ungroup one.
    - The logger shows only the "Superset A" badge.
    - Ungrouping one exercise of a pair removes the badge from both.
11. **Weight keypad:**
    - "." appears on the weight pad only.
    - 132.5 and 1.25 can be entered.
    - 2000 is the limit.
    - "45." then Done shows 45.

## Quirks for a human to mark
- Done turns a lone "0." into "0", which reads as bodyweight.
- `removeFromSuperset` is only tested on freestyle workouts. A program session's supersets come from the plan, and the plan list only offers the button in freestyle.

## Locked
- `chmod a-w` is set on all four `Logger*Tests.swift` files and on `logger.json`. Unlock with `chmod u+w`.

## Cleanup (not deleted)
- `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/707310fc-29e3-4c90-9e11-412a87689aff/scratchpad/f203/`: holds the fake, the stub backups (`Logger.stub2.swift` is the current stub), `breaks2.tsv`, `run2.sh`, the logs, and `ioscheck2.log`.
