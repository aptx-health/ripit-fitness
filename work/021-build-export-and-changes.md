---
id: 021
state: accepted
waiting_on: 
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-10-27 Dustin
updated: 2026-10-27
---
# Build: insight rule changes and the training data export (green)

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`.

## Goal
Make the 020 tests pass, building spec sections "Training insights" (changed shared rules) and "Training data export": `export_training_data` in `lib/mcp/tools.ts`, the route `app/api/agent/export.csv/route.ts` (or the nearest Next.js-valid path that serves that URL), and shared row logic in `lib/insights/export.ts`.

## Done when
- `npm run test:run` passes in full. `npx tsc --noEmit` is clean, and biome is clean on changed files.
- The MCP page is one query. The CSV route makes a bounded number of queries, whatever the row count.
- The route logs errors with `logger` and returns no stack traces.

## Don't touch
Test files (read-only), `features/**`, the spec, the schema.

## Hand back
The handoff-implementer packet. First line: `Report: complete | needs decision | further handoff`.

## Log
- 2026-10-27: created; waits on 020.
- 2026-10-27: dispatched to implementer (wF:p2).
- 2026-10-27: handback (complete) saved. Lead re-ran: full suite 1241 passed / 4 skipped, tsc clean.
- 2026-10-27: accepted by Dustin ("Ok I accept").
