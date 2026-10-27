---
id: 013
state: accepted
waiting_on: 
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-10-26 Dustin (slice 2 plan form; follow-up within confirmed scope)
updated: 2026-10-26
---
# Fixes from the slice 2 review (green)

## Goal
Make the 012 tests pass. This fixes the reviewer's must-change items 1–3 in `work/011-handback.md`.

## Do
- In `lib/proposals/service.ts`, pass `{ timeout: 30000 }` to the approve `$transaction`.
- In the approve catch, map P2028 to `refuseApproval(..., 'invalid', <message that mentions a timeout>)`. The proposal stays pending, with the error recorded.
- In `lib/proposals/program.ts`, store an empty or whitespace `weight`, exercise `notes` or week `name` as `null`.

## Done when
- `npm run test:run -- proposals-approve-transaction agent-tools` passes, and the full `npm run test:run` shows no new failures.
- Type-check is clean, and biome and eslint are clean on the changed files.

## Don't touch
- Any test file, `features/**`, `prisma/`.

## Hand back
The handoff-implementer packet. First line: `Report: complete | needs decision | further handoff`.

## Log
- 2026-10-26: created from the 011 review's must-change list; waiting on 012.
- 2026-10-26 20:35 MDT: 012 in review. Dispatched to implementer (running) with the V3 brief plus the check-in line.
- 2026-10-26 20:38 MDT: handback (complete) saved as work/013-handback.md; lead re-ran: 246/246, type-check clean.
- 2026-10-26 21:46 MDT: accepted by Dustin ("Ok this is great. Let's PR").
