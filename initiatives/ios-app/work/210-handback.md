Report: needs decision

## Verdict
Accept 209. All five fixes pass by real taps on `ripit-review` at HEAD a68bc2ea, and `mise run ios-check` exits 0 with 352 tests. Nothing needs fixing. Dustin has one colour call to make (the plan sheet), and the idle wait after a picker came back once in this pass, with a better clue than before.

## Point by point
1. **Dialogs in the accent: pass.**
   - RIPIT dark: Exit's "Keep as draft" and Finish's "Finish" are yellow, like DONE and LOG SET. Blossom dark: they're purple.
   - "Discard workout" stays red. The dialogs' Cancel takes the accent too, because it's a system button.
   - Outside the logger, the tint goes back to `primary`. After Keep as draft, Settings' toggles and selected pills are green in RIPIT.
   - Shot: `review210-dialogs.png`. Top row is RIPIT (Exit, Finish, keypad, Settings afterwards); bottom row is Blossom (Exit, Finish, keypad, plan sheet).
2. **AX5 after the planned sets: pass.**
   - In RIPIT and Blossom at AX5, "✓ ALL PLANNED SETS LOGGED" sits at the bottom, at y 424 on an 874-pt screen, and is hittable. Before 209 it was at y −228.
   - Scrolling up and back down works. "+ Extra set" brings the inputs back and removes the banner.
   - At default size, the banner is above the sets (y 315), as before.
   - Minor: at AX5, "3 OF 3 DONE" in the title is still above the visible area (y −577). The banner tells you the same thing, so I'd leave it.
   - Shot: `review210-ax5.png`, frames 1–5.
3. **Faint themes: pass.** From the tokens, the 80% figure is the inactive tab label over the bar (`muted`). Ratios are old → new:

   | Theme | Tab label at 80% | Text on page background | Text on card |
   |---|---|---|---|
   | Dracula light | 1.70 → 3.07 | 3.03 → 6.02 | 3.36 → 6.68 |
   | Dracula dark | 2.45 → 3.09 | 3.68 → 4.84 | 3.48 → 4.57 |
   | Forest light | 2.56 → 3.07 | 3.86 → 4.96 | 4.28 → 5.49 |
   | Catppuccin light | 2.91 → 3.07 | 5.53 → 5.96 | 5.14 → 5.54 |

   - Each hue matches the old one. On screen the labels read clearly in all four themes (`review210-tabs.png`, top 4 rows).
   - **Lead's question about Dracula light:** its "light" mode keeps a dark background (#282A36). So the lighter text (#9EA8C7) is *more* readable on the page, not less: 6.0:1, up from 3.0:1. I checked by eye on Training ("Nov 10 · 50 min", "Week 1 · Day 1"), Progress ("normal 1.0", "Effort isn't tracked…"), Library and the logger ("Prescribed", the last-time line). Every one reads clearly. Shot: `review210-dracula-light.png`.
4. **E-ink tab: pass.**
   - The E-ink theme in light and dark, and with E-ink display on: the active tab shows only its bold underline, with no fade block.
   - Checked with Training, Progress and Settings selected. Shot: `review210-tabs.png`, bottom rows.
5. **Finish summary order: pass.**
   - By taps: I added Bench, Row and Squat, logged one set on each, and moved Squat to the top. Workout complete lists Squat, Bench, Row.
   - With no reorder, I logged Row before Bench, and it lists Row, Bench. That's the log order, as on the web.
   - Shot: `review210-ax5.png`, frames 6–8.

## Lead's "Also": does the pink plan sheet look wrong next to the purple button?
Yes, a little, and more than 207 suggested. In Blossom:
- The logger's own folder (frame and LOG tab) is purple, because the exercise tone is `secondary` (#C084FC).
- The plan sheet opens over it with a **pink** frame and tab (`.active` tone, which is `primary`, #F472B6).
- Below that is a **purple** Add exercise.

So the plan sheet is the one pink frame in an otherwise purple logger. RIPIT has the same split, a green frame with a yellow Add, but there it reads as two separate colours rather than a near miss. Shots: `review210-frames.png` (the logger frame next to the plan sheet frame) and `review210-dialogs.png` (last frame).

**Needs Dustin's call:** keep it as is (the plan sheet matches every other active folder in the app), or give the plan sheet the logger's tone (`.exercise`) so it matches the folder it opens from. The second is a one-word change at `PlanSheet.swift:28`.

## Regression pass (HEAD a68bc2ea)
- **Log:** the program logger flow passes (keypads, reps, log set).
- **Swipe:** six of six moves land; a short swipe and the diagonal ones don't move.
- **Plan list with Swap:** pass. I ran jump, previous, reorder (Squat to the top), Swap (Row for Deadlift), delete the current exercise, and Add (Curl), then finished.
  - Each plan list after a step was right.
  - The summary lists the one exercise with sets. The program in the Library is unchanged afterwards: Full Body still has its A/A superset.
  - The run took 25 minutes because of the idle wait below.
- **Exit:** pass. An empty workout closes without asking, in both a program and a freestyle workout. Keep as draft can be resumed, and Discard deletes.

## Idle wait after a picker (watch item from 207 and 209)
It came back once in this pass, and in a new place:
- In 207 it began on the first tap in the **Swap** picker's search field.
- This time Swap ran cleanly. The wait began on the first tap in the **Add exercise** picker's search field, which also opens from the plan sheet (after a Swap and a Delete earlier in the same session).
- From that tap on, every tap waited 60 s for the app to go idle ("App animations complete notification not received").

So the 350 ms Swap delay is probably not the cause. The common factor is the exercise picker opened from the plan sheet, together with the search field taking focus. Users see no 60 s delay. What XCUITest sees is an animation that never reports done, which may be a stuck sheet transition or keyboard animation. Log: `ui-Rrogram.log` (first wait at t = 119 s), and 207's `ui-RPL.log`.

## Outside the item (not fixed)
- **E-ink theme's WORKOUT button:** with the E-ink theme in light or dark (but not with E-ink display on), the centre button has a soft yellow glow behind it (`review210-tabs.png`). It's untouched by 209, so not new.
- **"RESTING" at AX5:** it breaks mid-word as "RESTI / NG" in the set list (`review210-ax5.png`, frames 1 and 3).
- 205's leftovers, and the half-hidden set row at default size, still stand (209 already listed them).

## Shots
All in `initiatives/ios-app/handoff/slice9b-assets/`, untracked:
- `review210-dialogs.png`
- `review210-ax5.png`
- `review210-tabs.png`
- `review210-dracula-light.png`
- `review210-frames.png`

## Cleanup (not deleted)
In `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/3672bbc3-9750-4385-9718-8efe4ccd8c2c/scratchpad/`:
- `shots210/`, `s210-*.png`
- `uitest/UITests/Recheck210Tests.swift`
- `ui-*.log`, `build210.log`, `ioscheck210.log`
- Everything from 207's list is still there (`vid208/`, `vid208b/`, `src206/`, `uitest206/`, `dd206/`; about 5 GB).

`ripit-review` and `ripit-impl` are both still booted.
