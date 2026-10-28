---
id: 018
state: accepted
waiting_on: 
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-10-27 Dustin (slice 3 plan form)
updated: 2026-10-27
---
# Build training insight tools (green)

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`.

## Goal
Make `npm run test:run -- training-insights` pass, building the contract in `initiatives/agent-tools/docs/spec.md` ("Training insights"): `get_stall_signals` and `get_effort_summary` in `lib/mcp/tools.ts`, pure logic in `lib/insights/stall.ts` and `lib/insights/effort.ts`, and `setEffort` exported from `lib/aggregates/compute.ts`. Reuse the helpers named in `work/016-handback.md` §1.

## Done when
- The training-insights tests pass, and `npm run test:run` passes overall.
- `npx tsc --noEmit` is clean, and biome is clean on changed files.
- Each tool does one `findMany` (no query per exercise).
- Every scenario maps to a test.

## Don't touch
Test files (read-only), `features/**`, the spec, the schema.

## Hand back
The handoff-implementer packet. First line: `Report: complete | needs decision | further handoff`.

## Log
- 2026-10-27: created; waits on 017.
- 2026-10-27: 017 in review; spec ambiguities pinned (see spec 'Training insights'). Dispatched to implementer (wF:p2).
- 2026-10-27: handback (complete) saved. Lead re-ran: full suite 1165 passed / 4 skipped, tsc clean, steps file still read-only.
- 2026-10-27: accepted by Dustin ("Accepted"; answers 1A, 2B, 3A, carried into item 020).
