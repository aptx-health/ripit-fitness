Report: complete

## Verdict
Fixed. The picker's Create / Add bar now has a background that runs to the bottom edge of the screen, and no rows scroll beneath it. The buttons stay above the home indicator. I reproduced the bug before the fix and checked the result after it on `ripit-impl` (iPhone 17 Pro), in RIPIT dark at default and largest text. Nothing is committed.

## Verified
- `mise run ios-check` exits 0. 263 tests pass and the app builds. `git diff -- ios/RipitCore/Tests` is empty.
- Real taps: a scratch XCUITest (`Walk197Tests`, no repo edits) opens Add exercises from an ad-hoc workout, drags the list mid-scroll, and takes a screenshot. 2 tests, 0 failures, run once before the fix and once after.
  - Before: rows show below the bar, in the home-indicator strip. This matches Dustin's phone.
  - After: that strip is solid background with the home indicator showing. A row is cut off at the bar's top divider.

## Cause
`.safeAreaInset(edge: .bottom)` places the bar above the bottom safe area. Its `.background(Theme.background)` stopped at the bar's own edge, so the strip below it showed the list.

## Files changed
- `ios/App/Theme.swift`: a new `View.bottomBar { … }` modifier, under "MARK: - Bottom bar", with a doc comment.
  - It uses `safeAreaInset(edge: .bottom, spacing: 0)`, the same padding, and a top `RowDivider`.
  - Its background is `Theme.background.ignoresSafeArea(edges: .bottom)`.
  - The comment says to use it for every fixed bottom bar, including slice 9's tab bar and the ‹ Log › bar.
- `ios/App/ExercisePickerView.swift`: the bar now uses `.bottomBar { bottomBar }`. Its own padding and background moved into the modifier.

## Sweep
I checked every view in `ios/App`: the logger, editor, summary, program builder and editor, library, history, progress, settings, help sheet and `ChoiceSheet`. Only the picker has a pinned bottom bar. The rest are plain `ScrollView`s, and their actions are toolbar items or inline buttons. The tab bar is the system `TabView`. Nothing else needed fixing.

## Not verified
- Light mode and other themes. The fix uses `Theme.background`, which is the same token the bar used before.
- The bar with the keyboard up. The background extends behind the keyboard, which looks the same as before.

## Screenshots
In `initiatives/ios-app/handoff/slice8-assets/`:
- `fix197-before-dark-scrolled.png` and `fix197-after-dark-scrolled.png`
- `fix197-before-dark-xxxl-scrolled.png` and `fix197-after-dark-xxxl-scrolled.png`

## Cleanup (not deleted)
- In the scratchpad: `ui/UITests/Walk197Tests.swift`, `phase197.txt` and `shots197/`, which holds copies of the screenshots.
- Simulator `ripit-impl` (kept).
