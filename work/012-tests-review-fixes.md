---
id: 012
state: accepted
waiting_on: 
executor: test-builder
from: lead (lead-ripit-mcp)
confirmed: 2026-10-26 Dustin (slice 2 plan form; follow-up within confirmed scope)
updated: 2026-10-26
---
# Test fixes from the slice 2 review (red)

## Goal
Cover the reviewer's must-change items 1–3 with failing tests, and clean up the steps file (item 4). Item 013 makes the new tests pass. The review is in `work/011-handback.md`, under "Defects and risks".

## Do
1. In `__tests__/features/agent-tools/program-proposals.steps.ts` (unlock with `chmod u+w`, then re-lock), fix the biome import order at line 12 and remove the duplicate `program.count()` assertion near line 627. Change nothing else in that file.
2. New plain test file `__tests__/lib/proposals-approve-transaction.test.ts` (not a feature steps file). It should cover:
   - The approve transaction is started with a timeout of at least 30000 ms. Check this through a wrapped `prisma.$transaction`.
   - When the transaction rejects with a Prisma known-request error `P2028`, `approveProposal` returns `{ ok: false, code: 'invalid' }`. The proposal stays `pending`, with `error` set to text that mentions a timeout.
   - Approving a program proposal whose sets have `weight: ""` stores `weight: null`. An empty-after-trim exercise `notes` or week `name` also stores `null`.

## Done when
- `npm run test:run -- proposals-approve-transaction` fails for the right reasons: no timeout passed, P2028 not handled, and empty strings stored.
- Prove the check can pass: show the tests passing against a scratch fake, then failing with each fix broken. Delete the fake afterwards.
- `npx biome check __tests__/features/agent-tools/program-proposals.steps.ts` is clean, and `npm run test:run -- agent-tools` still passes 240/240.
- Both test files are left read-only.

## Don't touch
- `lib/`, `app/`, `features/**`, and any other test file.

## Hand back
The handoff-test-builder packet. First line: `Report: complete | needs decision | further handoff`.

## Log
- 2026-10-26: created from the 011 review's must-change list.
- 2026-10-26 20:31 MDT: dispatched to test-builder (running) with the V3 brief.
- 2026-10-26 20:35 MDT: handback (complete) saved as work/012-handback.md; it arrived by SendMessage after the check-in note. Lead re-ran: 5 failed for the right reasons, 241 passed, biome clean, files read-only. Accepted the reading of 'duplicate assertion'.
- 2026-10-26 21:46 MDT: accepted by Dustin ("Ok this is great. Let's PR").
