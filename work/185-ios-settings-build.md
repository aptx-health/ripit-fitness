---
id: 185
state: waiting
waiting_on: 184
executor: ios-impl
skill: handoff-implementer
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-07 Dustin (slice 7 as written; match web closely; all 13 themes; pause after)
updated: 2026-11-07
---
# iOS slice 7: Settings and look, build

## Goal
Make 184's tests pass, add the Settings tab and all 13 themes, and restyle the app to match the web closely, so every scenario in `features/ios-app/settings-look.feature` works.

## Read first
- The spec, `work/184-handback.md` (contract and hands-on list).
- Web look: `initiatives/ios-app/parity-inventory.md` ("Look and feel"), the `web-*.png` shots in `initiatives/ios-app/handoff/parity-assets/`, `slice5-assets/` and `slice6-assets/`, and `app/globals.css`.

## Do
- Bundle Rajdhani (SIL OFL; add the license file next to it). Put the type, corners, shadows and folder tabs into shared styles in `Theme.swift`, so screens change through one place, not one by one.
- Settings tab (the tab bar may become Training · Library · History · Progress · Settings).
- Theme switching applies live, everywhere.
- Fix the largest-text backlog: the program title, the superset badge, and the logger's ⓘ and ···.
- Check every screen at default and at the largest text size, in light and dark, and in at least 3 themes including E-ink. Take screenshots.

## Done when
- `mise run ios-check` exits 0, with all of 184's tests passing unchanged.
- Every scenario works when you try it by hand in your simulator.

## Decide alone
- Layout details, and which web blocks map to which iOS sections.

## Escalate to Dustin when
- A web style doesn't work on iOS (for example a font that won't read at small sizes). Say what you'd do instead.

## Don't touch
- 184's tests. `work/`, `STATE.md`, `status.md`, the roadmap. Don't `rm`.

## Hand back
The implementer packet, with screenshots.

## Log
- 2026-11-07: created (waiting on 184).
