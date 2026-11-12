Report: complete

## Verdict
Checks out. Progress now has 16 Swift tests and 3 web-generated golden files. Run against the stub, every one fails with `notImplemented` except the check that the goldens load. All of them pass against a scratch Swift port of the web code, and they catch 27 out of 27 broken versions of it. Commit `10828474`.

## Verified
- `mise run ios-check` → 144 tests. The 22 existing suites all pass. My 2 suites fail, and only with `notImplemented`.
- The app's simulator build passes with `Progress.swift` added, and no type names clash.
- `npx tsx scripts/ios/progress-goldens.ts`, run twice, gives byte-identical output.
- **Scratch fake:** a Swift port of the web's progress code, plus a scratch pins table and pin import → `144 passed`.
- **Comparator check:** I changed 5 golden values (a weight off by 0.001, a count, a date off by 1 s, a flag, a dropped session). Each one failed its own test. Restored afterwards.
- **Break matrix:** 27 breaks in 5 batches, 27 caught, 0 crashes. The first pass missed 6: the 15-rep record cap, UTC week boundaries, the half-rated effort rule, a light open week, lift order, and stored duration. I added a golden case for each.

## Not verified
- Expected values come from the web's own pure functions. The loaders that need Postgres (`getWeeklyReport`, `getLiftHistory`, `loadPinned` and its SQL `lastSets`) are rebuilt by hand in the script from their source, so those compositions are my reading of the web.
- Not covered: cardio (the phone has none, so 0), `programWeek` (left out of the API), anchor-lift default pins (the phone has no training profile), and ties between sets in a different order.
- The UI isn't tested: the chart drawing and how numbers are rounded and worded on screen.

## Assumptions and decisions beyond the handoff
- The display unit and the weekly target are parameters, because the phone has no settings table. Weeks are computed in the time zone passed in.
- **No migration added.** The stubs don't need one, and `Schema.swift` is shared with ios-impl. The implementer needs a pins table, as the scratch fake had.
- **Pin import:** there's a test, but no stub inside `Import.swift`, which is slice 2's code. The implementer adds it there.
- Field names in the Swift types match the web's JSON, because the tests encode the Swift values and compare them with the goldens.

## Needs a call
- **Display unit and target:** they come from the caller until a settings slice exists. I recommend that.
- **Default pins:** none, where the web falls back to anchor lifts. I recommend that for now.

## Where to look first
- `ios/RipitCore/Sources/RipitCore/Progress.swift`: the contract, with the rules in its header.
- `scripts/ios/progress-goldens.ts`: the histories, and the loader composition copied from the web.
- `Tests/RipitCoreTests/ProgressSupport.swift`: the comparator. A missing key counts as null, numbers match within 1e-9 relative, and dates within 1 ms.

## How to run
- `mise run ios-check` → the `Progress:` suites. A failure prints the first 8 differing paths, for example `records[1].weight: expected 215, got 216`.
- To regenerate the goldens, run `npx tsx scripts/ios/progress-goldens.ts` from the repo root. Unlock the files first (see Locked).

## Cases (scenario → tests)
| Scenario | Test | Cases |
|---|---|---|
| This week's report | weekReport, weekStarts | 6 report weeks, 3 goldens |
| Records this week | records | 6 |
| (lifts this week) | lifts | 6 |
| Trend note | trend | 6 |
| Per-lift page | liftPage, liftCharts, unknownLift | 7 lifts × 4 ranges |
| Pinned lifts | pinned (goldens), ProgressPinTests | 6 + 6 |
| Mixed units | mixed-units golden (kg display of kg + lbs) | all of the above |

## Feared bugs (break → caught by)
- **Units:** kg not converted, 2.2 used instead of 2.20462.
- **Records:** a single (1 rep) run through Epley, the rep cap at 15, rep PRs missing, this week's sets compared against themselves.
- **Counting:** warm-ups counted, archived workouts counted.
- **Weeks:** boundaries in UTC, weeks starting on Sunday.
- **Normal and streak:** the normal ignoring the first-workout cut, an open week breaking the streak.
- **Effort:** RIR read as RPE, effort shown when under half the sets are rated, the percent floored instead of rounded.
- **Trend and lifts:** an open week counted as light, lift order, sessions-below-best off by one.
- **Pins:** last numbers shown when the lift was done this week, duplicate pins, imported pins ignored.
- **Lift page:** 3M charts grouped by week, change computed over all time, the latest set keeping a tied record, empty weeks skipped, sessions oldest first, stored duration ignored.

## Coverage of the reference
- No coverage tool was run on the web functions.

## Quirks for a human to mark
- On the web, `getWeeklyReport` reads logged sets with no set order, so which of two equal sets "wins" can vary. Equal sets give equal numbers, so no golden depends on it.
- The pre-commit hook runs Biome on the golden JSON. It failed harmlessly on the read-only files. If they are unlocked, Biome may reformat them, though the values stay the same.

## Locked
- `chmod a-w` on `ios/RipitCore/Tests/RipitCoreTests/Progress*.swift` and `ios/RipitCore/Tests/Fixtures/progress/*.json`. Unlock with `chmod u+w` on the same paths.

## Cleanup for Dustin
In `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/7797f706-e961-4bd7-bd21-9fa811a085e3/scratchpad/`, all safe to delete once 166 is accepted:
- `fake5/`: the scratch fake.
- `progress-fake.swift`, `pmatrix.sh`, `pm_*`: fake source, matrix script and matrix output.
- `golden1/`, `golden2/`, `basic.orig.json`: golden copies used for the determinism and comparator checks.
- `check4.txt`, `check5.txt`, `fake5-run.txt`: run logs.
- `appbuild/`: derived data from the app build.
