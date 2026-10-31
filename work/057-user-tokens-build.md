---
id: 057
state: accepted
waiting_on: 
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-10-31 Dustin (no work-item sign-off forms for this initiative)
updated: 2026-10-31
---
# Build: TL5b User agent tokens and scoped notifications

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/user-agent-tokens`, stacked on TL6 (#1011). Don't commit.

## Goal
Build TL5b so its tests pass. Read:
- the contract, `initiatives/training-library/docs/spec.md` ("TL5b User agent tokens and scoped notifications");
- the behaviour, `features/training-library/user-agent-tokens.feature`;
- the tests and seams, `work/056-handback.md`, and the header of `user-agent-tokens.steps.ts`;
- the locked test files, including the 7 agent-tools steps files that now pass `role`.

## Do
1. **Build the seams as named.**
2. **Lead decisions:**
   - "Admin" means the role `isAdminRole` accepts, so editors count as non-admin: they can't see the admin proposals page, so they must not create exercise-library proposals or trigger notifications.
   - Check the `forbidden` role before argument validation, so non-admins learn nothing about the tool.
   - Read the role the same way auth does (`lib/auth/server.ts`).
3. **Page glue:**
   - `app/(app)/settings/agent-access/page.tsx` renders `AgentAccess` with `<origin>/api/mcp`. Derive the origin the way the app already does for absolute URLs, e.g. `NEXT_PUBLIC_APP_URL`.
   - Add the Settings link next to Muscle Balance.
4. **Self-check visually:**
   - Take phone-width screenshots: Settings with the link, Agent access empty, after create (with the copy box), the list with a revoked token, and the limit state.
   - Use Chrome if it's connected, otherwise Playwright.
   - Save them in `initiatives/training-library/docs/assets/057/`.
   - Use the wt2 dev DB. Revoke and delete any tokens you make. Send no notifications (blank `DISCORD_PROPOSALS_WEBHOOK_URL`, `DISCORD_WEBHOOK_URL` and `BARK_URL`). Stop the server and DB.
5. **Run the check:**
   - the TL5b files;
   - all agent-tools tests;
   - the full suite;
   - `npx tsc --noEmit` (the `listTools('admin')` errors must be gone);
   - biome on the changed files.

## Done when
- The TL5b tests are green, and so are all other tests.
- tsc is clean.
- The screenshots exist.
- No real notification was sent.

## Don't touch
- The test files.
- `work/`, `STATE.md`, status files.
- No schema change.

## Hand back
The `handoff-implementer` packet. First line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-10-31 MDT: created; dispatched to implementer (wF:p2).
- 2026-10-31 MDT: handback saved; the test-builder fixed the role-less seeds. Lead re-ran: 2369 passed, tsc clean. Review 058 dispatched.
- 2026-10-31 MDT: review 058 fixes sent: runtime MCP URL, limit lock, notify comment, accessibility, matching the subpage style, the limit while loading.
- 2026-10-31 MDT: 058 fixes in (appOrigin from BETTER_AUTH_URL at runtime, advisory-lock limit, accessibility, Settings style). Lead re-ran: full suite green, tsc clean. Preview up; waiting on Dustin.
- 2026-10-31 MDT: Dustin: "Okay looks great" on the phone preview. Accepted.
