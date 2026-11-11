---
id: 200
state: ready
executor: parity-disco
skill: reviewer (method from 191)
waiting_on:
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-10 Dustin ("Yes, go for it"; answers on 196: drop History tab, supersets like the web, the web's keypads, reorder today only + light haptic; install after independent review)
updated: 2026-11-10
---
# iOS slice 9a: bottom bar and quick actions, review

## Goal
An independent review of slice 9a against `features/ios-app/nav-shell.feature` and the web.

## Read first
The spec, `initiatives/ios-app/work/198-handback.md` (hands-on list), and the `ios/` diff since 9a's tests commit `18dae944`. Don't read `199-handback.md` before your first pass.

## Do
- **Every scenario by real taps,** on `ripit-review` (reuse it), in RIPIT dark and light and at AX5, with VoiceOver spot checks.
- **Side by side with the local web at 390 px:** the bar, the chip, Quick Actions in both states, and each tab's contents. Save `pairs-` shots to `initiatives/ios-app/handoff/slice9-assets/` with the prefix `review9a-`.
- **Regressions:** start, log and finish a workout. Import still works. Pinned, Repeat and Up next on Training still work.
- **Code read:** look at how the system bar is hidden, at per-tab state, and at the safe area.

## Hand back
Accept or a fix list, then a revised review after reading `199-handback.md`. Don't `rm`.
