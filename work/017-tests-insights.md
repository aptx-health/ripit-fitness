---
id: 017
state: accepted
waiting_on: 
executor: test-builder
from: lead (lead-ripit-mcp)
confirmed: 2026-10-27 Dustin (slice 3 plan form and scenario form)
updated: 2026-10-27
---
# Tests for training insight tools (red)

Checkout: `~/projects/worktrees/ripit-fitness/worktree2` (branch `feature/agent-insights`). Work only there.

## Goal
Failing tests for every scenario in `features/agent-tools/training-insights.feature`, written against the contract in `initiatives/agent-tools/docs/spec.md`, section "Training insights". Item 018 makes them pass.

## Do
1. `__tests__/features/agent-tools/training-insights.steps.ts`, in the style of the other steps files there. It calls `callTool` directly, against a real test DB, and seeds logged history through Prisma with explicit dates.
2. Assert exact numbers (change percent, sessions since best, coverage, distribution, nulls) on hand-computed seeds. There are no verdicts or flags to test.
3. Cover arg validation: an out-of-range `sessions` or `weeks` gives a tool error with `field`.
4. Lock the steps file read-only when done (`chmod a-w`), as before.

## Done when
- `npm run test:run -- training-insights` fails because the tools don't exist yet, not because of seeding or syntax.
- Prove the check can pass: a scratch fake passes it, then breaking each rule (warmup filter, unit conversion, sort order, RIR conversion, nulls) fails its scenario. Delete the fake afterwards.
- `npm run test:run -- agent-tools` passes everything else, and biome is clean on the new file.

Env: `DOCKER_HOST=unix:///Users/dustin/.colima/default/docker.sock TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock TESTCONTAINERS_RYUK_DISABLED=true`. The Prisma client is generated, and the suite runs green in worktree2.

## Don't touch
`lib/`, `app/`, `features/**`, the spec, and other test files.

## Hand back
The handoff-test-builder packet. First line: `Report: complete | needs decision | further handoff`.

## Log
- 2026-10-27: created; scenarios and thresholds confirmed by Dustin. Dispatched to test-builder (wF:p1).
- 2026-10-27: contract changed by Dustin mid-item: raw numbers only (no verdicts, flags, thresholds or minSessions). The spec and .feature were rewritten (10 scenarios), and test-builder was told.
- 2026-10-27: handback (complete) saved. Lead re-ran: 33 failed (missing tools only), 274 other agent-tools pass, file read-only, biome clean. Ambiguities pinned in the spec: best ties go to the newest session, repRange is over the best sets, round on output, ISO week bounds.
- 2026-10-27: accepted by Dustin ("Accepted"; answers 1A, 2B, 3A, carried into item 020).
