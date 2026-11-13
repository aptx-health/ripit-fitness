---
id: 191
state: review
waiting_on:
executor: parity-disco
skill: reviewer
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-08 Dustin ("Go for it" on slice 8; same autonomy)
updated: 2026-11-10
---
# iOS slice 8: picker filters and custom exercises, review

## Goal
An independent verdict: does slice 8 meet `features/ios-app/picker-custom.feature`, does it match the web, and is the code sound?

## Read first
- The spec, `initiatives/ios-app/work/189-handback-1.md` (hands-on list), the diff of `ios/` since slice 7's acceptance commit `c0a7869e`. Don't read `initiatives/ios-app/work/190-handback.md` before your first pass. Reuse one simulator named `ripit-review` (create it only if missing); disk space is tight.

## Do
- Same method as before: run `ios-check`, do an unaided first pass, ask up to 3 questions, then give a revised verdict.
- **Real taps:**
  - search
  - each filter, and filters with search
  - pick several at once
  - create a custom exercise (including a duplicate name)
  - edit it; try to edit a built-in exercise
  - use the custom exercise in a workout, a saved workout and a program, then check History, Last time and Progress
  - relaunch
  - re-import the fixture
- Check the largest text size and dark mode.
- **Compare with the local web at phone width:** run the same searches and filters on both and compare the result lists, then compare the create flow.
- Screenshots go in `initiatives/ios-app/handoff/slice8-assets/`.

## Don't touch
- No code edits. `work/`, `STATE.md`, `status.md`, the roadmap. Staging read only. Don't `rm`.

## Hand back
A review packet with first line `Report: …` and a clear verdict.

## Log
- 2026-11-08: created (waiting on 190).

## Known before review (lead, 2026-11-10)
- The web raised the instructions limit from 1000 to 4000 on 2026-11-09 (`lib/validators/exercise-definition.ts`). The phone still uses 1000; a follow-up will move it to 4000. Don't report it again.
- A saved workout keeps a renamed custom exercise's old name, as on the web (it stores a copy). Kept for parity.
- 2026-11-10 18:40 MST: dispatched to parity-disco (running; context 20%, cleared)
