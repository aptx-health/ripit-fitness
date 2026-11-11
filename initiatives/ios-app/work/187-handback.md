Report: complete

## Verdict
All six fixes from review 186 are in and checked by real taps in the simulator. Slice 7 is ready to accept. Nothing is committed.

## Verified
- `mise run ios-check` → 241 tests passed, app build OK, exit 0. 184's test files and `tokens.json` are unchanged (no diff under `ios/RipitCore/Tests`).
- **Scratch XCUITest walk** (simulator `ripit-185-impl`, fresh install for the E-INK walk): 16 of 16 checks pass.
  1. **Color scheme from the theme:** DOOM, CYBER, SYNTHWAVE '84 and DRACULA in "light" mode now get a white status bar, a dark tab bar and dark switches. RIPIT light still gets a black status bar. → `ios187-fix1-dark-themes-light-mode.png`
  2. **Leaving E-INK restores the mode:** RIPIT dark → E-INK → RIPIT lands on **Dark**. RIPIT light → E-INK → OKABE lands on **Light**. E-ink display stays off. → `ios187-fix2-3-eink-restores-mode.png`
  3. **The theme list keeps its place:** after picking E-INK or OKABE at the bottom, the list comes back with that row in view (same sheet).
  4. **E-INK black text and borders:**
     - Turned black: the folder box borders (Pinned, Up next, Report card, Records), "STRENGTH BASE", "+1h 30m" and the other Progress changes, the pins, check marks, outline buttons and the week arrows (the app tint).
     - Fills keep their color (tabs, buttons, switches, chips), as on the web.
     - → `ios187-fix4-eink-vs-web.png` (web, then iOS, for Training, Progress and Library)
  5. **Inline titles scale:** at AX5, "THEME" and "PROGRAMS" are about 1.5× their default size (capped at 30pt so they still fit the bar). → `ios187-fix5-titles.png`, `ios187-fix5-titles-crop.png`
  6. **Hint:** it now reads "Makes text bolder for e-ink screens", with no mention of animation.
- All the sheets are in `initiatives/ios-app/handoff/slice7-assets/ios187-*` (git-ignored).

## Not verified
- If no mode was saved (an E-INK user from before this build), leaving E-INK falls back to the device's own appearance, as the web does. I didn't test that path by taps.
- Changing the OS text size while the app runs: the titles rescale through a rebuild. I only tested sizes set at launch.
- I didn't run `perf-check`. The change adds no work per frame.

## Decisions beyond the handoff
- **The remembered mode** is stored in UserDefaults under the web's key name, `themeModeBeforeLightOnly`. It lives in `SettingsModel.pickTheme`, not in RipitCore's `SettingsStore`, so 184's API is untouched.
- **Dark or light** is measured from the background's relative luminance (< 0.5 is dark), in `Look.isDark`.
- **The E-ink color rule** goes through two helpers, `Theme.text(_:)` and `Theme.edge(_:)`. `TabTone.edge`, `OutlineButtonStyle` and the root tint use them, and so do about 15 call sites that colored text or icons directly.
  - Chart marks and translucent tints are left as they were. The web draws those solid on E-INK; that wasn't in this item.
- **Title cap:** inline titles grow to at most 30pt and large titles to 52pt. A bigger inline title would truncate in the bar.
- The E-ink display switch's motion code (the root `.transaction`) stays as it was, as Dustin asked. Only the hint changed.

## Outside the item (not fixed)
- `SettingsView.swift`'s `HelpLinks` comment still says the feedback email is "Not confirmed by Dustin". Commit 92778bb2 confirmed it, so the comment is stale.

## Where to look first
- `ios/App/Theme.swift`: `Look.isDark`, `Look.setTextSize`, the scaled titles, `Theme.text` and `Theme.edge`.
- `ios/App/SettingsView.swift`: `SettingsModel.pickTheme`, and `ThemePickerView`'s `ScrollViewReader`.
- `ios/App/RipitApp.swift`: `preferredColorScheme(lookIsDark …)`, and the text size in `lookKey`.

## Files changed
- `Theme.swift`, `SettingsView.swift` and `RipitApp.swift`.
- The color call sites in `ExerciseHelpSheet`, `LibraryView`, `LoggingHelpViews`, `ProgramViews`, `ProgressTabView`, `SummaryView`, `TrainingView` and `WorkoutView`.

## Cleanup (not deleted)
- Simulator `ripit-185-impl` (still booted; content size set back to Large).
- Scratchpad `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/690bd726-172a-46d9-a380-7c6304e3b4c4/scratchpad/`: `ui/UITests/Walk187Tests.swift`, `shots/187/`.
