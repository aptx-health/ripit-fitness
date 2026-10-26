---
id: 008
state: accepted
waiting_on: 
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-10-25 Dustin
updated: 2026-10-25
---
# Agents read feedback and link proposals to it (green)

## Goal
Make the 007 tests pass. Add `list_feedback` and optional `feedbackId` on the propose tools. When a linked proposal is approved, its feedback is resolved. The admin detail page shows the linked feedback. After this, an agent can work through Dustin's feedback and turn it into proposals.

## Read first
- `initiatives/agent-tools/docs/spec.md`, section "Feedback".
- `features/agent-tools/feedback-to-proposals.feature`, and `__tests__/features/agent-tools/feedback-to-proposals.steps.ts` (the tests to make green).
- `lib/mcp/tools.ts`, `lib/proposals/service.ts`, `app/(app)/admin/proposals/[id]/page.tsx`.
- `app/api/feedback/route.ts`: the valid categories. Reuse them; don't copy the list.
- `AGENTS.md`, "Database and migrations". Note the warning about `db push` dropping BetterAuth tables.

## Done when
- All three agent-tools test files pass (`npm run test:run -- agent-tools`), and the full `npm run test:run` shows no new failures.
- Type-check is clean (`doppler run --project fitcsv --config dev_personal -- npm run type-check`), and eslint and biome are clean on the changed files.
- There is an additive migration for `Proposal.feedbackId`, applied to the worktree DB and resolved locally.
- One Playwright screenshot at 390px of a proposal detail page showing linked feedback, saved to `initiatives/agent-tools/docs/assets/008/`.
- The dev server is stopped again afterwards, and any tokens you created are revoked.

- `list_feedback` returns `{ feedback: [...] }` (pinned by the lead; the tests accept either shape). Invalid `status` or `category` returns a tool error with `field`, and the limit defaults to 20 with a max of 50. No scenario covers these, so add a plain unit test outside `__tests__/features/` if it's cheap.
- Resolve-on-approve must run inside the approve transaction. The tests can't see atomicity, so say in the packet how it is done.

## Decide alone
- Whether `feedbackId` is a foreign key (with `onDelete: SetNull`) or a plain string. Prefer the foreign key.
- How the detail page shows the feedback.

## Escalate to Dustin when
- A test looks wrong. Never edit, skip or weaken tests.
- The migration would touch existing rows or columns.

## Don't touch
- `__tests__/features/**`, `features/**`.
- The feedback submission API and the existing admin feedback pages, apart from linking to them.

## Hand back
The handoff-implementer packet, plus the migration name and the screenshot path.

## Log
- 2026-10-25: created (waiting on 007)
- 2026-10-25: confirmed by Dustin as written.
- 2026-10-25: Dustin pre-approved this feature. The lead may accept 007 and 008, and confirm any small follow-up items for this feature, without asking. The lead opens the PR to `dev`; Dustin merges.
- 2026-10-25: 007 accepted. State: ready.
- 2026-10-25 21:52 MDT: dispatched to implementer (running)
- 2026-10-25: handback received. Lead re-ran: agent-tools plus mcp-list-feedback 181/181, type-check clean. Migration 20261026035309_add_proposal_feedback_id is additive. Lead viewed the screenshot. Side effect: seeding posted 2 dev-only proposals to the real #proposals channel; AGENTS.md now says to blank the webhook when seeding. Lead accepted, under Dustin's pre-approval.
