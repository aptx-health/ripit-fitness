Report: complete

## Verdict
All ten points and the small one are done. `mise run ios-check` exits 0 with 351 tests; the locked `Logger*Tests` files are unchanged. Each point was checked by real taps on `ripit-impl` in Blossom dark, RIPIT dark and at AX5. Nothing is committed.

## Shots (in `handoff/slice9b-assets/`, untracked)
- `fix206-blossom-logger.png` (Blossom dark): the logger, the weight keypad, the RIR grid with RIR 2 picked, after the planned sets, and after + Extra set. Covers points 2, 4, 5, 6 and 7.
- `fix206-ripit-logger.png` (RIPIT dark): the same views.
- `fix206-ax5.png` (AX5, RIPIT and Blossom): the logger, the keypad, and the bar after the planned sets. Covers points 3 and 6.
- `fix206-confirms-tabs.png`: the plan sheet's Add exercise, the Exit dialog in both themes, and the tab bar in both themes. Covers points 7 and 8.
- `fix206-order-superset.png`: the saved workout in today's order, then a program superset before, after a delete and after a swap. Covers points 1 and 9.

## Point by point
1. **Saved order:** `writeSessionOrder` also rewrites `"order"` on the workout's own rows. By taps: Band Row was dragged to the top, then finished and saved; the saved workout reads Band Row, Bench, Squat. New store test `SessionOrderSaveTests.swift` (reorder, finish, save, start again).
2. **After the planned sets:** the inputs give way to "✓ ALL PLANNED SETS LOGGED". The title reads "3 OF 3 DONE" and Prescribed hides. + Extra set brings the form back with "SET 4".
3. **AX5 bar:** the bar is capped at `xxLarge`, like the header, and "+ EXTRA SET" and "NEXT EXERCISE" now show whole.
4. **LOG SET centred:** the blank placeholder line is gone, so the label is centred with or without its detail line.
5. **Weight and RIR aligned:** one `Grid`, with the labels on a shared baseline. Both boxes measure y = 620 by XCUITest. RIR got a gauge icon to match Weight's.
6. **Inputs at the bottom:** at default sizes, the reps, weight, effort and warm-up inputs, or an open keypad, are pinned at the bottom of the panel. Title, Last time and the sets scroll above them. At the accessibility sizes, pinning would leave no room, so everything scrolls as one, with the inputs last and pushed to the bottom when there is space.
7. **Accent confirms:**
   - These now use the accent: keypad DONE, the selected RIR/RPE preset, the bar's Next exercise and Add exercise, and the plan sheet's Add exercise.
   - The dialogs use `.tint(accent)`; Keep as draft is pink in Blossom, and Discard stays red.
   - FINISH stays green, both in the header and in the bar.
8. **Inactive tabs at 80%.** Computed label contrast (muted-foreground over muted), 80% / 60%:
   - Dracula light: 1.71 / 1.50
   - Dracula dark: 2.44 / 1.95
   - Forest light: 2.55 / 1.96
   - Catppuccin light: 2.92 / 2.15
   - GitHub light: 3.33 / 2.34
   - GitHub dark: 3.13 / 2.36
   - Clyde light: 3.34 / 2.35
   - Clyde dark: 3.16 / 2.42

   GitHub and Clyde now clear 3:1. Dracula, Forest light and Catppuccin light still don't. Dracula light is only 1.94 even at 100%, so its `muted-foreground` token itself is low.
9. **Lone superset, program, today only:**
   - The rule is applied when the workout is read: `detail()` drops the group from an exercise whose group appears only once today.
   - A swapped program exercise's copy now starts in no superset.
   - By taps: deleting Bench, or swapping it for Overhead Press, leaves Barbell Row with no badge.
   - Tests check that the program and the next session still have A/A.
10. **Empty exit:** unchanged.
- **Small:** on an empty freestyle workout, VoiceOver now reads "Plan, no exercises".

## Verification
- `mise run ios-check`: exit 0, 351 tests in 60 suites; 4 tests were added in a new file.
- Scratch XCUITest, all passing:
  - the 206 runs G1 to G4, H, I1 and I2;
  - 204's A, B, C, D, E and F1 to F4 as a regression check.

  C first failed only because my harness looked for the old empty-plan label. After fixing the harness, it passes.

## Decisions beyond the item
- **Pinned inputs at default sizes (6):** my first try kept everything in one scroll with a spacer. With three planned sets, that pushed Warm-up below the fold, so the inputs are now pinned instead.
- **Accent beyond DONE (7):** I read "every other confirm" as every filled button except FINISH, so Next exercise and Add exercise changed too. The green on the reps + button and on the plan's NOW and done markers is status, not a confirm, so it stays.
- **Lone superset (9):** the rule is applied when the workout is read, with no schema change. It applies to every workout, but freestyle workouts already ended lone supersets when saving them, so they show nothing new.
- **Extra tests:** the item allowed the save-order test. I also added three store tests for point 9 in the same new file.

## Open questions and risks
- **Contrast (8):** Dracula, Forest light and Catppuccin light tab labels are still under 3:1 at 80%. The remaining fixes are to dim only the icon, or to adjust those themes' `muted-foreground`.
- **AX5 bar height:** the bar's buttons still grow to about 145 pt at AX5. Their height comes from a `@ScaledMetric` outside the type cap. This predates 206.
- **Hidden sets at default sizes:** with many sets, the list scrolls behind the pinned inputs, and a row can sit half-hidden at the edge.
- **Not checked:** haptics; VoiceOver on a device (labels only); E-ink and the other 11 themes in the logger. Dialog tint was seen in Blossom and RIPIT dark only.

## Outside the item (not fixed)
- 205's items still stand: the wrong Info text for Bench, the history count of empty exercises, and the elements under the logger cover.

## Files changed
- `ios/RipitCore/Sources/RipitCore/Logger.swift`: order rewrite, and the swap copy starts in no superset.
- `ios/RipitCore/Sources/RipitCore/AppDatabase.swift`: the lone-group rule in `detail()`.
- `ios/RipitCore/Tests/RipitCoreTests/SessionOrderSaveTests.swift` (new).
- `ios/App/LoggerPanel.swift`: the layout, the banner, "n OF n DONE" and the grid.
- `ios/App/WorkoutView.swift`: the bar, the dialogs' tint, the label and `extraSet` passed through.
- `ios/App/LoggerKeypads.swift`, `ios/App/PlanSheet.swift`: accent.
- `ios/App/Shell.swift`: 80%.

## Cleanup (not deleted)
Everything below is under `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/e9f080b5-ff6a-4d7e-a064-2354f3951486/scratchpad/`:
- `ui/`: the harness, now with `Fix206Tests.swift`;
- `uidd/`: the harness build output;
- `shots206/`;
- `contrast/`: a scratch Swift package that computes the tab contrast;
- the `*.log` files.

`ripit-impl` is still booted.
