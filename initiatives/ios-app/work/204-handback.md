Report: complete

## Verdict
Checks out, with adjustments. 203's tests pass unchanged, including the program add-order bug. The new one-exercise logger, the "Lit block" tab bar and the plan-list supersets are built. Each hands-on item was checked by real taps on `ripit-impl`, at default size and AX5, in dark and light. Nothing is committed.

## Not verified
- **Haptics:** the simulator gives no haptic, so the light tap on Log set and the selection tick on tab change are in code only.
- **Reduce Motion / E-ink:** not toggled. The swipe nudge and the tab nudge check `DisplayRules.reducedMotion`, and the root `.transaction` already turns animations off.
- **Motion:** the tab bar's sliding marker and the page nudge were seen only in still shots, not as motion.
- **Program screens:** program reorder, swap and delete were tapped only in freestyle. In a program they use the same UI, and 203's store tests cover program scope.
- **Not tapped:** the Notes tab (the seed has no notes), Create custom exercise and the custom-exercise edit (the picker opens, but those flows were not run), and VoiceOver (only labels were read through XCUITest).

## Summary
- **Core:** `Logger.swift` bodies are written.
- **Today-only order (Schema v6, `sessionExercise`):** this table holds today's order and the program rows hidden today. `detail()` reads it, and so does `insertOneOff`, which fixes the add bug.
- **Program swap:** today gets its own copy of the exercise, with the plan's sets and today's logged sets. The program row is hidden for today.
- **UI:** `WorkoutView.swift` is rewritten. It is split into `LoggerPanel`, `LoggerKeypads`, `PlanSheet` and `WorkoutStore+Logger`.

## Scenario → test map
| Scenario | Tests | Hands-on |
|---|---|---|
| One exercise, header, tabs | — | A, F1–F4 |
| Bar, ‹ › ends, home strip | bar tests, canLog | A, F |
| Swipe | swipe golden | B (short, diagonal, ends, keypad open) |
| Log set (stay, keep weight, next plan, rest) | form-after-log golden | A, E |
| After planned sets / header Finish | bar tests | A, F |
| Keypads, bar hides | keypad goldens, weight keypad | A (132.5; Cancel restores; Done keeps) |
| Freestyle empty: Add exercise only | bar test | C |
| Plan list, jump | plan row, badge | C |
| Reorder / swap / delete / add | store and landing tests | C |
| Supersets (group, ungroup, badge) | superset store tests | C |
| Exit (empty deletes; keep as draft) | exit tests | C, D |
| Slices 5–8, AX5 | existing suites | E, F3, F4 |

## Files changed
- `ios/RipitCore/Sources/RipitCore/Logger.swift`: the rule and store bodies.
- `Schema.swift`: migration v6.
- `AppDatabase.swift`: today's order and the add order.
- `Programs.swift`: a swapped exercise keeps its planned sets.
- `ios/App/WorkoutView.swift`: the screen, the bar, the swipe catcher and the dialogs.
- `LoggerPanel.swift`, `LoggerKeypads.swift`, `PlanSheet.swift`, `WorkoutStore+Logger.swift`: new files.
- `Shell.swift` and `RipitApp.swift`: the Lit block marker, the dimmed tabs, the haptic and the page nudge.
- `Theme.swift`: tokens `accentMuted`, `success`, `successForeground` and `secondaryActive`.
- `ExerciseHelpSheet.swift`: the sheet is gone; the Info and History contents are reused in the tabs.
- `LoggingHelpViews.swift`: the clock takes a colour.
- `DebugHooks.swift`: the comments now say what each remapped hook does.

## Verification
- `mise run ios-check`: exit 0, 347 tests passed; the app builds.
- The `Logger*Tests` files and `logger.json` are unchanged and still read-only.
- The scratch XCUITest run on `ripit-impl` passed 9 of 9. Its scenarios are A, B, C, D, E and F1–F4.

## Decisions beyond the handoff
- **Header colour:** the header, the tabs and the panel border use `secondary`, as the web does (`ExerciseLoggingHeader.tsx:66`). With `primary`, the green FINISH disappeared into a green header.
- **Exit with nothing logged:** it leaves at once and shows no dialog, as in 203's hands-on item 7. The web asks first.
- **Swap and Add from the plan:** the plan sheet closes first, then the picker opens.
- **Swap's 350 ms delay:** Swap waits 350 ms for its menu to close. Without the wait, every following tap waited about 60 s for the app to go idle, because an animation never completed.
- **Swipe:** a window-level UIKit pan reads it. SwiftUI's drag never fired over the panel's scroll view.
- **Warm-up after a log:** the Warm-up toggle follows the next planned set's warm-up flag.
- **Save set:** a tapped logged set is changed through the bar's SAVE SET.

## Open questions and risks
- **Lone superset badge in a program session:** deleting one exercise of a plan superset leaves "Superset A" on the other. Ungrouping is freestyle only.
- **AX5 panel height:** at AX5 the header, tabs and bar leave little room for the panel. It scrolls, but Dustin should look at it on the phone.
- **Readout taps:** a drag of under about 20 pt that starts on a readout counts as a tap and opens its keypad. That is ordinary button behaviour.
- **Other readers of `sessionExercise`:** export, the rollup and history counts still read the program's rows, not the session table. Sets are moved or deleted, so the numbers hold.

## Where to look first
- `ios/RipitCore/Sources/RipitCore/Logger.swift` (the Store section): the today-only design.
- `ios/App/WorkoutView.swift`: `log(_:)` and `SwipeCatcher`.
- `ios/App/PlanSheet.swift`: the swap delay comment.

## Cleanup (not deleted)
`/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/e9f080b5-ff6a-4d7e-a064-2354f3951486/scratchpad/` holds:
- `ui/`: the harness;
- `uidd/`: the harness build output;
- `shots/`;
- the `*.log` files.
