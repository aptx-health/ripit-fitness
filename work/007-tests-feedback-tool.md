---
id: 007
state: accepted
waiting_on: 
executor: test-builder
from: lead (lead-ripit-mcp)
confirmed: 2026-10-25 Dustin
updated: 2026-10-25
---
# Write the failing tests for agents reading feedback (red)

## Goal
Make every scenario in `features/agent-tools/feedback-to-proposals.feature` executable. Each must fail only because `list_feedback`, `feedbackId` linking or the resolve-on-approve behaviour doesn't exist yet. Item 008 makes them pass. You write tests only.

## Read first
- `features/agent-tools/feedback-to-proposals.feature`: don't edit it.
- `initiatives/agent-tools/docs/spec.md`, sections "Feedback" and "Return shapes".
- `__tests__/features/agent-tools/exercise-proposals.steps.ts`: the existing style. Reuse its patterns (lazy loading, strict `{ ok, code }` and `isError` checks) in a new file. Don't edit that file.
- `prisma/schema.prisma`, `model Feedback`: the fields to seed.
- `docs/TESTING.md`: the Colima env vars and `npm run test:run`. Note: vitest-cucumber runs each step as its own test, so reset mocks once per scenario, never in afterEach.

## Done when
- `__tests__/features/agent-tools/feedback-to-proposals.steps.ts` binds every scenario.
- Every scenario fails for the right reason (missing tool, field or behaviour). Run `npm run test:run -- feedback-to-proposals`.
- **Prove the check can pass** (handoff-test-builder step 7). Build a scratch fake of the new behaviour, outside the repo, and confirm every scenario passes against it. Then break the fake at least once per Rule and confirm the targeted scenario fails. Remove the fake and report the runs.
- Assertions check database state, including `Proposal.feedbackId`, `Feedback.status` and `Feedback.adminNote`.
- `exercise-proposals` and `proposal-notifications` still pass.
- The new steps file is left read-only.

## Decide alone
- Fixtures, helpers and the shape of the fake.

## Escalate to Dustin when
- The feature and the spec disagree, or a scenario can't be tested against the contract.

## Don't touch
- `lib/`, `app/`, `prisma/`, `features/**`, and the other steps files.

## Hand back
The handoff-test-builder packet, including the pass-proof runs against the fake.

## Log
- 2026-10-25: created (ready)
- 2026-10-25: confirmed by Dustin as written.
- 2026-10-25 21:49 MDT: dispatched to test-builder (running)
- 2026-10-25: Dustin pre-approved this feature. The lead may accept 007 and 008, and confirm any small follow-up items for this feature, without asking. The lead opens the PR to `dev`; Dustin merges.
- 2026-10-25: handback received. Lead re-ran the agent-tools suites: 12 failed, all in feedback-to-proposals; 162 passed. The pass-proof is reported (52/52 against the fake; 11 broken variants, each caught). The 005 afterEach quirk is a false alarm: only a comment remains. Lead accepted, under Dustin's pre-approval.
