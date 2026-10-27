---
id: 001
state: accepted
waiting_on:
executor: sonnet subagent (lead session)
from: lead (ripit-agent-tools worktree)
confirmed: 2026-10-25 Dustin
updated: 2026-10-25
---
# Write the failing tests for agent proposals (red)

## Goal
Make every scenario in `features/agent-tools/exercise-proposals.feature` executable and failing for the right reason (missing implementation), so the implementer in `002` has a fixed target. You write tests only; you do not see or write the implementation.

## Read first
- `features/agent-tools/exercise-proposals.feature`: the behaviour. Do not edit it; report wording problems instead.
- `initiatives/agent-tools/docs/spec.md`: module paths and function signatures you code against.
- Conventions: tests use Testcontainers (Docker must be running; no Doppler needed), call lib functions directly with a `PrismaClient` (no HTTP), and verify DB state. Run with `npm run test:run`, never bare `npm test` (watch mode).
- `lib/test/database.ts`, `lib/test/factories.ts`: test harness and factories.
- `lib/validators/exercise-definition.ts`: valid FAU and equipment values for fixtures.
- `__tests__/api/exercise-search.test.ts`: an existing test to match in style.

## Done when
- `@amiceli/vitest-cucumber` is a devDependency, and Vitest picks up the step files (adjust `vitest.config.ts` only as needed).
- Step definitions live at `__tests__/features/agent-tools/exercise-proposals.steps.ts` and bind every scenario.
- `npm run test:run -- exercise-proposals` runs every scenario, and each fails because the spec's modules or exports don't exist yet, not because of a typo or harness error.
- The rest of the suite is unaffected (`npm run test:run` shows no new failures outside the new file).
- Assertions check database state, not just return values.

## Decide alone
- Fixture details, helper functions inside the steps file, and how to inject a failing `notify`.
- Small new factories in `lib/test/factories.ts` (add, don't change existing ones).

## Escalate to Dustin when
- A scenario can't be tested against the spec's contract as written.
- The spec and the feature disagree.

## Don't touch
- `features/**` (owned by the lead and Dustin).
- Any non-test source: `lib/` (except new factories), `app/`, `prisma/`.

## Hand back
The handoff-test-builder packet, plus: a list of each scenario name and its current failure message (first line only).

## Log
- 2026-10-25 20:23 MDT: created (ready)
- 2026-10-25 20:41 MDT: confirmed by Dustin (scenarios, guardrails as written; executor Sonnet subagent)
- 2026-10-25 20:41 MDT: dispatched to Sonnet subagent (running)
- 2026-10-25 21:10 MDT: Handback received. Lead re-ran `npm run test:run -- exercise-proposals`: 71 failed, 25 passed. Every failure is a missing module or model. The 25 passes are Background fixtures and negative Then steps that pass vacuously, which is expected while red. Nine spec gaps were pinned in spec.md (Return shapes). State: review, awaiting Dustin's acceptance.
- 2026-10-25 20:34 MDT: correction: the lead wrote the 20:41, 20:55 and 21:10 timestamps above as estimates. The real times were earlier (about 20:25 to 20:34 MDT).
- 2026-10-25: accepted by Dustin. The two loose checks (Bark link, error shapes) become follow-ups in 003.
