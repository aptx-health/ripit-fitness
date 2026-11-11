---
id: 184
state: accepted
waiting_on:
executor: ios-tests
skill: handoff-test-builder
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-07 Dustin (slice 7 as written; match web closely; all 13 themes; pause after)
updated: 2026-11-07
---
# iOS slice 7: Settings and look, tests

## Goal
`RipitCore` tests for the parts of slice 7 that have rules. Most of the look is visual, so it goes on the reviewer's hands-on list.

## Read first
- `features/ios-app/settings-look.feature` and the oracles in its header.
- `ios/App/Theme.swift` (today's ripit tokens), and the Progress settings sheet (unit and weekly target).

## Do
- **Theme tokens:** generate a golden from `app/globals.css`: every token, for all 13 themes × light/dark, as the web defines them. The phone's theme table must equal it. Include the light-only rule for E-ink and the default (ripit, dark).
- **Settings store:** defaults, saving and reading back, surviving a relaunch, and migrating the existing Progress unit/target and `effortKind` values so nobody loses them.
- **Logger rules:** effort picker off when tracking is off; the default type when on; the default unit on a new set. Wherever that logic can live in `RipitCore`, test it.
- **Reduced motion:** on when the E-ink display is on or the OS asks for it (pure function).
- Break matrix as before. Write a hands-on list for the reviewer covering everything visual (type, shapes, folder tabs, native bits, largest text).

## Done when
- `mise run ios-check`: new tests fail only with `notImplemented`; everything else stays green.
- Every scenario maps to a test or the hands-on list.

## Decide alone
- Names, layout, and how tokens are stored (generated Swift or a bundled JSON).

## Escalate to Dustin when
- The web's behavior looks like a bug you'd be copying.

## Don't touch
- `ios/App/`. `work/`, `STATE.md`, `status.md`, the roadmap. Don't `rm`.

## Hand back
The test-builder packet, plus the hands-on list.

## Log
- 2026-11-07: created (ready). Dustin: match the web closely; all 13 themes.
- 2026-11-07 22:07 MST: dispatched to ios-tests (running; context 2%, cleared)
- 2026-11-07: needs decision. Lead: new install stays RIPIT dark (spec; web follows the OS until picked); keep the default rating type from Settings (web never reads it), a planned value still prefills; themes missing accent-active stay missing (copy web). Re-ran swift test: 145 issues, all from stubs. Accepted.
