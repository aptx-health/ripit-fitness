---
id: 004
state: accepted
waiting_on: 
executor: implementer
from: lead (ripit-fitness-9b)
confirmed: 2026-10-25 Dustin
updated: 2026-10-25
---
# Admin Proposals and Agent tokens pages, plus the revert conflict check (green)

## Goal
Give Dustin a place to see and decide agent proposals and to manage agent tokens, and make revert refuse when the exercise changed after approval. Once this is in, the whole flow works end to end apart from the Bark push.

## Read first
- `initiatives/agent-tools/docs/spec.md`: the Admin UI row, the revert rule and Return shapes.
- `features/agent-tools/exercise-proposals.feature`: the scenario "Reverting an update is refused when the exercise changed afterwards".
- `lib/proposals/service.ts`: `revertProposal`, and where approve writes `inverse`.
- `app/api/admin/proposals/**` and `app/api/admin/agent-tokens/**`: the APIs you built in 002.
- `components/admin/AdminSidebar.tsx`, `lib/admin/workbench-counts.ts`, and an existing admin page such as `app/(app)/admin/feedback`: patterns to match.
- `docs/STYLING.md` (theme tokens) and `docs/PLAYWRIGHT_RECIPES.md` (login and selectors).

## Done when
- `npm run test:run -- exercise-proposals` passes, including the new scenario. The full `npm run test:run` shows no new failures.
- `doppler run --project fitcsv --config dev_personal -- npm run type-check` is clean, and eslint and biome are clean on the changed files.
- Playwright screenshots exist at 390px and desktop width for:
  1. the proposals list with pending and applied items;
  2. a pending update proposal's detail page showing the field diff;
  3. the page after approving;
  4. a refused revert showing its error;
  5. the tokens page right after a create, with the plaintext showing.
  Seed the data through the MCP endpoint with a dev token. Save the screenshots under `initiatives/agent-tools/docs/assets/004/` and list them in the packet.
- Agent-supplied text is rendered as plain text, with no `dangerouslySetInnerHTML`.
- Revoke the leftover "smoke-check" token from 002.

## Decide alone
- Layout, component split and copy, within the existing admin patterns and theme tokens.
- Whether the revert check stores the post-apply `updatedAt` on the proposal or inside `inverse`. A schema change needs a migration, per AGENTS.md.

## Escalate to Dustin when
- A test looks wrong: stop and report it. Never edit, skip or weaken tests.
- The design needs a new dependency.

## Don't touch
- `__tests__/features/**`, `features/**`.
- The MCP tool list and its behaviour.

## Hand back
The handoff-implementer packet, plus the screenshot list and any migration name.

## Log
- 2026-10-25: created (waiting on 003)
- 2026-10-25: confirmed by Dustin as written (executor: the implementer herdr agent).
- 2026-10-25: 003 tests are red as intended. State: ready.
- 2026-10-25 21:00 MDT: dispatched to implementer (running)
- 2026-10-25: handback received (checks out). Lead re-ran exercise-proposals: 104/104 passed. Type-check is clean apart from the expected missing module in the 005 test. No dangerouslySetInnerHTML. Lead viewed the screenshots (list, diff, revert conflict) and they look correct. No migration: `appliedUpdatedAt` is stored in `inverse`. Every dev token is revoked. State: review.
- 2026-10-25: accepted by Dustin as is (Hub review page review-003-005).
