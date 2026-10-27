---
id: 003
state: accepted
waiting_on: 
executor: test-builder
from: lead (ripit-fitness-9b)
confirmed: 2026-10-25 Dustin
updated: 2026-10-25
---
# Tighten the proposal tests and add the revert-conflict scenario (red)

## Goal
Make the proposal tests enforce the return shapes in the spec, and add a failing test for the new scenario "Reverting an update is refused when the exercise changed afterwards". Item 004 then makes it pass. You write tests only.

## Read first
- `features/agent-tools/exercise-proposals.feature`: the new scenario sits just before "Reverting an unused new exercise removes it".
- `initiatives/agent-tools/docs/spec.md`, sections "Rules" (the revert rule) and "Return shapes".
- `__tests__/features/agent-tools/exercise-proposals.steps.ts`: the existing steps. The file is read-only; unlock it with `chmod u+w` and re-lock it with `chmod a-w` when done.
- `initiatives/agent-tools/docs/2026-10-25-001-test-review.md`, "Weak spots" 1 to 3.
- `docs/TESTING.md`: the Colima env vars and `npm run test:run`.

## Done when
- Notify: the test asserts the payload is `{ proposalId, title, body, url }` and that `url` ends with `/admin/proposals/<id>`.
- Service refusals: the tests assert `{ ok: false, code }` with the exact codes: `not_pending` for approve-twice, `in_use` for the in-use revert, `conflict` for the stale approve and the new scenario. The loose "thrown or any shape" helper is gone for these paths.
- Tool errors: the tests assert `isError: true` plus the payload `field` (validation) and `existingId` (duplicate).
- The stale-approve scenario also asserts that approve returned `code: 'conflict'`.
- The new scenario is bound and fails only because revert doesn't check yet. Every other scenario still passes. Run `npm run test:run -- exercise-proposals`.

## Decide alone
- Helper refactors inside the steps file.
- How to simulate "edited after it was applied".

## Escalate to Dustin when
- The current implementation contradicts a pinned return shape in a way that looks like a spec problem rather than a bug.

## Don't touch
- `lib/`, `app/`, `prisma/`, `features/**`.

## Hand back
The handoff-test-builder packet, plus a list of which existing assertions got stricter and whether each one passes against the current implementation.

## Log
- 2026-10-25: created (ready)
- 2026-10-25: confirmed by Dustin as written (executor Sonnet test-builder in a herdr tab).
- 2026-10-25 20:59 MDT: dispatched to test-builder (running)
- 2026-10-25: handback received. Lead re-ran: 101 passed, 3 failed. All 3 failures are steps of the new revert-conflict scenario. The six stricter assertions pass against 002. The steps file is still read-only. State: review.
- 2026-10-25: accepted by Dustin as is (Hub review page review-003-005).
