---
id: 207
state: running
executor: parity-disco
skill: reviewer (method from 200)
waiting_on:
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-11 Dustin (install after independent review)
updated: 2026-11-11
---
# iOS slice 9b: re-check after fixes

## Read first
`206-ios-logger-fixes.md` and its handback.

## Do
Re-check every point in 206 by real taps on `ripit-review`: your three fixes (save order by tap and test, the after-planned panel next to the web's, the bar at AX5), and Dustin's points 4–9 in Blossom dark, RIPIT dark and at AX5. Note that 6 and 7 depart from the web on purpose. A quick regression pass: log, swipe, plan list, exit.

## Hand back
Accept, or a short fix list. Don't `rm`.

## Log
- 2026-11-11: created (waiting on 206).
- 2026-11-11 15:01 MST: dispatched to parity-disco (running; context 1%, kept)

## Also (added 2026-11-11)
After 206, also check 208 (`208-ios-tab-soften.md`, softened active-tab highlight): end and middle tabs in RIPIT dark, Blossom dark, a light theme and E-ink; the slide still works and Reduce Motion still jumps.
