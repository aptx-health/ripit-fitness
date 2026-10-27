---
id: 009
state: accepted
waiting_on: 
executor: test-builder
from: lead (lead-ripit-mcp)
confirmed: 2026-10-26 Dustin
updated: 2026-10-26
---
# Write the failing tests for program proposals (red)

## Goal
Make every scenario in `features/agent-tools/program-proposals.feature` executable. Each must fail only because `get_program`, `propose_program_create` or the `program.create` approve and revert behaviour doesn't exist yet. Item 010 makes them pass. Write tests only.

## Read first
- `features/agent-tools/program-proposals.feature`. Don't edit it.
- `initiatives/agent-tools/docs/spec.md`, sections "Programs" and "Return shapes".
- `__tests__/features/agent-tools/exercise-proposals.steps.ts` and `feedback-to-proposals.steps.ts`, for style. Reuse their patterns in a new file; don't edit either one.
- `prisma/schema.prisma`: models `Program`, `Week`, `Workout`, `Exercise`, `PrescribedSet`, `WorkoutCompletion`.
- `docs/TESTING.md`: the Colima env vars and `npm run test:run`. Reset mocks once per scenario, never in afterEach.

## Done when
- `__tests__/features/agent-tools/program-proposals.steps.ts` binds every scenario.
- Every scenario fails for the right reason. Check with `npm run test:run -- program-proposals`.
- **Prove the check can pass.** Write a scratch fake outside the repo and show every scenario passing against it. Then break the fake at least once per Rule and show the targeted scenario failing. Report the runs, then delete the fake.
- Assertions check database state: program, week, workout, exercise and set counts and fields; `isActive`; `isUserCreated`; and the proposal's `status`, `targetId` and `error`.
- The other agent-tools steps files still pass.
- The new steps file is left read-only.

## Decide alone
- Fixtures, helpers and the shape of the fake.

## Escalate to Dustin when
- The feature and the spec disagree, or a scenario can't be tested against the contract.

## Don't touch
- `lib/`, `app/`, `prisma/`, `features/**`, and the other steps files.

## Hand back
The handoff-test-builder packet, including the pass-proof runs. First line: `Report: complete | needs decision | further handoff`.

## Log
- 2026-10-26: created; confirmed by Dustin in the slice 2 plan form (scope, scenarios, rules, team).
- 2026-10-26 20:07 MDT: dispatched to test-builder (running) with the V3 brief via herdr agent prompt.
- 2026-10-26 20:21 MDT: handback saved as work/009-handback.md (Report: complete). Lead re-ran agent-tools: 24 failed, all in program-proposals, 216 passed. 11/11 scenarios bound; file read-only. The assumptions it lists match the spec. Awaiting Dustin's final review with the slice.
- 2026-10-26 21:46 MDT: accepted by Dustin ("Ok this is great. Let's PR").
