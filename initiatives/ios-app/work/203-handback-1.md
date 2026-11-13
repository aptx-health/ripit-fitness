Report: complete

## Verdict
Done. The contract is `ios/RipitCore/Sources/RipitCore/Logger.swift` (stubs only). There are 50 tests in three files: `LoggerGoldenTests`, `LoggerRulesTests` and `LoggerStoreTests`. The golden is `Tests/Fixtures/logger/logger.json`, made by `scripts/ios/logger.goldens.ts`. The hands-on list is below. Every scenario maps to a test, the list, or both. Nothing is committed.

**One test fails for a real reason, not `notImplemented`:** "Program: new exercises go after the plan's". Today's `addExercises` on a program session gives the new exercises `order` 1, 2… (`AppDatabase.swift:139-146` only looks at the session's own one-offs). They then sort in among the plan's rows: Press, Bench, Deadlift, Row, Squat. The current app's Add exercise in a program workout has this bug now. 9b must fix it.

## Verified
- `mise run ios-check`: 336 tests, 168 issues, all in `Logger*Tests`. 166 are `notImplemented`; the other 2 are the add bug above. The other 286 tests pass. ios-check stops at the test step, so I built the app separately: it builds.
- Golden: made twice, byte-identical (sha `d079a0fb`). `biome check` is clean.
- Scratch fake (a correct `Logger.swift`, a session-order table and the add fix, swapped in, then restored byte for byte): all 50 pass, and the full suite passes (336).
- Break matrix, run against targeted filters: **57 of 57 breaks caught**. Groups: nav and landing (8), bar and header (12), Log set's line and canLog (5), swipe (4), form after a log (5), badge and plan row (6), keypad (5), stepper (4), store (11: template reorder, swap appends or drops sets or hits all weeks, delete keeps sets or deletes the plan row and its history, the add bug, exit rules).
- Changing one expected value failed only that case.

## How to run
- `mise run ios-check`.
- To regenerate the golden: `npx vitest run --config scripts/ios/vitest.goldens.config.ts scripts/ios/logger.goldens.ts`. It needs Docker, and under Colima the `DOCKER_HOST` exports from `docs/TESTING.md`.

## Scenario map
| Scenario | Tests | Hands-on |
|---|---|---|
| One exercise at a time | – | 1 |
| The bottom bar | bar tests, detail golden, canLog | 2 |
| Swipe | swipe golden (36 points), next/previous | 3 |
| Log a set | form-after-log golden | 4 |
| After the planned sets | done, extra and header-Finish tests | 2 |
| Keypads | keypad and stepper goldens; the bar hides | 5 |
| Freestyle, no exercises | Add exercise only | 2 |
| Plan list | plan row, badge, add landing | 6 |
| Reorder, swap, delete, add | move golden, landing tests, store tests | 6 |
| Supersets in order | next/previous, badge | 6 |
| Exit | store exit tests | 7 |
| Slices 5–8 still work, AX5 | existing suites stay green | 8, 9 |

## Hands-on list for the reviewer (phone width, light and dark)
1. **Layout:** one exercise at a time. The header shows PLAN n/N · clock · FINISH · ✕. Below are the Log / Info / Notes (only with notes) / History tabs, and each scrolls on its own. Compare with `web-prog-01-logger.png`.
2. **Bar:** ‹ · LOG SET "8 reps × 135 lbs" · ›. After the last planned set it shows + EXTRA SET and NEXT EXERCISE, or FINISH on the last exercise. The header's FINISH goes while the bar offers one. Disabled buttons keep their outline. The bar fills the home-indicator strip.
3. **Swipe:** a short or diagonal swipe does nothing, and nothing follows the finger. A valid swipe nudges the content 16 pt and fades it to 0.8. There is no haptic on the swipe. Reduce Motion / E-ink.
4. **Log set:** a light haptic. The logger stays on the exercise, keeps the weight, and the RESTING stopwatch starts inline.
5. **Keypads:** the reps stepper and its readout keypad, the weight keypad and the effort grid. Each keypad takes over the panel, and the bar hides while one is open. Cancel restores the value and Done keeps it.
6. **Plan list:** NOW, "2 of 4 sets · 135 lbs", a tick, and "Superset A". Tap to jump. Reorder with drag: the current exercise stays and its number updates. Swap (the picker replaces it in place), delete with a confirm (lands on the exercise before it), and add (opens the first new one).
7. **Exit:** with nothing logged, Exit leaves and the workout is gone. With sets logged it offers Discard or keep as a draft, and the draft resumes from Quick Actions.
8. **Slices 5–8:** warm-ups, effort, Last time and its tap, Info/Notes/History, the summary, the picker, and the custom-exercise edit.
9. **AX5:** the header, the tabs, the bar and the keypads stay usable at the largest text size.

## Feared bugs
Each one is covered.
- A program reorder, swap or delete that rewrites the plan.
- A delete that cascades into finished workouts' sets.
- Warm-ups counted in "all logged".
- An off-by-one at the 50 pt / 0.75 swipe limits.
- The first key appending instead of replacing.
- A weight lost after a log.
- The index after a delete.

## Needs a call
1. **The web's keypad takes whole numbers 0–999 only.** The phone today takes decimals up to 2000, so 132.5 or 2.5 kg can't be entered with the web's pad. The tests encode the web's pad. Keep it, or add a decimal key and a 2000 cap?
2. **Program swap and delete scope.** The tests only require that other weeks and finished workouts are untouched. Should swap and delete change today only (like reorder), or this workout's plan (like the web)?
3. **Removing the "Superset" grouping button.** The feature drops folder grouping for a badge. Should the toolbar's "Superset" button (freestyle) go too?

## Quirks for a human to mark
- Swap keeps the sets already logged, as the web does, so sets logged as Row then show as Press.
- In a program, an exercise with no plan counts as "all logged" at once, so the bar shows + Extra set / Next straight away. This follows the web.
- The web's program logger opens the last added exercise; freestyle opens the first. The tests follow the feature (first).
- The reps stepper has no upper bound, but its keypad stops at 999.
- After a log, the web's program logger fills the form slightly differently from freestyle. The tests use the freestyle rule (`planFormValues`) for both.

## Risk: this replaces WorkoutView.swift
- No UI test target exists. The RipitCore tests don't depend on the layout. Review harnesses that tap "LOG" by index will break.
- Debug hooks tied to the old layout:
  - `demoFocusWeight`, `demoRemove`, `demoUseLastTime` and `demoHelp` key on the first card (`isFirst`, `WorkoutView.swift:297-300`).
  - `demoDiscard`, `demoFinish`, `demoFinishNow` and `pickerQuery` (`:99-102`).
  - `demoEditFlow` (the exercise sheet).
- Code that goes with the old layout:
  - `SupersetRun.runs` (also used by `HistoryView`, so keep it);
  - the system decimal keyboard and its replace-on-type logic (`:309`, `:342`);
  - "Minimize workout" (`:86`).

## Not verified
- The fake stores today's order in a session table, which is only one design. Other readers have no tests against hidden or moved exercises: history counts, the rollup, Last time and export.
- Untested: a swapped program exercise's planned sets, and the effort grid (slice 5's preset tests cover it).

## Locked
- `chmod a-w` on the three `Logger*Tests.swift` files and `logger.json`. Unlock with `chmod u+w`.

## Cleanup (not deleted)
- `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/707310fc-29e3-4c90-9e11-412a87689aff/scratchpad/f203/`: the fake, the source backups, `breaks.tsv`, `run.sh`, logs.
