---
id: 014
state: accepted
waiting_on: 
executor: test-builder
from: lead (lead-ripit-mcp)
confirmed: 2026-10-26 Dustin (chose "remove Revert for programs" after phone testing)
updated: 2026-10-26
---
# Tests: program proposals can't be reverted (red)

## Goal
Dustin decided that an approved program is an ordinary program, so its proposal can't be reverted. The two revert scenarios are gone. In their place, the feature has one new scenario, "Reverting a program proposal is refused". Update the tests to match. Item 015 changes the code.

## Read first
- `features/agent-tools/program-proposals.feature` (now 10 scenarios; the last Rule changed). Don't edit it.
- `initiatives/agent-tools/docs/spec.md`, "Programs": `inverse` stays null, and revert returns `invalid` with the exact error text given there.
- `__tests__/features/agent-tools/program-proposals.steps.ts`, and `__tests__/lib/proposals-approve-transaction.test.ts` if it touches revert or inverse.

## Done when
- The steps file binds all 10 scenarios. The two old revert scenarios' steps are removed.
- The approve assertions expect `inverse` to be null.
- The new scenario checks DB state: the program tree is intact, and the proposal is `applied` with `decidedAt` unchanged.
- `npm run test:run -- program-proposals` fails only on the new behaviour: revert still deletes, and inverse is still set.
- **Prove the check can pass:** run against a scratch fake, then break the fake once per changed behaviour. Delete the fake afterwards.
- The other agent-tools files and `proposals-approve-transaction` still pass, and the files are re-locked.

## Don't touch
- `lib/`, `app/`, `components/`, `features/**`.

## Hand back
The handoff-test-builder packet. First line: `Report: complete | needs decision | further handoff`. Send it to lead-ripit-mcp with SendMessage.

## Log
- 2026-10-26: created after Dustin's phone test.
- 2026-10-26 21:34 MDT: dispatched to test-builder (running).
- 2026-10-26 21:36 MDT: handback (complete) saved as work/014-handback.md. Lead re-ran: 4 failed for the right reasons, 235 passed.
- 2026-10-26 21:46 MDT: accepted by Dustin ("Ok this is great. Let's PR").
