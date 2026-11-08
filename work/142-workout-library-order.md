---
id: 142
state: accepted
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-06 Dustin (Older fold at 30 days, manual archive only; pinned + tags)
updated: 2026-11-06
---
# Workout library slice 1: order and the Older fold

Checkout: worktree2, branch `feature/workout-library-order` (stacked on `feature/learn-in-settings`, PR #1039). Small, no schema: no separate test-builder; write the tests yourself first and show them failing.

## Read
- `features/workout-library/order-older.feature` (the contract)
- `initiatives/workout-library/docs/141-discovery.md` (what exists, with file:line: `components/library/LibraryView.tsx`, `components/features/saved-workouts/*`, the saved-workouts API ordering, QuickActionSheet)

## Do
1. Tests for the grouping (a pure helper is fine: pinned / recent / older from `pinnedAt`, `lastUsedAt ?? createdAt`, now) and for the Library list (groups, fold closed by default with its count, pin/unpin moves the row without a reload).
2. Build it. Keep Training's pinned workouts and the quick action sheet as they are.
3. A never-started workout counts from `createdAt`, so a just-approved AI workout sits at the top of Recent.

## Done when
Tests pass; full suite and `npx tsc --noEmit` clean; `npm run perf:scan -- --changed origin/dev` clean or explained; 390px screenshots of Library → Workouts (fold closed and open) in light, dark and E-INK in `initiatives/workout-library/docs/assets/142/`.

## Hand back
Use `handoff-implementer`. First line `Report: complete | needs decision | further handoff`. Don't edit `work/`, `STATE.md` or `status.md`. Send the packet with `herdr agent prompt wE:p1 '<packet>'`.

## Log
- 2026-11-06 CST: created; small (test-builder skipped, stated in status.md); dispatched to implementer (wE:p7).
- 2026-11-06 CST: back "needs decision": 19 locked tests broke on fixed fixture dates (2026-10-01, now in Older). Lead amended both fixtures to 2 days ago (work 142 comments); those files + new tests 604/604. Sent back: full suite, then seed synthetic saved workouts for bodybuilder@synthetic.test for the phone preview.
- 2026-11-06 CST: back complete (suite 4172 pass). Preview data seeded. Phone preview for Dustin.
- 2026-11-06 CST: Dustin on the phone preview: "it all seems to work". Accepted.
