---
id: 061
state: accepted
waiting_on:
executor: test-builder
from: lead (lead-ripit-mcp)
confirmed: 2026-11-01 Dustin ("do all of them", stacked PRs)
updated: 2026-11-01
---
# UI1 tests: shared folder pieces

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/ui-shared`. Write tests only; no app code.

## Read
- `initiatives/ui-audit/spec.md` (UI1) and `features/ui-audit/shared-folder-pieces.feature`.
- `components/training/TabbedBlock.tsx`, `SectionTab.tsx`, and their existing tests (`tests/components/**`), `middleware.ts`, `app/layout.tsx`.

## Do
Write failing tests that cover every scenario in the .feature, against the interfaces the spec names (`PaperTabs` with `value`/`onChange`/optional link tab; the middleware `config.matcher`; the `metadata`/`viewport` exports of `app/layout.tsx`). Pin the `PaperTabs` import path and props you assume at the top of the test file so the implementer matches them. Keep existing TabbedBlock tests passing as the "behaves as before" check. Prove the new tests can fail (break matrix, small batches).

Run: `export DOCKER_HOST=unix://$HOME/.colima/default/docker.sock TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock && npm run test:run -- <paths>`.

## Done when
Tests exist for each scenario, fail for the right reason now, and the break matrix shows each can catch its break.

## Hand back
Packet with test paths, the assumed interface, and the scenario → test map. First line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-01 MDT: created; dispatched to test-builder (wF:p1).
- 2026-11-01 MDT: handback received; lead re-ran: 53 red for missing code, behaviour file green. Accepted (lead may accept test items).
