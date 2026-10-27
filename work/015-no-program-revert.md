---
id: 015
state: accepted
waiting_on: 
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-10-26 Dustin (chose "remove Revert for programs" after phone testing)
updated: 2026-10-26
---
# Program proposals can't be reverted (green)

## Goal
Make the 014 tests pass. Approve no longer stores an `inverse` for `program.create`. Revert refuses with `invalid` and the spec's error text. The admin detail page shows no Revert button for program proposals. Exercise proposals keep their Revert.

## Read first
- `initiatives/agent-tools/docs/spec.md`, "Programs".
- `lib/proposals/service.ts`, `lib/proposals/program.ts`, `components/admin/proposals/ProposalActions.tsx` and `app/(app)/admin/proposals/[id]/page.tsx`.

## Notes from 014
- Order the checks in `revertProposal` like this. A proposal that isn't `applied` still gets `not_applied`. An applied `program.create` then gets `invalid`, before the null-`inverse` check (which would otherwise return `not_applied`).
- Old dev rows that still have an inverse don't matter: nothing on staging or prod has one.

## Done when
- `npm run test:run -- agent-tools proposals-approve-transaction` passes, and the full suite has no new failures.
- Type-check is clean, and biome and eslint are clean on the changed files.
- `deleteProgram` and any other code left unused by this change are removed.

## Don't touch
- Tests and `features/**`.

## Hand back
The handoff-implementer packet. First line: `Report: complete | needs decision | further handoff`. Send it to lead-ripit-mcp with SendMessage.

## Log
- 2026-10-26: created; waiting on 014.
- 2026-10-26 21:36 MDT: dispatched to implementer (running).
- 2026-10-26 21:39 MDT: handback (complete) saved as work/015-handback.md. Lead re-ran: 239/239, type-check clean.
- 2026-10-26 21:46 MDT: accepted by Dustin ("Ok this is great. Let's PR").
