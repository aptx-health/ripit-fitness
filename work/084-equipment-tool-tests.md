---
id: 084
state: accepted
waiting_on:
executor: test-builder
from: lead (lead-ripit-mcp)
confirmed: 2026-11-01 Dustin ("yes kick that mcp task off")
updated: 2026-11-01
---
# Agent tools: get_equipment (tests)

Checkout: `~/projects/worktrees/ripit-fitness/worktree4` (new), branch `feature/agent-equipment`, from `origin/dev`. Run `npm ci` and `npx prisma@6.19.0 generate` first. Lead files are in worktree2. Write tests only; no app code.

## Goal
The MCP agent can't see the user's available equipment (`UserTrainingProfile.equipmentAvailable` / `equipmentAvailableSet`, edited at `/settings/equipment`), so proposals can use equipment the user doesn't have. Add a read-only tool `get_equipment`, in the style of `get_anchors` / `get_balance_targets` (`lib/mcp/tools.ts`: input schema, description, handler, `readOnlyHint` annotation). Returns raw data, no verdicts. Out of scope: changing equipment (no propose tool) and the CSV export.

## Read
`features/agent-tools/equipment.feature` (worktree4); `lib/mcp/tools.ts`; the existing MCP tool tests (find them with `rg get_anchors __tests__`); `lib/user-training-profile.ts` (`equipmentAvailableSet` semantics, #927) and `lib/equipment-availability.ts` (normalisation, the full-gym default).

## Do
Write failing tests for every scenario against: tool name `get_equipment`, empty input, result `{ equipment: string[], isSet: boolean, ... }` where `isSet` false means "no record, app assumes a full commercial gym" and `equipment` is then the list the app actually assumes (whatever `lib/equipment-availability.ts` uses). Pin the result shape at the top of the file. Scope to the token's user. Check the `readOnlyHint` annotation and that the tool is listed. Prove the tests can fail (break matrix, small batches). Lock them read-only.

Run: `export DOCKER_HOST=unix://$HOME/.colima/default/docker.sock TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock && npm run test:run -- <paths>`.

## Hand back
Packet with test paths, the pinned shape, scenario → test map. First line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-01 MDT: created at Dustin's request (runs in parallel with the UI stack); dispatched to test-builder (wF:p1). Worktree4 created for it.
- 2026-11-01 MDT: back; lead re-ran (red). Accepted, with the Commercial Gym default and legacy rows as set.
