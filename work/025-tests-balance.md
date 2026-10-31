---
id: 025
state: accepted
waiting_on: 
executor: test-builder
from: lead (lead-ripit-mcp)
confirmed: 2026-10-30 Dustin (slice 4 plan form and scenario form)
updated: 2026-10-30
---
# Tests for anchors and balance targets (red)

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/agent-balance`.

## Goal
Failing tests for every scenario in `features/agent-tools/balance-proposals.feature` (15), against spec section "Anchors and balance targets". Item 026 makes them pass.

## Do
1. `__tests__/features/agent-tools/balance-proposals.steps.ts`, in the style of the other agent-tools steps files. Use `callTool` and the proposal service functions against a real test DB.
2. Cover what the scenarios imply but don't spell out:
   - all 18 FAUs and all 6 patterns are always present;
   - `changes` can't be empty;
   - duplicate anchor ids are removed before the limit of 5 is checked;
   - an exercise from another user can't be used as an anchor;
   - `days` bounds;
   - the reads do no writes. Count write calls, the way the slice 3 query-count test counts reads.
   - an unrelated profile or settings edit, such as goals or lookbackDays, doesn't cause a conflict;
   - revert is refused with `conflict` when the touched key moved after approval;
   - the summary format.
3. Lock the file read-only when done.

## Done when
- `npm run test:run -- balance-proposals` fails only because the tools and kinds are missing.
- Pass-proof with the `break-matrix` skill against a scratch fake; delete the fake afterwards.
- The rest of agent-tools still passes, and biome is clean.

Env: as in 017. The Prisma client is generated in worktree2; re-run `npx prisma@6.19.0 generate` if the branch switch left it stale.

## Don't touch
`lib/`, `app/`, `features/**`, the spec, and other tests.

## Hand back
The handoff-test-builder packet. First line: `Report: complete | needs decision | further handoff`.

## Log
- 2026-10-30: created; dispatched to test-builder (wF:p1).
- 2026-10-30 20:05 MDT: handback saved (`025-handback.md`). Lead re-ran: 107 failed / 55 passed of 162, all failures unknown tool or proposal not found. Steps file read-only. Pass-proof 59/60 (the survivor, the anchor summary separator, is left loose on purpose). Lead accepts assumptions 1-7 as the contract. State review.
- 2026-10-30 22:30 MDT: accepted by Dustin after the phone review (buttons fixed).
