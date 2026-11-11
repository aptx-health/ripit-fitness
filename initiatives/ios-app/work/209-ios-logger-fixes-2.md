---
id: 209
state: ready
executor: ios-impl
skill: handoff-implementer
waiting_on:
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-11 Dustin (207 calls: confirms use accent; strengthen faint themes' muted text; E-ink tab underline only)
updated: 2026-11-11
---
# iOS slice 9b: fixes from the re-check

## Read first
`207-handback.md` (shots `handoff/slice9b-assets/review207-*`).

## Do
1. **Dialogs in the accent:** Exit's "Keep as draft" and Finish's "Finish" confirm, and any other logger dialog, use `accent`, like DONE. `.tint` on the view doesn't reach system dialogs; tint at the level that controls them while the logger is up (or make them custom). Discard stays red. Also make the plan sheet's frame and tab consistent with its Add exercise button if that's the same token question (207 "Mixed colours").
2. **AX5 after-planned:** when "✓ ALL PLANNED SETS LOGGED" appears, it must be in view. Put the banner where the inputs were (at the bottom) or scroll to it.
3. **Faint themes:** raise `muted-foreground` in Dracula (light and dark), Forest light and Catppuccin light, on iOS only, until the inactive tab labels reach at least 3:1 over the bar at 80%. Keep each theme's hue. List the old and new values.
4. **E-ink tab:** the active tab shows only its bold underline, with no fade block.
5. **Finish summary order** (207 outside the item): after a reorder, Workout complete lists the exercises in today's order.
6. **Watch:** if you can find why a tap after Swap sometimes waits 60 s for idle (the 350 ms workaround), fix it; otherwise say what you found.

## Done when
`mise run ios-check` exit 0; each point by real taps on `ripit-impl`, with shots.

## Don't touch
`work/`, `STATE.md`, `status.md`. Don't `rm`.

## Hand back
A short packet, first line `Report: complete`.

## Log
- 2026-11-11: created (ready).
