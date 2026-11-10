---
id: 158
state: accepted
waiting_on:
executor: test-builder
from: lead (lead-ripit-mcp)
confirmed: 2026-11-09 Dustin (plan: 158 tests → 159 build → 160 review; decisions below)
updated: 2026-11-09
---
# Tests: admin agents manage the shared exercise library

Checkout: worktree1, branch `feature/library-mcp` (from origin/dev). Run `npx prisma@6.19.0 generate` first. Tests: `export DOCKER_HOST=unix://$HOME/.colima/default/docker.sock TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock && npx vitest run`.
Spec: `features/agent-tools/library-management.feature` (builds on `features/agent-tools/exercise-proposals.feature`; contract `initiatives/agent-tools/docs/spec.md`).

## Decisions (Dustin, 2026-11-09)
- Admin agents: create and update apply directly; delete and merge are proposals Dustin approves.
- Delete only unused exercises; used ones go through merge (move every use, add the old name as an alias, delete).
- Creates default to the shared library; scope "mine" makes a personal custom one.
- Direct changes are recorded in Admin → Proposals as applied (before/after) and are revertable; delete and merge are not.

## Where things are
- MCP tools: `lib/mcp/tools.ts` (`ADMIN_ONLY_TOOLS`, `listTools`, `callTool`), route `app/api/mcp/route.ts` (owner role lookup).
- Proposals: `lib/proposals/service.ts`, `lib/proposals/exercise-definition.ts` (`createData` sets `isSystem: false` today), `lib/proposals/decision-route.ts`; Admin page `app/(app)/admin/proposals`.
- Model: `ExerciseDefinition` in `prisma/schema.prisma` (find every relation to it for merge: `Exercise`, `UserExercisePreference`, `PinnedExercise`, and any others). System seed: `prisma/seed.ts:145`.
- Admin exercise API with usage counts: `app/api/admin/exercise-definitions/[id]/route.ts`.
- Rate limits: `docs/RATE_LIMITING.md`.

## Do
Write the failing tests for every scenario in the .feature (MCP tool level against the test DB, plus Admin approve/revert where the scenario needs it), before any implementation exists. Put the scenario name in each test. Prove the tests can fail (break-matrix where useful). Write a short check script or note that 159 is judged against.

## Done when
Every scenario maps to at least one test; the tests fail for the right reason on the current branch; existing suite still passes apart from the new tests.

## Don't
Implement the feature. No migrations.

## Hand back
Use `handoff-test-builder`. First line `Report: complete | needs decision | further handoff`. Don't edit `work/`, `STATE.md` or `status.md`. Send the packet with `herdr agent prompt wE:p1 '<packet>'`.

## Log
- 2026-11-09 CST: created; plan confirmed by Dustin; dispatched to test-builder (wE:p9).
- 2026-11-09 CST: back complete: 32 step tests for 17 scenarios in __tests__/features/agent-tools/library-management.steps.ts; red only on missing tools; break matrix 32/32. Lead calls: pins/preferences count as use (per spec); merge also moves anchors and any other relation; contract header goes into initiatives/agent-tools/docs/spec.md (159).
- 2026-11-09 CST: Dustin on the phone preview: "It seems to work fine". Accepted.
