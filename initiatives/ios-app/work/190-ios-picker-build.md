---
id: 190
state: done
waiting_on:
executor: ios-impl
skill: handoff-implementer
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-08 Dustin ("Go for it" on slice 8; same autonomy)
updated: 2026-11-10
---
# iOS slice 8: picker filters and custom exercises, build

## Goal
Make 189's tests pass and build the picker filters, multi-pick, and the custom exercise editor, so every scenario in `features/ios-app/picker-custom.feature` works.

## Read first
- The spec, `initiatives/ios-app/work/189-handback-1.md` and `-2.md` (contract, hands-on list, and Dustin's three calls: trim names, sort then cut to 50, a letter or digit required).
- Web look: `initiatives/ios-app/handoff/parity-assets/web-picker*.png`. Use slice 7's shared styles in `Theme.swift`.

## Do
- Implement the `RipitCore` stubs.
- Picker: muscle-group and equipment filter sheets, multi-select with an Add button, and Create from the search text.
- Custom exercise editor: create and edit, with the web's fields and duplicate warning.
- Use it from every place that opens the picker (ad-hoc logger, program builder and editor, adding mid-workout).
- Check each new screen at the default and largest text size, light and dark, plus one other theme. Take screenshots.

## Done when
- `mise run ios-check` exits 0, with 189's tests passing unchanged.
- Every scenario works when you try it by real taps in your simulator. Reuse one simulator named `ripit-impl` (create it only if missing); disk space is tight, so don't make per-item simulators.

## Decide alone
- Layout details.

## Escalate to Dustin when
- A scenario can't be met as written.

## Don't touch
- 189's tests. `initiatives/ios-app/work/`, `STATE.md`, `status.md`, the roadmap. Don't `rm`.

## Hand back
The implementer packet, with screenshots.

## Log
- 2026-11-08: created (waiting on 189).
- 2026-11-10 17:19 MST: dispatched to ios-impl (running; context 14%, cleared)
