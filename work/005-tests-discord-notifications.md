---
id: 005
state: accepted
waiting_on: 
executor: test-builder
from: lead (ripit-fitness-9b)
confirmed: 2026-10-25 Dustin
updated: 2026-10-25
---
# Write the failing tests for Discord proposal notifications (red)

## Goal
Make every scenario in `features/agent-tools/proposal-notifications.feature` executable and failing only because `lib/notify/discord.ts` doesn't exist yet. Item 006 makes them pass. You write tests only.

## Read first
- `features/agent-tools/proposal-notifications.feature`: the behaviour. Don't edit it.
- `initiatives/agent-tools/docs/spec.md`, section "Notifications": the function signature and the message shape.
- `lib/notify/bark.ts`: the existing `NotifyPayload` type. Import it; don't change it.
- `__tests__/features/agent-tools/exercise-proposals.steps.ts`: the vitest-cucumber style already in use, including lazy module loading.
- `docs/TESTING.md`.

## Done when
- `__tests__/features/agent-tools/proposal-notifications.steps.ts` binds every scenario.
- Tests inject `webhookUrl` and a mocked `fetch` through `opts`, with no real network calls. "Not configured" passes `webhookUrl: undefined` with the env var unset.
- Assertions check the posted JSON body: `allowed_mentions.parse` is empty, `embeds[0].url` ends with `/admin/proposals/<id>`, and the length limits hold.
- "Discord is down" asserts that the call resolves without throwing and that `logger.warn` was called. Spy on `@/lib/logger`.
- `npm run test:run -- proposal-notifications` fails on the missing module only. `exercise-proposals` stays at its current state.
- The steps file is left read-only (`chmod a-w`).

## Decide alone
- Fixture payload values, and how to spy on the logger.

## Escalate to Dustin when
- The spec's shape can't be tested as written.

## Don't touch
- `lib/`, `app/`, `prisma/`, `features/**`, and the exercise-proposals steps file.

## Hand back
The handoff-test-builder packet, plus each scenario's current failure (first line only).

## Log
- 2026-10-25: created (ready)
- 2026-10-25: confirmed by Dustin as written.
- 2026-10-25 21:07 MDT: dispatched to test-builder (running)
- 2026-10-25: handback received. Lead re-ran: 12 failed, 6 passed. Every failure is the missing `@/lib/notify/discord`; the passes are Given steps. Steps file is read-only. Lead confirmed both assumptions: title maps to the embed title and body to its description, and "never throws" also covers a rejected fetch. State: review.
- 2026-10-25: accepted by Dustin as is (Hub review page review-003-005).
