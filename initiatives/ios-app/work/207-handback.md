Report: needs decision

## Verdict
Two fixes, then accept. Dustin also needs to make one colour call (Blossom). 9 of the 11 points in 206 pass by real taps on `ripit-review` in Blossom dark, RIPIT dark and at AX5. 208, the softened tab without the accent line (3491fb5e), passes. `mise run ios-check` exits 0 with 351 tests, and the regression pass (log, swipe, plan list, exit) is clean.

## Fix list
1. **The dialogs aren't in the accent colour (point 7).**
   - `.tint(Theme.text(Theme.accent))` at `WorkoutView.swift:114` has no effect on system dialogs. They take the app's tint, `Theme.primary` (`RipitApp.swift:130`).
   - So in RIPIT dark, Exit's "Keep as draft" is still **green**.
   - In Blossom, it and Finish's "Finish" are pink (primary), while DONE, Next exercise and Add exercise are purple (accent).
   - Shots: `review207-confirms.png` (last two frames) and `review207-blossom-dialog-crop.png`.
   - The fix: tint the dialogs at the level that controls them (the window's tint while the logger is up), or make them custom. The colour depends on decision 1 below.
2. **At AX5 the after-planned panel is out of view (point 2 at AX5).**
   - After the last planned set at AX5, the panel stays scrolled to the bottom. "3 OF 3 DONE" and "✓ ALL PLANNED SETS LOGGED" are above the visible area: XCUITest reads them at y = −589 and −228.
   - All you see is the set list and the bar.
   - The fix: scroll to the top when the banner appears, or put the banner where the inputs were, at the bottom.
   - Shot: `review207-ax5.png`, frames 4 and 8.

## Needs Dustin's call
1. **Which colour is the "accent" in Blossom?**
   - Dustin's note says "in Blossom that's the pink/red". But Blossom's `accent` token is purple (#C084FC, the same as its header), and the pink is `primary` (#F472B6).
   - Built: DONE, the picked RIR, Next exercise and Add exercise are **purple**.
   - If he meant pink, those four use `primary` instead. In RIPIT that would make them green, since RIPIT's primary is green. Keeping `accent` and choosing per theme would be the other route.
   - Shots: `review207-blossom.png` and `review207-ripit.png`.
2. **Tab label contrast at 80% (point 8).** My numbers match 206's: Dracula light 1.71, Dracula dark 2.44, Forest light 2.55, Catppuccin light 2.92. GitHub and Clyde now clear 3:1. The remaining fix is in those themes' `muted-foreground` tokens; the dimming isn't the cause.
3. **E-ink tab (from 208):** the selected tab gets a pale orange fade on top of its bold underline. Keep it, or show the underline only?

## Point by point (Blossom dark, RIPIT dark, AX5)
1. **Saved order: pass.**
   - By taps: I added Bench, Row and Squat, logged a set on each, and moved Squat to the top. The saved workout reads Squat, Bench, Row, and Start this workout opens in that order.
   - `SessionOrderSaveTests` is in the 351 tests.
   - Side note: the finish summary still lists Bench, Row, Squat (see Outside the item).
2. **After the planned sets: pass at default size.**
   - "✓ ALL PLANNED SETS LOGGED" replaces the inputs, "3 OF 3 DONE" shows, Prescribed hides, and + Extra set brings the form back as "SET 4". It matches the web (`review207-afterplanned-web-ios.png`).
   - At AX5, see fix 2.
3. **AX5 bar: pass.** "+ EXTRA SET" and "NEXT EXERCISE" show whole. The buttons are still about 145 pt tall, which 206 already noted.
4. **LOG SET centred: pass.** With the detail line and without it (an empty freestyle exercise), the label is centred to within 1 pt.
5. **Weight and RIR aligned: pass.** Both labels sit at y 592 and both boxes at y 620 (167×64) in both themes. RIR has its gauge icon.
6. **Inputs at the bottom: pass.**
   - At default size, the inputs and the weight, reps and RIR keypads sit just above the bar, with the space above them. At AX5, everything scrolls, with the inputs last.
   - Minor: with three planned sets, set 3's row opens half hidden behind the pinned inputs (it scrolls). 206 flagged this risk.
7. **Accent confirms: partial.**
   - Keypad DONE, the RIR pick, Next exercise and the plan sheet's Add exercise use `accent`. FINISH stays green.
   - The dialogs don't use the accent (fix 1), and the colour itself is decision 1.
8. **80%: pass as built.** The numbers are under decision 2.
9. **Lone superset: pass.**
   - In program Full Body, deleting Row leaves Bench without a badge, and so does swapping Row for Overhead Press.
   - After discarding, a new session shows A/A again. The program in the Library still shows A/A.
10. **Empty exit: pass.** It closes without asking, in both a program and a freestyle workout.
- **Small: pass.** VoiceOver reads "Plan, no exercises".

## 208 (soft tab, accent line removed in 3491fb5e)
- Checked in RIPIT dark, Blossom dark, GitHub light, Dracula light and the E-ink theme (light and dark), with Training (end), Progress (middle) and Settings (end) selected.
- The block is rounded, inset from the edges and the top border, and fades downward. There is no accent line.
- E-ink keeps its underline (see decision 3).
- Shot: `review207-208-tabs.png`.
- **Motion (video at 60 fps):**
  - With motion on, the block slides across the bar in about 13 frames (`review207-208-motion.png`, top 8 rows).
  - With Reduce Motion on, it jumps in 1–2 frames (bottom rows).

## Regression pass (HEAD 3491fb5e)
- **Swipe:** six of six moves land; a short swipe and a diagonal one don't move.
- **Exit:** empty closes; Keep as draft resumes; Discard deletes.
- **Plan list:** I ran jump, reorder, swap, delete and add, then finished. The program is unchanged afterwards.
- **Intermittent idle hang (watch):**
  - In one of the two HEAD runs of the program plan-list test, every tap after Swap waited 60 s for the app to go idle. That is the symptom of 204's Swap workaround (the 350 ms delay).
  - I didn't see it again: a second run on HEAD and a run on the 206 build were both clean, in 174 s.
  - Users wouldn't see it as such. It may mean an animation that never finishes.

## Outside the item (not fixed)
- **Finish summary order:** after a reorder, the Workout complete screen lists exercises in the old order (Bench, Row, Squat). The saved workout and history are right.
- **Mixed colours in the Blossom plan sheet:** the sheet's tab and frame are pink, but its Add exercise button is purple.
- **205's leftovers still stand:** the Bench Info text, the history count of empty exercises, and the elements under the logger cover.

## Shots
All in `initiatives/ios-app/handoff/slice9b-assets/`, untracked:
- `review207-blossom.png`
- `review207-ripit.png`
- `review207-ax5.png`
- `review207-afterplanned-web-ios.png`
- `review207-confirms.png`
- `review207-blossom-dialog-crop.png`
- `review207-order-superset.png`
- `review207-208-tabs.png`
- `review207-208-motion.png`

## Cleanup (not deleted)
Everything below is in `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/3672bbc3-9750-4385-9718-8efe4ccd8c2c/scratchpad/`:
- `shots207/`
- `vid208/` (2.0 GB) and `vid208b/` (2.5 GB): videos and frames
- `src206/`, `uitest206/` and `dd206/` (about 750 MB): the 206 build used for the bisect
- `uitest/UITests/RecheckTests.swift`
- the `ui-*.log` and `build*.log` files

On the simulators:
- `ripit-review` is booted. Reduce Motion is back off.
- `ripit-impl` was left booted by 206.
