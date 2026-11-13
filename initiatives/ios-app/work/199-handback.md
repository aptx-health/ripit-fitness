Report: complete

## Verdict
Checks out, with adjustments. 198's 23 tests pass unchanged, `mise run ios-check` exits 0, and a scratch XCUITest walk on `ripit-impl` passes 9 of 9 at default text size. Nothing is committed.

## Verified
- `mise run ios-check`: exit 0, 286 tests pass, and the app builds. `git diff ios/RipitCore/Tests` is empty, and `NavShellTests.swift` is still read-only.
- Real taps: a scratch walk (`Walk199Tests`, no repo edits) at default size and at AX5, in dark and light, on the Ripit and E-ink display settings. Each step was checked with an assertion and a screenshot:
  - **Bar:** order and labels; only the active tab is selected (`isSelected`); Apple's tab bar never shows, even on a pushed screen; the bar keeps its height at AX5; the home-indicator strip is filled.
  - **Per-tab state:** a program opened in Library survives a trip to Progress, and tapping Library again pops it. Training › Recent › See all › a workout, then tapping Training, pops both.
  - **History and Library:** History has the import button. Library shows Workouts | Programs. Training's active program opens in Library.
  - **Quick Actions without a draft:** all three rows, closing on a backdrop tap, Saved going to Library › Workouts, Continue opening Upper A. With no program, Continue is disabled and Freestyle opens an empty logger.
  - **Quick Actions with a draft:** the chip reads "Resume draft workout: Upper A", the card shows only the resume row and the footer, and the first discard tap arms Confirm. Confirm reverts after 5 s, isn't armed after a reopen, and a double tap discards.
  - **After the summary:** a finish started from Library, then Done, lands on Training.
  - **Keyboard:** typing in Edit Program's name field leaves the bar under the keyboard.
- The glow pulse can be seen in the shots (`*-21-chip-draft`, `*-80-light-draft`).

## Not verified
- **Large content viewer:** I couldn't capture it, because the XCUITest press ends before the screenshot is taken. Please check it by hand.
- **Reduce Motion:** the OS setting isn't tested. Its rule is unit-tested, and E-ink display was walked.
- **AX5 walk:** 2 of the 18 checks failed, both in the harness. A tap landed on a folder tab that sat under the bar, and the same step passes at default size.
- **iOS 26:** only iOS 27.2 (`ripit-impl`) was run.

## Scenario map
Same as 198's map. Every hands-on item is covered above except the long press, the Reduce Motion toggle and iOS 26.

## Files changed
- `RipitCore/.../NavShell.swift`: the stubs filled in.
- `App/Shell.swift` (new): the `Shell` nav model, `RipitTabBar`, the chip (pulse and shine), `QuickActionsOverlay`, `KeyboardState` and `openWorkout`.
- `RipitApp.swift`:
  - one stack per tab, each hiding Apple's bar;
  - the bar attached with `bottomBar`;
  - the summary's Done goes to Training, and "Open Library › Workouts" still goes to Library.
- `Theme.swift`: `bottomBar` takes a fill, padding and edge width (the defaults are unchanged).
- `TrainingView`, `HistoryView`, `LibraryView`, `ProgramViews`: History is pushed from Recent, and programs live in Library.
- `WorkoutView`: "Back to history" is now "Minimize workout".
- `DebugHooks`: the flags are updated, plus new `-demoQuickActions` and `-demoLibraryPrograms` flags.

## Decisions beyond the handoff
- **Keyboard:** the bar hides while the keyboard is up, as Apple's does, instead of `.ignoresSafeArea(.keyboard)`, which would stop tab screens from avoiding the keyboard.
- **Training's Pinned | Recent block:** it always shows now (the web hides it when empty), so See all and the import button can be reached on a fresh install.
- **Ripit theme:** it gets the web's 3px gold underline under the active tab (`globals.css:2435`), and the E-ink theme gets a bold underlined label.
- **Quick Actions card:** text is capped at accessibility1 and titles wrap. At AX5 it otherwise truncated and covered the screen.
- **Programs tab:** no "Browse" sub-tab, because the phone has no community programs.
- **Training's "Programs" button:** kept, and it now opens Library › Programs.

## Open questions
- Should Training's "Programs" and "Ad-hoc workout" buttons go? They're now redundant with Library and Quick Actions.
- Is the web's "Freestyle workout" title wanted for a named freestyle draft? This is the same quirk 198 raised.

## Where to look first
- `ios/App/Shell.swift`: `RipitTabBar` and `QuickActionsOverlay`.
- `ios/App/RipitApp.swift`: the TabView, the bottom bar and the summary's onDismiss.

## Cleanup (not deleted)
- The scratchpad `e308e4c0-…/scratchpad/`: `ui/` (harness and derived data), `shots199/` and `check.log`.
