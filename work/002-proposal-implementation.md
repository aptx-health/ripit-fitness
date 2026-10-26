---
id: 002
state: accepted
waiting_on: 
executor: implementer
from: lead (ripit-agent-tools worktree)
confirmed: 2026-10-25 Dustin
updated: 2026-10-25
---
# Implement the MCP server and proposal flow (green)

## Goal
Make the tests from `001` pass by building what `initiatives/agent-tools/docs/spec.md` describes: the `AgentToken` and `Proposal` models, token helpers, proposal service, MCP tools and route, admin proposal API, and the Bark notifier. No admin UI yet; that is `003`.

## Read first
- `docs/TESTING.md`: the Colima env vars needed to run tests on this Mac.
- `initiatives/agent-tools/docs/spec.md`: the contract. Paths and signatures are fixed.
- `features/agent-tools/exercise-proposals.feature`: the behaviour.
- `__tests__/features/agent-tools/exercise-proposals.steps.ts`: the tests you must turn green.
- `AGENTS.md`: the migration process (db push **and** a migration file), API route pattern, logging, rate limiting, the 1000-line file limit.
- `app/api/admin/exercise-definitions/[id]/route.ts` and `lib/validators/exercise-definition.ts`: existing create/update logic to reuse.
- `lib/admin/auth.ts`, `lib/rate-limit.ts`: auth and limiter helpers.

## Done when
- `npm run test:run -- exercise-proposals` passes, every scenario.
- `npm run test:run` overall shows no new failures.
- `doppler run --config dev_personal -- npm run type-check` and `npm run lint` pass.
- The schema change has a migration under `prisma/migrations/` and is applied locally on the worktree DB (port 5434).
- A manual MCP smoke check is recorded in the packet: list the tools and call `search_exercises` against the local dev server (port 3100 in this worktree) using a token you created.

## Decide alone
- Add `Proposal` and `AgentToken` to `tablesToClear` in `lib/test/database.ts`.
- Internal structure under `lib/proposals/`, `lib/mcp/` and `lib/notify/`, beyond the fixed exports.
- The rate-limit tier for `/api/mcp`.
- The exact zod schemas, as long as they match the validator's rules.

## Escalate to Dustin when
- A test looks wrong. Stop and report it; **never edit, skip or weaken a test** to make it pass.
- The official MCP SDK can't run statelessly inside a Next.js route handler.
- Anything would touch production, Doppler prod configs, or `prisma migrate deploy`.

## Don't touch
- `__tests__/features/**` and `features/**`.
- Unrelated admin pages and APIs.

## Hand back
The handoff-implementer packet, plus: the migration name, the env vars added (for example `BARK_URL`) and which Doppler configs need them, and the smoke-check transcript.

## Log
- 2026-10-25 20:23 MDT: created (waiting on 001)
- 2026-10-25 20:41 MDT: confirmed by Dustin (as written; executor Claude Code in a herdr pane in worktree1)
- 2026-10-25 21:10 MDT: 001 tests are red and in review. The spec's Return shapes are pinned. State: ready. The steps file is read-only (chmod); leave it that way.
- 2026-10-25 20:34 MDT: dispatched to implementer (running)
- 2026-10-25 20:34 MDT: correction: the lead wrote the 20:41, 20:55 and 21:10 timestamps above as estimates. The real times were earlier (about 20:25 to 20:34 MDT).
- 2026-10-25 handback received from implementer (verdict: checks out with adjustments). Lead re-ran: exercise-proposals 96/96 passed; type-check clean; eslint clean on changed files (4 warnings); steps file still read-only. Pre-existing `npm run lint` errors (13) are in untouched files. Migration 20261026023827_add_agent_tokens_and_proposals is additive. Added dep @modelcontextprotocol/sdk@1.32.1. AGENTS.md fixed for two issues the implementer hit: db push wanting to drop BetterAuth tables, and the nonexistent dev_personal_worktree1 Doppler config. Open risk: revert overwrites later edits. State: review.
- 2026-10-25: accepted by Dustin.
