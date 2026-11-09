---
id: 159
state: waiting
waiting_on: 158
executor: coach-impl
from: lead (lead-ripit-mcp)
confirmed: 2026-11-09 Dustin (plan: 158 tests → 159 build → 160 review)
updated: 2026-11-09
---
# Build: admin agents manage the shared exercise library

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
Make 158's tests pass and cover every scenario. Reuse the Proposal table and Admin → Proposals page for applied direct changes (status applied, revertable) and for delete/merge (pending). Merge runs in one transaction and re-checks usage at approval. Tool descriptions tell the agent to search first and to propose a merge when delete is refused.

## Done when
158's tests pass unchanged (or each change explained); full suite and `npx tsc --noEmit` pass; a short manual MCP run against the local dev stack (create, update, propose delete, propose merge, approve, revert) with output in the handback.

## Don't
Weaken 158's tests. No migration unless unavoidable; if one is, stop and report (Needs a call). Never run migrate deploy or touch staging/prod.

## Hand back
Use `handoff-implementer`. First line `Report: complete | needs decision | further handoff`. Don't edit `work/`, `STATE.md` or `status.md`. Send the packet with `herdr agent prompt wE:p1 '<packet>'`.

## Log
- 2026-11-09 CST: created; waits on 158.
