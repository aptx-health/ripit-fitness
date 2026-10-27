---
id: 010
state: accepted
waiting_on: 
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-10-26 Dustin
updated: 2026-10-26
---
# Agents propose new programs (green)

## Goal
Make the 009 tests pass. Add `get_program` and `propose_program_create`, the `program.create` approve and revert in the proposal service, and a read-only program outline on the admin proposal detail page. After this, an agent can draft a whole program and Dustin can approve it into the app.

## Read first
- `initiatives/agent-tools/docs/spec.md`, section "Programs".
- `features/agent-tools/program-proposals.feature` and `__tests__/features/agent-tools/program-proposals.steps.ts`: the tests to make green.
- `lib/proposals/service.ts`, `lib/proposals/exercise-definition.ts`, `lib/mcp/tools.ts`, and `app/(app)/admin/proposals/[id]/page.tsx`.
- `AGENTS.md`, "Database and migrations". No schema change is expected. If you find you need one, stop and say so in your packet.

## Done when
- `npm run test:run -- agent-tools` passes, and the full `npm run test:run` shows no new failures.
- Type-check is clean (`doppler run --project fitcsv --config dev_personal -- npm run type-check`), and eslint and biome are clean on the changed files.
- Program-specific code lives in its own module (for example `lib/proposals/program.ts`). `service.ts` stays readable, and no file goes over 1000 lines.
- Approve runs in one transaction. Use nested or batched creates, not a query per set inside a loop where avoidable. Say in the packet how you did it.
- Two Playwright screenshots at 390px are saved to `initiatives/agent-tools/docs/assets/010/`: a pending program proposal's outline, and the same proposal after approval with its link to the program.
- When seeding for screenshots, run with `DISCORD_PROPOSALS_WEBHOOK_URL=` and `BARK_URL=` blanked. Nothing may post to real channels.
- Afterwards the dev server is stopped and any tokens you created are revoked.

## Decide alone
- Module layout, the zod schema shape, and how the outline looks, within the existing admin styles.

## Escalate to Dustin when
- A test looks wrong. Never edit, skip or weaken tests.

## Don't touch
- `__tests__/features/**`, `features/**`, `prisma/schema.prisma`, the existing program APIs, and the program builder UI.

## Hand back
The handoff-implementer packet, plus the screenshot paths. First line: `Report: complete | needs decision | further handoff`.

## Log
- 2026-10-26: created, waiting on 009; confirmed by Dustin in the slice 2 plan form.
- 2026-10-26 20:21 MDT: 009 in review. Dispatched to implementer (running) with the V3 brief.
- 2026-10-26 20:27 MDT: handback received via cross-session message, saved as work/010-handback.md (Report: complete). Lead re-ran: agent-tools 240/240, type-check clean. Now in review; going to the reviewer (011).
- 2026-10-26 21:46 MDT: accepted by Dustin ("Ok this is great. Let's PR").
