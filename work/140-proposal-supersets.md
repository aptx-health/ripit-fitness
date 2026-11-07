---
id: 140
state: accepted
waiting_on:
executor: coach-impl
from: lead (lead-ripit-mcp)
confirmed: 2026-11-06 Dustin ("Carry supersets"); 2026-11-07 "yes" to start
updated: 2026-11-07
---
# Proposals keep supersets

Checkout: worktree1, branch `feature/program-supersets` (from origin/dev). Small: no separate test-builder; write the tests first and show them failing.

## Goal
`programInput` and the saved-workout proposal input drop `exerciseGroup`, so supersets are lost. Coaching slice 2 will reuse these formats, so fix it now.

## Read
- `features/agent-tools/proposal-supersets.feature` (the contract)
- `lib/proposals/program.ts` (programInput, checkProgram, create), `lib/proposals/saved-workout.ts` (:122, :167 set `exerciseGroup: null`), `lib/mcp/tools.ts` (tool descriptions), `components/suggestions/*` and the admin proposal detail page
- How the app stores and shows supersets: `lib/db/batch-insert.ts`, `lib/workouts/start-draft.ts:89`, `app/api/workouts/saved/route.ts:164`, the logger's superset display

## Do
Optional `group` on each exercise in both inputs (name it to match existing MCP style), validation as in the feature, carried to `exerciseGroup` on approve, shown on review screens, MCP descriptions updated. No schema change.

## Done when
Tests pass; full suite and `npx tsc --noEmit` clean; `npm run perf:scan -- --changed origin/dev` clean; a 390px screenshot of a suggestion with a superset in `work/assets/140/`.

## Hand back
Use `handoff-implementer`. First line `Report: complete | needs decision | further handoff`. Don't edit `work/`, `STATE.md` or `status.md`. Send the packet with `herdr agent prompt wE:p1 '<packet>'`.

## Log
- 2026-11-07 CST: created; small (test-builder skipped); dispatched to coach-impl (wE:pA) in worktree1.
- 2026-11-07 CST: back complete; lead re-ran 838/838, tsc clean. Screenshot to Dustin; reviewer skipped (small, validation fully tested).
- 2026-11-07 CST: Dustin approved from the screenshot ("Screenshot is enough"). Accepted.
