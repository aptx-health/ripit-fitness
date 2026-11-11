---
id: 154
state: superseded
superseded_by: 155
waiting_on:
executor: coach-impl
from: lead (lead-ripit-mcp)
confirmed: 2026-11-07 Dustin (group headers blend in like "a cheap grid"; distinct boxes, folder-tab-like header in a different colour with a count; Older similar, as a dropdown; "you get the idea")
updated: 2026-11-07
---
# Workout groups as distinct boxes

Checkout: worktree1, branch `feature/workout-row-panel` (same as 153, uncommitted; build on it). The phone preview is running from this worktree on :3100; stop it with `.claude/skills/phone-preview/phone-preview.sh stop` before you start the dev stack, and tell me in the packet so I restart it.

## Goal
Make the two new scenarios at the end of `features/workout-library/row-panel.feature` true. Dustin's screenshot of today's look: `initiatives/workout-library/docs/assets/154/before-dark.png`.

## Read
- `components/features/saved-workouts/SavedWorkoutsList.tsx` (groups, Older fold)
- The Workouts/Programs folder tabs on Library and the Training folder tabs, for the tab shape to echo (smaller, its own colour, not a copy)
- Theme tokens (`app/globals.css` and theme files); E-INK rules in `features/ui/eink.feature`

## Decide alone
Exact colours per group (from tokens; distinct per group or one accent colour, whichever reads better across themes), spacing, tab shape. Keep the outer Workouts folder.

## Do
1. Tests for the new scenarios (count in each header, Older closed with count and chevron, each group its own box).
2. Build.
3. Screenshots at 390px in light, dark and E-INK (collapsed list with an open Older): `initiatives/workout-library/docs/assets/154/`.

## Done when
New tests pass; full `npx vitest run` passes; `npx tsc --noEmit` clean; `npm run perf:scan -- --changed origin/dev` clean.

## Hand back
Use `handoff-implementer`. First line `Report: complete | needs decision | further handoff`. Don't edit `work/`, `STATE.md` or `status.md`. Send the packet to the lead with `herdr agent prompt wE:p1 '<packet>'`.

## Log
- 2026-11-07 CST: created from Dustin's preview feedback on 153; dispatched to coach-impl (wE:pA).
- 2026-11-07 CST: back complete (4439 pass per packet); lead re-ran affected suites 674/674, tsc clean; screenshots checked. Preview restarted.
- 2026-11-07 CST: Dustin: colours fine, tabs too like the folder tabs; picked F (section rule). Superseded by 155.
