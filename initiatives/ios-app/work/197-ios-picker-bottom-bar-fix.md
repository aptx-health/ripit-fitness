---
id: 197
state: review
waiting_on:
executor: ios-impl
skill: handoff-implementer
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-10 Dustin (reported the bug from his phone: "important to get this fixed")
updated: 2026-11-10
---
# iOS bug: picker's bottom bar doesn't reach the bottom of the screen

## Bug
On Dustin's iPhone, in the Add exercises picker, the "+ CREATE / ADD" bar sits above the home-indicator area, and exercise rows scroll visibly underneath it, below the bar. See `initiatives/ios-app/handoff/slice8-assets/dustin-picker-bottom-bar.png`.

Likely cause: `ExercisePickerView.swift:84` puts the bar in `.safeAreaInset(edge: .bottom)`, and its `.background(Theme.background…)` (line 126) doesn't extend into the bottom safe area. The simulator may not show it if its device has a different home-indicator inset, so check on a device with a home indicator (iPhone 17 / 16 Pro simulator).

## Do
1. Fix it so the bar's background runs to the bottom edge of the screen, with nothing scrolling beneath it. Keep the buttons above the home indicator.
2. Sweep every other fixed bottom bar or bottom-pinned control in `ios/App` (the logger, the editor, the summary, the sheets) for the same problem, and fix any you find.
3. Write down the pattern you used, as a short comment or a shared modifier (for example a `BottomBar` container in `Theme.swift`). Slice 9's custom tab bar and the logger's fixed ‹ Log › bar will reuse it.

## Done when
- `mise run ios-check` exit 0, tests unchanged.
- Screenshots before and after, on simulator `ripit-impl` (reuse it), with the list scrolled so rows would pass under the bar. Do this in RIPIT dark and at the largest text size. Save them to `initiatives/ios-app/handoff/slice8-assets/` with the prefix `fix197-`.

## Don't touch
Tests, `initiatives/ios-app/work/`, `STATE.md`, `status.md`, the roadmap. Don't `rm`.
- 2026-11-10 22:22 MST: dispatched to ios-impl (running; context 2%, kept)
