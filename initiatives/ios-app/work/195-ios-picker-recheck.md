---
id: 195
state: review
executor: parity-disco
skill: reviewer (method from 191)
waiting_on:
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-08 Dustin ("Go for it" on slice 8; same autonomy)
updated: 2026-11-10
---
# iOS slice 8: re-check the review fixes

## Goal
Check that 194 fixed your 191 findings and the two extra changes, without breaking the rest of slice 8.

## Check
- Your findings 1 and 2, by real taps on `ripit-review` (reuse it), in dark and light and at the largest text size.
- The instructions counter reads /4000, and 4001 characters are refused.
- An import's unknown web exercise ("Barbell Bent-Over Row") shows no MINE badge and no Edit button; your own custom exercises still do.
- `mise run ios-check` exit 0. Spot-check that search, filters and multi-pick still behave as in 191.

## Hand back
Accept or fix list, with screenshots in `initiatives/ios-app/handoff/slice8-assets/` (prefix `recheck-`). Don't `rm`.
- 2026-11-10 19:37 MST: dispatched to parity-disco (running; context 25%, kept)
