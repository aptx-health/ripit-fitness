---
id: 048
state: accepted
waiting_on: 
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-10-31 Dustin (no work-item sign-off forms for this initiative)
updated: 2026-10-31
---
# Build: TL5a Coach Suggestions

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/coach-suggestions`, stacked on TL4 (#1009). Don't commit.

## Goal
Build TL5a so its tests pass. Read:
- the contract, `initiatives/training-library/docs/spec.md` ("TL5a Suggestions for users");
- the behaviour, `features/training-library/coach-suggestions.feature`;
- the tests and seams, `work/047-handback.md`, and the header of `coach-suggestions.steps.ts`;
- the locked test files: `coach-suggestions.steps.ts`, `suggestions-view.test.tsx`, and the updated `training-home.steps.ts`, `training-home-view.test.tsx`, `pinned-workouts-view.test.tsx` and `nav-active-tab.test.tsx`.

## Do
1. **Build the seams as named.**
   - Lift the admin detail page's per-kind logic (`balanceRows`, `savedWorkoutRows`, `programDetail` and the outline components) into shared code under `lib/suggestions/` and `components/suggestions/`, used by both the admin page and the review screen.
   - The admin page must look and behave the same for admins.
2. **Page glue:**
   - `app/(app)/suggestions/page.tsx` (the list) and `app/(app)/suggestions/[id]/page.tsx` (review). The review page calls `notFound()` on a null detail, so the HTTP status is a real 404, as in TL1.
   - `/training` passes `suggestions` through.
3. **Lead decisions:**
   - An admin-reverted suggestion shows the outcome "Undone", with no buttons.
   - User routes are rate limited the way other user routes are.
   - Accepting a program uses the service's existing approve. Don't add a cap check.
4. **Self-check visually:**
   - Take phone-width screenshots: Training with the Suggestions section (1 and 3+ pending), `/suggestions`, the review screen for each kind (workout create, workout update, program, anchors, targets), the "Make it active?" step, an outcome view, and the admin detail page before and after the lift (to show it's unchanged).
   - Use Chrome if it's connected, otherwise Playwright.
   - Save them in `initiatives/training-library/docs/assets/048/`.
   - Seed suggestions on the wt2 dev DB through MCP `callTool` or the service, with **`DISCORD_PROPOSALS_WEBHOOK_URL`, `DISCORD_WEBHOOK_URL` and `BARK_URL` blank**, so nothing reaches Dustin's real channels.
   - Clean up what you seed: reject them, or delete the rows and anything an accept created.
   - Stop the server and DB afterwards.
5. **Run the check:**
   - all training-library, nav and suggestions tests;
   - all agent-tools tests (the service and admin are shared);
   - the full suite;
   - `npx tsc --noEmit`;
   - biome on the changed files.

## Done when
- The TL5a tests are green, and so are TL1–TL4 and agent-tools.
- The full suite passes and tsc is clean.
- The screenshots exist.
- The admin detail page is unchanged.

## Don't touch
- The test files.
- `work/`, `STATE.md`, status files.
- No schema change.
- No real notifications.

## Hand back
The `handoff-implementer` packet. First line: `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-10-31 MDT: created; dispatched to implementer (wF:p2).
- 2026-10-31 MDT: handback saved. Lead re-ran: 2197 passed, tsc clean. Seen in the screenshot: target summaries use keys and include a no-op (quads 1.3 → 1.3). Review 049 dispatched.
- 2026-10-31 MDT: review 049 fixes sent: suggestionTitle, review h1 size, error wording and trimmed data, GET rate limits.
- 2026-10-31 MDT: retry in; test-builder added 26 tests (31/31 real breaks killed). Lead re-ran: full suite green, tsc clean. Preview up; waiting on Dustin.
- 2026-10-31 MDT: Dustin on the preview: everything works; the design refinement goes to TL6 (folder tabs). Accepted.
