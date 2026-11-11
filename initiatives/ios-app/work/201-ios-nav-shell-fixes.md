---
id: 201
state: ready
executor: ios-impl
skill: handoff-implementer
waiting_on:
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-10 Dustin (slice 9 go; 2026-11-11: remove Training's Programs and Ad-hoc buttons)
updated: 2026-11-11
---
# iOS slice 9a: review fixes

## Goal
Fix review 200's two findings, and make Dustin's Training change.

## Fixes
1. **The bar covers the end of every tab's list (blocking).** Give every tab's scroll content, including pushed screens, a bottom inset of the bar's height, so the last row of each list can be scrolled fully above the bar. Training, Settings › Version, the Progress chart and the last day of a Library program are all cut off now. See `200-handback.md` fix 1 and `slice9-assets/review9a-ios-list-end-under-bar.png`. Keep the keyboard rule.
2. **Text shows through the bar.** Make the fill opaque, or add a blur like the web's `backdrop-blur-sm` (fix 2, `review9a-ios-see-through-crop.png`).
3. **Remove Training's "Programs" and "Ad-hoc workout" buttons** (Dustin, 2026-11-11). Library › Programs and Workout › Freestyle replace them. Move or adjust any test hook or debug flag that uses them.

## Done when
- `mise run ios-check` exit 0, tests unchanged.
- By real taps on `ripit-impl`: scrolled to the end, the last row sits above the bar on every tab and on a pushed screen (a program, History). Check at default size and AX5, in dark and light. Save the shots to `initiatives/ios-app/handoff/slice9-assets/` with the prefix `fix201-`.

## Don't touch
Tests, `initiatives/ios-app/work/`, `STATE.md`, `status.md`, the roadmap. Don't `rm`.
