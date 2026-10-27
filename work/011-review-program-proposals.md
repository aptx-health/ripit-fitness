---
id: 011
state: accepted
waiting_on: 
executor: reviewer
from: lead (lead-ripit-mcp)
confirmed: 2026-10-26 Dustin
updated: 2026-10-26
---
# Review slice 2: program proposals

## Goal
Judge independently whether the slice 2 work meets the spec and is good code. Your verdict decides whether this goes to Dustin as "ready to accept" or back for changes. You didn't build or test this. You won't see the implementer's notes before your first pass.

## Read first
- `features/agent-tools/program-proposals.feature`: the acceptance criteria.
- `initiatives/agent-tools/docs/spec.md`, section "Programs" (and "Rules" and "Return shapes" for the patterns it follows).
- The change, which isn't committed yet: `git diff` plus the untracked files from `git status`. In scope: `lib/proposals/program.ts`, `lib/proposals/service.ts`, `lib/mcp/tools.ts`, `components/admin/proposals/ProgramOutline.tsx`, `app/(app)/admin/proposals/page.tsx`, `app/(app)/admin/proposals/[id]/page.tsx` and `__tests__/features/agent-tools/program-proposals.steps.ts`.
- Screenshots: `initiatives/agent-tools/docs/assets/010/*.png`.
- **Don't open `work/*-handback.md` before your first pass is written.** Those files hold the builders' own accounts.
- `AGENTS.md`, for project conventions.

## Do
1. **Unaided first pass.** Run the check: `npm run test:run -- agent-tools`, with the env vars from `docs/TESTING.md`. Then type-check with `doppler run --project fitcsv --config dev_personal -- npm run type-check`. For each scenario, does the behaviour really meet it? Is the code sound? Look at correctness, transaction safety, scoping to the token's user, query efficiency, fit with `lib/proposals` and `lib/mcp`, escaping of agent text in the admin UI, and whether the tests mean something. List defects and risks with file:line. Keep this pass unchanged in your packet.
2. **Questions.** Ask up to 3 short questions where intent is unclear, with options. Put them in the packet; the lead answers.
3. **Revised review and verdict,** after the answers: "meets spec, good to accept", or a list of what must change first.

## Decide alone
- How deep to go on each file, and whether to run the app.

## Don't touch
- Any file. This item is read-only. Report problems; don't fix them.

## Hand back
A review packet. First line: `Report: complete | needs decision | further handoff`. Then: Verdict, First pass (defects and risks), Questions, Not verified.

## Log
- 2026-10-26: created, waiting on 010; confirmed by Dustin in the slice 2 plan form.
- 2026-10-26 20:27 MDT: dispatched to reviewer (new agent, herdr w3:t4) with the V3 brief.
- 2026-10-26 20:31 MDT: reviewer asked 3 questions (provisional: meets spec). Lead answered from the spec: Q1 (5s approve-transaction timeout at max program size) gets a 30s timeout plus P2028 mapped to a refusal, as follow-up work; Q2 (revert of an active but untrained program) is allowed per spec and flagged for Dustin; Q3 (field name for unknown keys) left as is. Small fixes: biome import order and a duplicate assertion in the steps file; weight "" stored as null. Waiting on the revised verdict.
- 2026-10-26 20:31 MDT: revised verdict: 4 must-change items (approve timeout, P2028 handling, empty strings stored as null, steps-file lint and duplicate). Packet saved as work/011-handback.md. Waiting for re-review after 013.
- 2026-10-26 20:38 MDT: re-review dispatched to the reviewer (retry) after 012/013.
- 2026-10-26 20:39 MDT: final verdict: ready to accept (appended to work/011-handback.md).
- 2026-10-26 21:39 MDT: second re-review (retry): items 014/015, no program revert, plus the lead's inline back-button fix.
- 2026-10-26 21:41 MDT: second re-review: ready to accept.
- 2026-10-26 21:46 MDT: accepted by Dustin ("Ok this is great. Let's PR").
