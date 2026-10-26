---
id: 006
state: accepted
waiting_on: 
executor: implementer
from: lead (ripit-fitness-9b)
confirmed: 2026-10-25 Dustin
updated: 2026-10-25
---
# Send proposal notifications to Discord (green)

## Goal
Make the 005 tests pass by adding `lib/notify/discord.ts` and the fan-out `lib/notify/index.ts`, then wire the fan-out into proposal creation and the MCP route. After this, a new proposal posts to Dustin's #proposals channel.

## Read first
- `initiatives/agent-tools/docs/spec.md`, section "Notifications".
- `features/agent-tools/proposal-notifications.feature`.
- `__tests__/features/agent-tools/proposal-notifications.steps.ts`: the tests to turn green.
- `lib/notify/bark.ts`, `lib/proposals/service.ts` (the default `notify`), `app/api/mcp/route.ts`.

## Done when
- `npm run test:run -- proposal-notifications` and `-- exercise-proposals` both pass, and the full `npm run test:run` shows no new failures.
- Type-check is clean (`doppler run --project fitcsv --config dev_personal -- npm run type-check`), and eslint and biome are clean on the changed files.
- A live check is in the packet. With the dev server on :3100 started under Doppler `dev_personal` (which has `DISCORD_PROPOSALS_WEBHOOK_URL`), create one proposal through the MCP endpoint. Dustin confirms the message appeared in #proposals, and its link opens the 004 detail page.

- A fetch that rejects (network error) must also resolve and log, not throw. The tests only cover a 429.

## Decide alone
- Internal helpers, and whether `bark.ts` shares a `clean()` util with `discord.ts`.

## Escalate to Dustin when
- A test looks wrong. Never edit, skip or weaken tests.
- The live message doesn't arrive and the cause isn't in the code (webhook, Doppler).

## Don't touch
- `lib/discord.ts` (feedback webhook), `__tests__/features/**`, `features/**`.

## Hand back
The handoff-implementer packet, plus the live-check result.

## Log
- 2026-10-25: created (waiting on 005 and on 004, which is editing nearby files)
- 2026-10-25: confirmed by Dustin as written.
- 2026-10-25: 005 tests are red. Still waiting on 004.
- 2026-10-25: 004 is in review. State: ready.
- 2026-10-25 21:09 MDT: dispatched to implementer (running)
- 2026-10-25: paused at Dustin's request ("slow down") before any changes. The implementer confirms nothing was edited. Resumes after Dustin reviews 003, 004 and 005.
- 2026-10-25: resumed after Dustin accepted 003, 004 and 005.
- 2026-10-25: implementer stopped. The 005 steps file calls `vi.restoreAllMocks()` in afterEach, which wipes mock calls between steps; lead verified this in node_modules/@vitest/spy. Dustin authorized the implementer to fix the 005 steps file, limited to the mock cleanup; this is a one-off exception to the don't-touch rule. He also approved running the live check now.
- 2026-10-25: handback received. Lead re-ran the agent-tools tests: 122/122 passed. The steps-file change is cleanup only, and the deliberate break caught it. The live check is blocked because this machine's Doppler CLI token can't read any fitcsv/dev_personal secrets (it lists only the DOPPLER_* keys). Waiting on Dustin for Doppler access.
- 2026-10-25: Doppler fixed. The token was directory-scoped to the primary checkout; Dustin copied it to the worktrees scope, and the worktree now sees DISCORD_PROPOSALS_WEBHOOK_URL. Live check resumed.
- 2026-10-25: live check passed. Proposal cmvop7w1t0001vrajvz9602xw posted 21:30 MDT; Dustin confirmed the message arrived as described. The token is revoked. State: review.
- 2026-10-25: accepted by Dustin.
