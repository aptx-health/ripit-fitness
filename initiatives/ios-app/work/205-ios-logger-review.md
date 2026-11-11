---
id: 205
state: waiting
executor: parity-disco
skill: reviewer (method from 200)
waiting_on:
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-10 Dustin (slice 9 go; answers on 196: supersets in order + badge, the web's keypads, reorder today only + light haptic; install after independent review)
updated: 2026-11-11
---
# iOS slice 9b: one-exercise logger, review

## Goal
An independent review of slice 9b against `features/ios-app/one-exercise-logger.feature` and the web.

## Read first
The spec, `initiatives/ios-app/work/203-handback.md` (the hands-on list), and the `ios/` diff since 9b's tests commit. Don't read `204-handback.md` before your first pass.

## Do
- **Every scenario by real taps** on `ripit-review` (reuse it), in RIPIT dark and light and at AX5, for a program workout and a freestyle workout.
- **Side by side with the local web at 390 px:** the logger, the bar, the keypads and the Plan list. Prefix the shots `review9b-`.
- **Regressions:** every slice 5–8 feature in the new logger, and import.
- **Code read:** the state model, and whether a program reorder changes the program.

## Hand back
Accept or a fix list, then a revised review after reading `204-handback.md`. Don't `rm`.
