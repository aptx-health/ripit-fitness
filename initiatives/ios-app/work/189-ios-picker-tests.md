---
id: 189
state: done
waiting_on:
executor: ios-tests
skill: handoff-test-builder
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-08 Dustin ("Go for it" on slice 8; same autonomy)
updated: 2026-11-08
---
# iOS slice 8: picker filters and custom exercises, tests

## Goal
`RipitCore` tests for slice 8, with expected values from the web's own code where it has rules.

## Read first
- `features/ios-app/picker-custom.feature` and the oracles in its header.
- iOS today: `ios/RipitCore/Sources/RipitCore/Catalog.swift` (search), the exercise definition table in `Schema.swift`, how import matches custom exercises (`Import.swift`).

## Do
- **Search and filters:** goldens from the web's search route over the bundled catalog: text matches, muscle-group filter, equipment filter (including "other" expanding to every specialized type), both combined, and the order.
- **Custom exercises:**
  - create, with the web's required fields and its validation
  - duplicate-name check, as `check-duplicate` does it
  - edit; built-in exercises refused
  - survives a relaunch
  - found by search
  - usable in a workout and its history
  - kept by a re-import (no duplicate)
- **Multi-pick:** add several in the order picked.
- Break matrix as before. Write a hands-on list for the reviewer.

## Done when
- `mise run ios-check`: new tests fail only with `notImplemented`; everything else stays green.
- Every scenario maps to a test or the hands-on list.

## Decide alone
- Names, layout, and any migration (say so).

## Escalate to Dustin when
- The web's behavior looks like a bug you'd be copying.

## Don't touch
- `ios/App/`. `work/`, `STATE.md`, `status.md`, the roadmap. Don't `rm`.

## Hand back
The test-builder packet, plus the hands-on list.

## Log
- 2026-11-08: created (ready).
- 2026-11-08 07:44 MST: dispatched to ios-tests (running; context 17%, cleared)

## Follow-up 1 (2026-11-08, Dustin's calls on the handback)
Change the tests, the golden expectations and the `Picker.swift` rules header so the phone departs from the web on these three points. Keep everything else as on the web.
1. **Trim names:** leading and trailing spaces are removed on save (create and edit). Duplicate checks use the trimmed name.
2. **Sort, then cut:** search scores and orders all matches first, then applies the 50-row limit.
3. **A letter or digit is required:** a name with no letter or digit (for example "!!!") is refused, with its own validation reason. A search query with no letter or digit acts like an empty query.
Keep as on the web: aliases match exact words only, and "Other" includes resistance bands.
Re-run the break matrix for the changed rules only (add a break for each new rule), relock the files and hand back a short packet as `Report: complete`.
