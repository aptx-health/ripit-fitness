---
id: 056
state: accepted
waiting_on: 
executor: test-builder
from: lead (lead-ripit-mcp)
confirmed: 2026-10-31 Dustin (no work-item sign-off forms for this initiative)
updated: 2026-10-31
---
# Tests: TL5b User agent tokens (red)

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/user-agent-tokens`, stacked on TL6 (#1011) and the rest of the chain. Don't commit.

## Goal
Write the tests TL5b will be judged against, before it is built. Read:
- the contract, `initiatives/training-library/docs/spec.md` ("TL5b User agent tokens and scoped notifications");
- the behaviour, `features/training-library/user-agent-tokens.feature`;
- the existing code: `lib/agent-tokens.ts`, `app/api/admin/agent-tokens/**`, `components/admin/proposals/AgentTokensManager.tsx`, `lib/mcp/tools.ts` (`callTool`, tool listing), `lib/proposals/service.ts` (the `notify` call at about :337), `lib/notify/`, and `app/(app)/settings/page.tsx`;
- the agent-tools tests under `__tests__/features/agent-tools/` (especially `proposal-notifications.steps.ts`), which show how tokens, `callTool` and `notify` are tested.

## Do
1. **Choose seams and name them precisely.** For example:
   - the three route handlers, called directly with mocked auth;
   - the Agent access page component rendered with Testing Library;
   - `callTool` and the tool listing, with a token-owner context carrying a role;
   - the service's `notify` gate.
2. **Update any locked agent-tools test** that assumes every proposal notifies, or that every tool is listed for every user. List each one you change.
3. **Write the tests.** Cover every scenario as steps, plus edges:
   - name validation: empty, whitespace, and 51 characters;
   - the secret is only in the POST response;
   - the hash is never returned;
   - the limit counts only active tokens, so revoked ones free a slot;
   - revoking twice is OK;
   - 404 for another user's or an unknown id;
   - 401 with no user;
   - a revoked token can't resolve;
   - the tool list differs by role;
   - a refused call writes nothing and doesn't notify;
   - admin and non-admin notify behaviour;
   - the copy box disappears after a reload or remount;
   - the MCP address is shown;
   - the Settings link exists.
4. **Lock the files read-only.**
5. **Prove the tests can fail** with the break matrix.

## Done when
- Every scenario is covered.
- The tests are red only for missing TL5b code.
- Every other test file still passes, apart from the ones you deliberately updated.
- The breaks are killed.

## Don't touch
- Non-test code.
- `work/`, `STATE.md`, status files.

## Hand back
The `handoff-test-builder` packet, with the seams spelled out. First line: `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-10-31 MDT: created; dispatched to test-builder (wF:p1).
- 2026-10-31 MDT: handback saved (93 tests, 55/55 breaks). Lead: role comes from the user table; editors count as non-admin (isAdminRole). Accepted.
