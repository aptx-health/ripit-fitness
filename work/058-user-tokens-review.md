---
id: 058
state: accepted
waiting_on: 
executor: reviewer
from: lead (lead-ripit-mcp)
confirmed: 2026-10-31 Dustin (no work-item sign-off forms for this initiative)
updated: 2026-10-31
---
# Review: TL5b User agent tokens and scoped notifications

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/user-agent-tokens`, stacked on TL6. The change is uncommitted. Change no files except your screenshots.

## Goal
Judge TL5b against its contract. This is a security-sensitive item. Read:
- the contract, the spec's "TL5b User agent tokens and scoped notifications";
- `features/training-library/user-agent-tokens.feature`;
- `docs/decisions.md` (editors count as non-admin);
- the tests: `user-agent-tokens.steps.ts`, `settings-agent-access-link.test.tsx`, and the agent-tools and suggestions steps files that now pass a role.

Don't read `work/057-handback.md` until your first pass is written.

## Focus
- **Token security:**
  - The secret appears only in the POST response, and only its hash is stored.
  - No route, log or page leaks the hash or the secret. Check logging calls too.
  - Revoking takes effect at once for MCP and for `/api/agent/export.csv`.
  - Tokens are owner-scoped: no route touches another user's token.
  - The limit is race-safe enough. Could two parallel POSTs create a 6th token? Judge whether that matters.
  - Rate limits.
- **Role gating:**
  - `listTools` and `callTool` hide and refuse the exercise-library tools for non-admins, editors included, before validation.
  - A missing role is least privilege.
  - `ownerRole` reads the role correctly and fails closed.
  - The admin token manager and admin routes are unchanged.
- **Notification gate:**
  - No non-admin proposal reaches `notify`, by any path, including `createProposal` called outside MCP if that exists.
  - Admins notify exactly as before.
- **UI:**
  - The secret lives only in component state.
  - The copy box behaves as specified.
  - Revoke has a confirmation.
  - At the limit, Create is disabled with a reason.
  - The wording never says "proposal".
  - The MCP URL is correct for prod: check how `NEXT_PUBLIC_APP_URL` is set in the deploy config, if it's visible in this repo.
- **Visual check:**
  - Take 390px screenshots with Chrome if it's connected, otherwise Playwright: Settings with the link, Agent access in its states, in light and dark.
  - Compare them with the other Settings subpages.
  - Save them to `initiatives/training-library/docs/assets/058/`.
  - Use a temporary user, and delete everything you create. Make no MCP calls with real notification URLs; keep `DISCORD_PROPOSALS_WEBHOOK_URL`, `DISCORD_WEBHOOK_URL` and `BARK_URL` blank.
  - Stop the server and DB.

## Done when
A verdict (ship / ship with notes / fix first), ranked findings with `file:line`, and a re-run of the TL5b, agent-tools and suggestions tests and tsc.

## Hand back
First line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-10-31 MDT: created; dispatched to reviewer (wF:p3).
- 2026-10-31 MDT: ship with notes. #1, #2, #3 (comment), #5, #6 and #7 go to the implementer; #4 to the test-builder; the build-time NEXT_PUBLIC_APP_URL for proposal links goes to the roadmap. Accepted.
