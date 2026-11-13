Report: complete

## Verdict
Checks out. All three changes are in, `mise run ios-check` exits 0 with the tests unchanged, and, scrolled to the end, every screen's last row sits above the bar at default size and at AX5, in dark and light. Nothing is committed.

## Verified
- `mise run ios-check`: exit 0, 286 tests pass, and the app builds. `git diff ios/RipitCore/Tests` is empty.
- **Real taps on `ripit-impl`** (scratch `Walk201Tests`, no repo edits). Each screen is swiped to its end. The walk then asserts that no text, button, image, switch or field reaches below the top of the bar, and saves a shot.
  - **Screens:** Training, History (pushed), Library › Workouts, Library › Programs, a program (pushed), Progress and Settings.
  - **Runs:** dark and light, each at default size and at AX5. All pass.
  - **The last row and how far it ends from the bar's top (778):** Settings' Version and a program's Archive end at 766 (12 pt clear). At AX5, History's Import ends at 766.
  - **AX5 History:** the full walk couldn't reach "See all" at AX5 (a harness problem), so a second test opens History directly with `-demoHistoryTab`. It passes in both modes.
- **Shots:** `initiatives/ios-app/handoff/slice9-assets/fix201-{dark,light}-{default,ax5}-*.png`, 28 in total. The folder is gitignored, so they are local only.
- **The walk also asserts:** Training has no "Programs" or "Ad-hoc workout" button.

## Not verified
- The keyboard rule wasn't re-walked. The margin drops to 0 while the keyboard is up, the same rule as before.
- iOS 26 (only iOS 27.2 was run).

## What changed
1. **The bar covers list ends:** the inset on the TabView, and one on each NavigationStack, never reached the scroll views. Each tab's stack now sets `.contentMargins(.bottom, 58)` (the bar's height). That setting passes down the environment, so pushed screens get it too (`Shell.swift`, `tabBarInset`).
2. **Text shows through the bar:** the fill is now an opaque `Theme.muted` (it was 95%) (`RipitApp.swift`).
3. **Training's buttons:** "Programs" and "Ad-hoc workout" are removed (`TrainingView.swift`). No debug flag or hook used them, so nothing else had to move.

## Decisions beyond the handoff
- None.

## Outside the item (not fixed)
- At AX5 the Progress chart's "Last 8 weeks" axis labels squash into "…" (visible in `fix201-*-ax5-progress.png`).
- Library's empty Workouts state still has a "Start an ad-hoc workout" button. Dustin's change named only Training's buttons.

## Cleanup (not deleted)
- The scratchpad `e308e4c0-…/scratchpad/`: `ui/`, `s201/`, `check201.log`, and `misnamed201/`. That last folder holds 21 shots I first saved under the wrong names, from a shell loop slip, and then moved out of `slice9-assets`.
