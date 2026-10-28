---
id: 023
state: accepted
waiting_on: 
executor: test-builder, then implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-10-27 Dustin (within the confirmed export scope; review follow-up)
updated: 2026-10-27
---
# Export fixes from review 022 (defects 2 and 4)

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`. Spec: "Training data export", the two lines marked "after review 022". The review is in `work/022-handback.md`.

## Do
**Part A, test-builder (red):** in `__tests__/features/agent-tools/training-export.steps.ts` (unlock with `chmod u+w`, then re-lock), add plain tests:
- The CSV guards text starting with a tab, a CR, `" =1+1"` and `"  @x"`.
- A plain `" hello"` is not guarded.
- `?since=2026-01-01&until=` returns 200, ending now.
- An MCP `until: ""` behaves the same.
The tests must fail only on the missing behaviour.

**Part B, implementer (green):** make them pass in `lib/insights/export.ts` and the route.

## Done when
`npm run test:run` passes in full, `tsc` is clean, and biome is clean.

## Don't touch
Anything else.

## Hand back
Each role's packet. First line: `Report: complete | needs decision | further handoff`.

## Log
- 2026-10-27: created from review 022; Part A dispatched to test-builder (wF:p1).
- 2026-10-27: Part A handback saved; lead re-ran it (10 failing for the right reasons). Part B dispatched to implementer (wF:p2).
- 2026-10-27: Part B handback saved; lead re-ran the full suite (1254 passed) and tsc (clean); kept the one-line tools.ts cursor fix. Short re-review dispatched to reviewer (wF:p3).
- 2026-10-27: re-review: ship. The optional multi-page test gap was skipped on purpose (low; the cursor line is reviewed).
- 2026-10-27: accepted by Dustin ("Ok I accept").
