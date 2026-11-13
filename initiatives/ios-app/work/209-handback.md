Report: complete

## Verdict
Points 1 to 5 are fixed and checked by real taps on `ripit-impl`. Point 6 (the Swap idle wait) didn't come back in 6 swaps, so it is unfixed (see below). `mise run ios-check` exits 0 with 352 tests; one test was added. Nothing is committed.

## Point by point
1. **Dialogs in the accent.**
   - System dialogs take the window's tint. So the root `.tint` in `RipitApp.swift` is now `accent` while the logger is up and `primary` otherwise. The view-level `.tint` in `WorkoutView` is gone.
   - By taps: RIPIT's Keep as draft and Finish are yellow. Blossom's are purple, like DONE and LOG SET. Discard stays red.
   - **Plan sheet (not changed):** its pink frame and tab come from the shared `FolderTab` active tone (`primary`), which every folder in the app uses. That isn't the confirm-colour question. Changing it here alone would make this folder differ from the rest. Still open: does Dustin want the logger's folders in the accent?
2. **AX5 after the planned sets.**
   - At the accessibility sizes, the banner now takes the inputs' place at the bottom, and the panel scrolls to it when it appears.
   - By taps, after 3 sets at AX5: the banner is at y 424 on an 874-pt screen and is hittable. Before the fix it was off screen, at y 1347.
   - Default sizes are unchanged: the banner stays above the sets, as on the web.
3. **Faint themes, iOS only.** `Palette` in `Theme.swift` overrides `muted-foreground`. The generated `theme-tokens.json` and the locked token tests are untouched. Hue and saturation are kept; only lightness changed.

   | Theme | Old | New | 80% over `muted` (old → new) |
   |---|---|---|---|
   | Dracula light | #6272A4 | #9EA8C7 | 1.71 → 3.06 |
   | Dracula dark | #6272A4 | #7986B1 | 2.44 → 3.07 |
   | Forest light | #6B7F73 | #5C6D63 | 2.55 → 3.07 |
   | Catppuccin light | #5C5F77 | #585A71 | 2.92 → 3.08 |

   The token is used for all secondary text in those themes, not just the tabs. Dracula light's text is the biggest change: it is visibly lighter.
4. **E-ink tab:** the fade block is gone when the E-ink theme is on. The active tab shows only its bold underline.
5. **Finish summary order.**
   - When today's order was changed, the rollup now lists exercises in today's order (`SavedWorkoutsStore.rollup`).
   - With no reorder, it lists them in the order they were logged, as the web does, so the web-golden rollup tests are unchanged and pass.
   - New test in `SessionOrderSaveTests.swift`, covering both cases.
   - By taps: I logged Bench, Squat and Row, then moved Row to the top. Workout complete lists Band Row, Bench, Squat.
6. **Swap idle wait: not reproduced, not fixed.**
   - What the 350 ms delay is for: the row menu's Swap item closes the plan sheet so the picker can open. The delay lets the menu's own close animation finish first, so the two dismissals don't overlap.
   - Possible cause: on a loaded simulator, 350 ms may sometimes be too short. Then the dismissals overlap and an animation never finishes, which XCUITest sees as a 60 s wait for idle.
   - In 6 swaps in a row in a program session, the next tap took 1.5 s each time. With no failing case, I didn't change the timing.
   - A possible fix, not tried: replace the fixed delay with opening the picker from the sheet's `onDismiss`, after the menu has closed.

## Shots (`handoff/slice9b-assets/`, untracked)
- `fix209-dialogs.png`: Exit and Finish in RIPIT dark and Blossom dark, and the Blossom plan sheet.
- `fix209-ax5.png`: the logger at AX5, and the view right after the last planned set.
- `fix209-tabs.png`: the bar in Dracula light, Dracula dark, Forest light, Catppuccin light and E-ink, with Training, Progress and Settings selected.
- `fix209-summary.png`: the reordered plan list and the summary.

## Not checked
- The E-ink theme's dark mode and the E-ink display setting; I checked only E-ink light.
- Haptics, and VoiceOver on a device.
- I didn't compute contrast for themes other than these four.

## Outside the item
- 205's leftovers still stand.
- At default size, a set row can still sit half-hidden behind the pinned inputs.

## Files changed
- `ios/App/RipitApp.swift`: root tint.
- `ios/App/WorkoutView.swift`: view tint removed.
- `ios/App/LoggerPanel.swift`: AX5 banner position and scroll.
- `ios/App/Theme.swift`: `muted-foreground` overrides.
- `ios/App/Shell.swift`: no block in E-ink.
- `ios/RipitCore/Sources/RipitCore/SavedWorkoutsStore.swift`: rollup order.
- `ios/RipitCore/Tests/RipitCoreTests/SessionOrderSaveTests.swift`: one test added.

## Cleanup (not deleted)
In `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/e9f080b5-ff6a-4d7e-a064-2354f3951486/scratchpad/`:
- `shots209/`
- `ui/UITests/Fix209Tests.swift`
- `ui209.log`, `ui209b.log`, `check209.log` and `check209b.log`

`ui/UITests/Base.swift` now writes its shots to `shots209`. `ripit-impl` is still booted.
