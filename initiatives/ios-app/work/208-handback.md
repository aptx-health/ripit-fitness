Report: complete

## Verdict
The active tab's highlight is softened, and the rest of look B is kept. `mise run ios-check` exits 0 with 351 tests. Only `ios/App/Shell.swift` changed. Nothing is committed.

## What changed (`RipitTabBar`, in `Shell.swift`)
- **Block:** a `RoundedRectangle(cornerRadius: 6)`, the same radius as the WORKOUT chip. It is inset 4 pt from the slot's sides and from the bar's top, so it no longer runs to the screen edge or over the top border.
- **Fill:** a gradient from `accent-muted` at the top to clear at the bottom, so it has no hard bottom or side edge.
- **Top edge:** a 3 pt accent `Capsule`, half the tab's width, centred at the top of the block.
- **Kept as before:**
  - The block and the pill are one view, so they slide together under the same animation (0.22 s ease-out).
  - Reduce Motion and E-ink still jump; that path is untouched.
  - E-ink keeps its bold underlined label.
  - The other tabs stay at 80%, and the haptic is unchanged.

## Shots
`initiatives/ios-app/handoff/slice9b-assets/fix208-tab-bar.png` is untracked. It crops the bar in each of these themes, top to bottom:
- RIPIT dark
- Blossom dark
- GitHub light
- E-ink

Each row shows Training (left end), Progress (a middle tab) and Settings (right end) selected. The full screenshots are in the scratch folder below.

## Verification
- `mise run ios-check`: exit 0.
- A scratch XCUITest run on `ripit-impl` tapped each tab in each of the 4 themes: 4 of 4 passed.

## Not verified
- **Motion:** the slide was seen only in still shots.
- **Reduce Motion:** not toggled, but its code path is unchanged.
- **Haptic:** the simulator has none.

## Open questions
- In E-ink, `accent-muted` is a pale orange. The fade reads softly there, but E-ink otherwise avoids tints. If E-ink should show only the underline and pill, that would be a one-line follow-up.

## Cleanup (not deleted)
In `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/e9f080b5-ff6a-4d7e-a064-2354f3951486/scratchpad/`:
- `shots208/`
- `ui/UITests/Tab208Tests.swift`
- `check208.log`
- `tab208.log`
