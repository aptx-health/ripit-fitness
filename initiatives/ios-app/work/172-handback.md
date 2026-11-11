Report: complete

## Verdict
Fixed in commit `3d660945` (my paths only). `mise run ios-check` → `✔ 155 tests in 26 suites passed`, then the simulator build, exit 0. That's the 151 earlier tests unchanged, plus 4 new tests in one suite.

## Done
1. **Rounding:** `RipitCore/WebRounding.swift` has `round` (JS `Math.round`: -14.5 → -14), `toFixed` (JS `toFixed`, which works on the double's exact value: 3.25 → "3.3", 8.25 → "8.3", 0.35 → "0.3", and keeps the sign, so -0.04 → "-0.0" as in JS) and `oneDecimal` (the web's `formatWeight`). Every displayed decimal and signed change in `ProgressTabView` and `LiftPageView` now uses them. Tests: `WebRoundingTests.swift`.
2. **AX sizes:** `CardRow` puts the aside under the value at accessibility sizes. Labels are one line and shrink rather than break mid-word.
3. **Refresh:** Progress reloads on `store.revision`. Imports now bump `revision` too.
4. **Import alert:** moved from History to `RootView`, so it shows on any tab.

## Verified (screenshots in `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/643821d1-2005-4e50-b99d-dd541f067605/scratchpad/shots172/small/`)
- `2-ax-report-card`: at AX-XXXL, "WORKOUTS 2 of 3 / normal 3.1" and "WORKING SETS 9 / +24% / normal 7" are stacked, with no mid-word breaks.
- `1-import-on-progress`: an import started with Progress on screen shows "Import finished…", and the report behind it has already refreshed.
- `3-report-card-default`: the default size is unchanged.

## Not verified
- I didn't compare side by side with the web at exact halves in the simulator. The core tests pin the rounding rules.

## Outside this item
- `.gitignore` and `initiatives/ios-app/handoff/` have changes in this worktree from someone else. I didn't commit them.

## Cleanup for Dustin
- The scratchpad `shots172/` folder.
- The simulator `ripit-154-impl` is still booted, with its text size set back to Large.
