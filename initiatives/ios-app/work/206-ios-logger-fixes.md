---
id: 206
state: running
executor: ios-impl
skill: handoff-implementer
waiting_on:
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-11 Dustin (phone notes on 9b; calls on 205: dim ~80%, end lone superset today, empty exit closes without asking)
updated: 2026-11-11
---
# iOS slice 9b: fixes from review and Dustin's phone

## Read first
`205-handback.md` (fix list and evidence shots in `handoff/slice9-assets/review9b-*`) and `205-dustin-notes.md` (Dustin's screens in `handoff/slice9b-assets/`, Blossom theme).

## Do
**From the review**
1. **Saved workout order (data):** a reordered freestyle workout saves in its old order. Make `saveWorkout` produce today's order (rewrite `"order"` in `moveExercise` for the workout's own rows, or have the save read today's order). Add a store test: reorder, finish, save, check the order. You may add this test; leave the locked `Logger*Tests` files alone.
2. **After the planned sets:** replace the form with "✓ ALL PLANNED SETS LOGGED" and show "n OF n DONE" in the panel header, as the web does. + EXTRA SET brings the form back.
3. **AX5 bar labels cut off** ("+ EXTRA…", "NEXT EXERC…"): cap the bar's text size like the header, or let the labels wrap.

**From Dustin's phone (deliberate departures from the web where noted)**
4. **LOG SET label sits too high** in its button: centre it vertically (with and without the second line).
5. **Weight and RIR not lined up:** the RIR box is ~9 pt higher. Put labels on one baseline and boxes on one row.
6. **Inputs to the bottom (departs from the web):** the reps, weight, effort inputs and warm-up sit at the bottom of the panel, just above the bar, with the empty space above them. The keypads also sit at the bottom. Last time and the title stay at the top.
7. **Confirm buttons use the accent (departs from the web):** keypad DONE and every other confirm in the logger (effort picker, dialogs) use the theme accent, not green. FINISH stays green.

**Dustin's calls**
8. **Inactive tabs dim to about 80%,** not 60%. Check the label contrast in Dracula light/dark, Forest light, Catppuccin light, GitHub and Clyde.
9. **Lone superset:** after deleting or swapping one half of a superset in a program workout, the other loses its badge for today only. The program keeps the superset.
10. **Empty exit:** keep it as it is (closes without asking).

**Small, if cheap:** VoiceOver on empty freestyle reads "exercise 1 of 0" (`WorkoutView.swift:159`); make it "no exercises".

## Done when
- `mise run ios-check` exit 0; locked tests unchanged.
- Each point checked by real taps on `ripit-impl`, with shots in Blossom dark, RIPIT dark and at AX5.

## Don't touch
`work/`, `STATE.md`, `status.md`. Don't `rm`; list cleanup.

## Hand back
A short packet, first line `Report: complete`, with a shot per point.

## Log
- 2026-11-11: created (ready).
- 2026-11-11 14:29 MST: dispatched to ios-impl (running; context 2%, kept)
