---
id: 194
state: review
executor: ios-impl
skill: handoff-implementer
waiting_on:
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-08 Dustin ("Go for it" on slice 8; same autonomy)
updated: 2026-11-10
---
# iOS slice 8: review fixes

## Goal
Make 193's tests pass and fix review 191's two editor findings.

## Fixes
1. **Instructions limit 4000** (193's tests).
2. **Imported unknown exercises are built-in** (193's tests): no MINE badge, no Edit button.
3. **Errors after a try, not on open.** A new exercise's editor shows no "required" errors when it opens. Show a field's error after that field has been touched, or after Save is tapped. Save can stay off while the form is invalid, so make tapping it show the errors (or keep it tappable and show them then; your call, as long as there's a visible reason). See `191-handback.md` finding 1 and `slice8-assets/pairs-create-dark.png`.
4. **Keep the duplicate warning in view.** Put it under the Name field, next to its red border, so the keyboard doesn't scroll it under the nav bar (finding 2).

## Done when
- `mise run ios-check` exit 0, with 193's tests unchanged.
- Each fix seen by real taps on simulator `ripit-impl` (reuse it), including at the largest text size.

## Don't touch
Tests, `initiatives/ios-app/work/`, `STATE.md`, `status.md`, the roadmap. Don't `rm`.
- 2026-11-10 19:29 MST: dispatched to ios-impl (running; context 32%, kept)
