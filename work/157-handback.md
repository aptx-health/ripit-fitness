Report: complete

## Verdict
Checks out, with one contradiction in the handoff (see Needs a call). There are 38 new tests for `programs.feature`, against stub APIs in `Programs.swift`. All 38 fail on the stub, all pass against a scratch fake, and they catch 29 out of 29 broken fakes with no crashes. Commit `23209e8a`.

## Verified
- `mise run ios-check` → slice 1's 32 tests pass, and every one of my 38 fails with `notImplemented` and nothing else. The run also includes item 158's import tests, which are another agent's uncommitted work.
- A simulator build of the app, with `Programs.swift` added, passes. Nothing clashes with type names in `ios/App`.
- Scratch fake (a GRDB implementation of `Programs.swift` plus a scratch-only migration) → `70 tests passed`.
- Changing one expected value (`doneWorkouts: 7`) → only that test fails. Restored afterwards.
- Break matrix, 5 batches of 6: 29 out of 29 caught, 0 crashes. Breaking the fake first showed that a missing week or day crashed the whole run. The helpers now throw instead (`Array.at`, `workoutId(week:day:)` in `ProgramSupport.swift`).
- Prefill oracle: I ran `lib/workout/prefill.ts` `computePrefillValues` with node, twice, on 11 cases, and the output was identical both times. The expected `Prefill` values in the tests are that output.

## Not verified
- Skip (on the web, a skipped workout counts as done): it isn't in the spec, so there's no API or test for it.
- Warm-up handling in prefill: `logSet` can't mark a set as a warm-up.
- Starting a second workout while one is unfinished, archiving the active program, a week with no workouts.
- I wrote the expected values for current week and Up Next by hand from `current-week.ts` and `home.ts`, because those are database queries with no runnable oracle.

## Assumptions and decisions beyond the handoff
- A program workout is logged with slice 1's `logSet`, `finishWorkout` and `workout(_:)`, using the session's exercise ids. A finished program workout shows in `history()` named after the workout ("Day 2").
- I added `updateSet(_:reps:weight:unit:)` for "change the reps on one".
- `prefill(exerciseId:setNumber:)` returns the web's strings exactly ("225", "102.5", "0", and `weightUnit` nil when falling back to the plan).
- "Last time" means the most recent completed workout with that exercise, whether program or ad-hoc. It includes archived workouts, as `exercise-history.ts` does, so it carries across a restart.
- I added no migration. The implementer will probably need one, for example to store the current cycle on `program`.

## Needs a call
- **Done when contradicts itself:** "`ios-check` passes" can't hold while the new tests fail, so `ios-check` is red until slice 3 is built. Because of `set -e`, the app build step is skipped while it's red. I recommend accepting red until the implementer finishes.
- **Cycle number:** `restartProgram` on the web never increments `cycleNumber`. The tests follow the spec, so it goes up. Keep the spec's reading?
- **Renames and history:** on the web, renaming a program exercise also renames it in old history, because logged sets point at the program exercise. The tests follow the spec, which means the phone has to snapshot the session. Keep the spec's reading?
- **Archiving the active program:** I didn't test this. I recommend it also deactivates the program, as the web's delete does.

## Where to look first
- `ios/RipitCore/Sources/RipitCore/Programs.swift`: the contract, with the rules in its header.
- `Tests/RipitCoreTests/ProgramLoggingTests.swift`: prefill cases, which show the oracle output.
- The implementer will have to change slice 1's `AppDatabase.swift` (`dbQueue` is `private`). Item 155 is reviewing that file.

## How to run
- `mise run ios-check` → the summary line reads `✔`/`✘ Test run with N tests`. Once slice 3 is built, all `Programs:` suites should pass.

## Cases (scenario → tests)
| Scenario | File | Tests |
|---|---|---|
| Build a program | ProgramBuildTests | 4 (one parameterized over 4 weights) |
| Only one active | ProgramBuildTests | 2 |
| Archive | ProgramBuildTests | 2 |
| Up Next / current week | ProgramScheduleTests | 6 |
| Finishing a week | ProgramScheduleTests | 3 |
| Finish + restart | ProgramScheduleTests | 5 |
| Prefill | ProgramLoggingTests | 8 (one parameterized over 4 plans) |
| Plan vs logged | ProgramLoggingTests | 3 |
| Supersets | ProgramLoggingTests | 2 |
| Editing keeps history | ProgramEditTests | 3 |

Total: 38 tests. Cap: about 3 per rule. Prefill and Up Next go over, because each extra case targets a different feared bug.

## Feared bugs (break → caught by)
- **Numbering:** day numbers off by one, prescribed weight dropped.
- **Activation:** a second program left active, or a new program active by default.
- **Done counting:** drafts counted as done, a repeat counted twice, Up Next placed after the last finished workout, current week taken from the last finished workout, current week nil once the program is complete.
- **Restart:** history deleted, cycle number not raised, workouts not archived.
- **Prefill:** first set used instead of last, "225.0" instead of "225", session sets ignored, oldest workout used instead of newest, plan reps not parsed ("8-12" instead of "12"), "lbs" filled in when it should be nil, archived workouts excluded, plan RPE used even with history.
- **Logging:** `updateSet` adds a row instead of changing one, the plan changed by logging, superset group lost.
- **Editing and archive:** history rewritten by a rename or by new prescribed sets, an edit applied to every week, archive clearing the active program or deleting history, history entry missing its name.

## Coverage of the reference
- No coverage tool run. The web oracles are database queries, apart from `prefill.ts`, which I ran directly.

## Quirks for a human to mark
- Prefill includes archived workouts, so last time carries across a restart, as on the web. Intended?
- Ad-hoc workouts count as "last time" for prefill but don't move the program, as on the web.

## Locked
- `chmod a-w ios/RipitCore/Tests/RipitCoreTests/Program*.swift`. Unlock with `chmod u+w` on the same paths. Slice 1's tests are untouched.

## Cleanup for Dustin
In `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/7797f706-e961-4bd7-bd21-9fa811a085e3/scratchpad/`:
- `fake3/`, `fake4/`: scratch fakes.
- `oracle/`: the prefill oracle.
- `appbuild/`: derived data from the app build.
- `check1.txt`, `check2.txt`, `m_*`, `matrix.sh`: run logs and the matrix script.

All of these are safe to delete once 157 is accepted.
