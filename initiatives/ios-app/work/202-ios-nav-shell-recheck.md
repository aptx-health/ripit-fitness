---
id: 202
state: ready
executor: parity-disco
skill: reviewer (method from 200)
waiting_on:
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-10 Dustin (slice 9 go; 2026-11-11: remove Training's Programs and Ad-hoc buttons)
updated: 2026-11-11
---
# iOS slice 9a: re-check the fixes

## Check
- Your two findings from 200, as you proposed: the list-end shots on each tab and on a pushed screen, at default size and AX5, in dark and light, on `ripit-review` (reuse it).
- Training no longer has the Programs and Ad-hoc workout buttons. Library › Programs and Workout › Freestyle still work.
- `mise run ios-check` exit 0. Spot-check Quick Actions and per-tab state.

## Hand back
Accept or a fix list, with shots prefixed `recheck9a-`. Don't `rm`.
