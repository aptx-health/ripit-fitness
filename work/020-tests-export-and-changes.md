---
id: 020
state: accepted
waiting_on: 
executor: test-builder
from: lead (lead-ripit-mcp)
confirmed: 2026-10-27 Dustin (answers on the slice 3 review and the export form)
updated: 2026-10-27
---
# Tests: Dustin's two insight changes, and the training data export (red)

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`.

## Goal
Failing tests for:
1. The changed rules in spec "Training insights", shared rules: **effort** counts every non-warmup set whatever its weight or reps; **stall** uses `completed` sessions only, with sets of `weight > 0` and `reps > 0`. The two new scenarios are in `features/agent-tools/training-insights.feature`: "Abandoned workouts don't count toward stall" and "Bodyweight sets count toward effort".
2. Everything in `features/agent-tools/training-export.feature` (8 scenarios), against spec "Training data export": the MCP tool `export_training_data` and the route `GET /api/agent/export.csv`.

## Do
- Unlock `__tests__/features/agent-tools/training-insights.steps.ts` (`chmod u+w`). Add the 2 scenarios, and update any existing assertion or seed that encoded the old rules (abandoned counted for stall; 0-weight sets excluded from effort). Re-lock it.
- New `__tests__/features/agent-tools/training-export.steps.ts`. Test the route by calling its exported `GET` handler with a `Request`, the way other `__tests__/api` tests do. Use the real test DB, and tokens made with `createAgentToken`.
- Also cover: `limit` bounds, an invalid cursor, and the formula guard on `-` and `@`. Assert that an all-numeric field such as a negative weight is never quoted. That can't happen with real data, but assert it anyway.
- Lock both files read-only.

## Done when
- The new and changed tests fail only because the behaviour is missing: unknown tool, a 404 route, or the old rule. Everything else in agent-tools passes.
- Pass-proof against a scratch fake, with broken variants for the session rule, warmups included, page boundaries, the range bounds (`since` inclusive, `until` exclusive), the 3-year cap, 401, and the formula guard. Delete the fake afterwards.
- Biome is clean on both files.

Env: as in 017.

## Don't touch
`lib/`, `app/`, `features/**`, the spec, and other test files.

## Hand back
The handoff-test-builder packet. First line: `Report: complete | needs decision | further handoff`.

## Log
- 2026-10-27: created from Dustin's answers (1A bodyweight counts for effort, 2B stall completed only, 3A keep the window) and his export decisions. Dispatched to test-builder (wF:p1).
- 2026-10-27: handback (complete) saved. Lead re-ran: 44 failing, all for the right reasons (41 missing tool or route, 3 old rules), 339 passing; files read-only. The test-builder's assumptions were pinned in the spec.
- 2026-10-27: accepted by Dustin ("Ok I accept").
