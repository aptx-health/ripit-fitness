Report: complete

## Verdict
Done. The contract `ios/RipitCore/Sources/RipitCore/NavShell.swift` has stubs only, and the 23 tests are in `ios/RipitCore/Tests/RipitCoreTests/NavShellTests.swift`. The hands-on list below covers the UI-only parts. Every scenario maps to a test, the list, or both. Nothing is committed.

## Verified
- `mise run ios-check`: 286 tests, 55 issues. Every issue is `notImplemented` and in `NavShellTests.swift`; everything else passes. One shape test, "There is no History tab", passes already. ios-check stops at the test step, so I ran xcodegen and the simulator build separately: the app builds.
- Scratch fake (a correct `NavShell.swift`, swapped in, then restored byte for byte): all 23 pass.
- Break matrix, run against targeted `--filter`s with one full baseline: **43 of 43 breaks caught**. Groups: bar order, labels and pop to root (4); tab placement and after-summary (5); chip label, fallback and pulse vs E-ink or Reduce Motion (6); draft-only menu (6); Continue subtitle, target and no program (7); saved row: 0 / 1 / n, target, order (5); discard/footer leaking into the no-draft menu (2); discard window: inclusive, 3 s, 5 s, no re-arm, expired still discards, stays armed, reset does nothing (8).
- Changing one expected value ("Day 1" to "Day 2") failed only that case.

## Not verified
- No golden: the web's rules are inline JSX, so the expected values are cited line by line in the test header. There is no coverage tool for the reference.
- Not covered: a saved count below 0, the web's "Loading…" (the phone reads locally) and the follow-along heads-up (out of scope, item 196).

## Scenario map
| Scenario | Tests | Hands-on |
|---|---|---|
| Bar looks and reads like the web's | barOrder, labels | look, accent, safe area |
| Each tab keeps its place | popToRoot, switchTab | per-tab state |
| History under Training | noHistoryTab, placed | Recent, See all, import, in-progress card |
| Programs under Library | placed | Workouts \| Programs |
| Quick actions, no open workout | allThree, savedCount, noProgram, continueSubtitle | card look |
| Quick actions, open workout | draftOnly, draftNoName, DiscardConfirm suite | red Confirm |
| Start or resume | targets in the menu tests | each lands right |
| Workout button shows an open workout | NavShellChipTests | pulse visible |
| Largest text, VoiceOver, keyboard | – | all |
| After finishing a workout | afterSummary | lands on Training |

## Hands-on list for the reviewer (iPhone sim, phone width, light and dark)
1. **Look:** Training · Library · raised WORKOUT chip · Progress · Settings. Only the active tab is in the accent colour (no pill). The chip is lifted, has a hard bottom edge, and presses down. Compare with web `web-tab-*.png`.
2. **Safe area:** the bar's background fills the home-indicator strip, and no list rows show beneath it. Scroll a long list on every tab.
3. **Per-tab state:** open a program in Library, go to Progress and back, and the program is still open. Tap the active tab and it returns to its root. Do the same in Training. Pushed screens must not bring back Apple's tab bar (check on iOS 18 and 26).
4. **History:** there is no History tab. Training › Recent has "See all", which opens the full list. The import button and the in-progress card can still be reached.
5. **Library:** Workouts | Programs. Programs lists them as Training did before.
6. **Quick actions:** a card with a dim backdrop, floating above the bar. It closes with ✕ or a backdrop tap. With no program, Continue is greyed out. Continue opens the logger on the next workout, Freestyle opens an empty logger, Resume opens the open workout, and Saved opens Library › Workouts.
7. **Discard:** the first tap shows a red "Confirm". Wait over 4 s and it reverts. Two quick taps discard. Close and reopen the card, and it is not armed.
8. **Pulse:** the chip pulses only with an open workout, and stops with Reduce Motion or E-ink display on.
9. **AX5:** the bar keeps its height and labels don't wrap. A long press on a tab shows the large content viewer.
10. **VoiceOver:** each tab is a button and reads selected or not. The chip reads "Quick actions", or "Resume draft workout: {name}" with an open workout.
11. **Keyboard:** type in a field on a tab screen (the Settings weekly target, a search), and the bar does not ride up over the keyboard.
12. **After the summary:** finish a workout, close the summary, and you are on Training.

## Decisions beyond the handoff
- The discard is armed while less than 4 s has passed. At exactly 4 s it is disarmed, and that tap arms it again. On the web this is a timer race.
- The chip's no-draft label is the web's "Quick actions", not the "Workout, quick actions" that item 196 guessed.

## Quirks for a human to mark
- An open freestyle workout that has a name (a started saved workout or a repeat) is titled "Freestyle workout" in the card, but the chip reads "Resume draft workout: Push Day". The web does the same. Intended?
- With no name, the fallback is the web's "Open Workout", not the phone's current "Ad-hoc workout".

## Outside the item (not fixed)
- ios-check uses `set -e`, so with failing tests the app build never runs. The build has to be checked separately.

## Locked
- `chmod a-w ios/RipitCore/Tests/RipitCoreTests/NavShellTests.swift`. Unlock with `chmod u+w`.

## Cleanup (not deleted)
- `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/707310fc-29e3-4c90-9e11-412a87689aff/scratchpad/f198/`: the fake, the stub backup, the tests backup, `breaks.tsv`, logs.
