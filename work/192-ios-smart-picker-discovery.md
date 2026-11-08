---
id: 192
state: running
waiting_on:
executor: parity-disco
skill: discovery
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-08 Dustin (asked for discovery on the web's add-exercise modal and its settings)
updated: 2026-11-08
---
# Discovery: the web's add-exercise modal, muscle balance and anchors

## Goal
Dustin wants the phone's exercise picker to match the web's add-exercise modal, beyond slice 8's plain search, filters and custom exercises:
- the drop-down filters
- the special sorts: A–Z, Neglected, Recovery, and the Anchors list
- the muscle balance and anchor (target movement) settings that feed them

Map exactly how the web does it, so a slice can be specified. Nothing is built in this item.

## Read first
- `initiatives/ios-app/parity-inventory.md`, the "Exercise picker" and "Settings" rows.
- `features/ios-app/picker-custom.feature`: slice 8, being built now (search, muscle-group and equipment filters, multi-pick, custom exercises). Don't repeat it.
- Web: `components/exercise-selection/ExerciseSearchInterface.tsx`, `FilterChoiceSheet.tsx`, every caller of `ExerciseSearchInterface` (which pass `muscleBalanceSnapshot`, recovery or anchors data, and from where), `lib/muscle-balance.ts`, `lib/fau-volume.ts`, the anchors/target-movements code, `lib/equipment-availability.ts`, `app/(app)/settings/muscle-balance`, `settings/target-movements`, `settings/equipment`, and their API routes.

## Do
1. **Code:** for each sort and filter, write down:
   - its inputs (which tables, which lookback window)
   - the math (effective sets, FAU weights, days since last logged, recovery)
   - its ordering and tie rules
   - where it's offered (freestyle picker, program builder, swap, ...) and its defaults

   Do the same for each related settings screen: fields, defaults, validation, and what reads them.
2. **Hands-on, at phone width:** use the local web (as in 173/176) to open the add-exercise modal from the freestyle logger, the program builder and a swap. Try each sort and filter, and each related settings page. Screenshot each into `initiatives/ios-app/handoff/smart-picker-assets/`.
3. **What the phone already has:**
   - the FAU mapping in the bundled catalog
   - training profile and anchor data from the export or import
   - what slice 4's Progress code can reuse
4. Write `initiatives/ios-app/smart-picker-discovery.md`:
   - **Observed / Inferred / Unknown**
   - a table of features (web behavior | iOS today | size)
   - the pure functions worth golden-testing
   - what web data the phone lacks
   - a proposed slice, or two if it's big, with scenarios in plain English, ready for a `.feature`

## Done when
- The note exists, covers every sort, filter and related settings page, and marks each row as observed in the running web or read from code.

## Escalate to Dustin when
- The local stack won't start after the `AGENTS.md` steps.

## Don't touch
- No code changes anywhere. `work/`, `STATE.md`, `status.md`, the roadmap. Staging read only. Don't `rm`; list cleanup in your packet. Stop any dev server you start.

## Hand back
The discovery packet with first line `Report: …`, the note's path, and the proposed slice(s) in 3 lines.

## Log
- 2026-11-08: created (ready). Runs while slice 8 is in tests/build; parity-disco is cleared again before review 191.
- 2026-11-08 07:49 MST: dispatched to parity-disco (running; context 13%, cleared)
