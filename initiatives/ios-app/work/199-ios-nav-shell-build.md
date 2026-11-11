---
id: 199
state: done
executor: ios-impl
skill: handoff-implementer
waiting_on:
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-10 Dustin ("Yes, go for it"; answers on 196: drop History tab, supersets like the web, the web's keypads, reorder today only + light haptic; install after independent review)
updated: 2026-11-10
---
# iOS slice 9a: bottom bar and quick actions, build

## Goal
Make 198's tests pass and build `features/ios-app/nav-shell.feature`.

## Read first
- The spec, `initiatives/ios-app/work/198-handback.md` (contract and hands-on list), and `initiatives/ios-app/logger-nav-discovery.md` §3–8.
- Web screenshots: `initiatives/ios-app/handoff/slice9-assets/web-tab-*`, `web-nav-*`, `web-quick-actions.png`, `web-qa-*`.

## Do
- **The bar:**
  - The custom `RipitTabBar` is attached with `bottomBar` (`Theme.swift`) and matches the web's look.
  - Keep `TabView` with one `NavigationStack` per tab and hide the system bar. If it flickers back when a screen is pushed, use the note's fallback.
  - Tapping the active tab pops it to its first screen.
- **Quick Actions:** a floating card over a dim backdrop, as on the web.
- **History** moves under Training › Recent, with "See all".
- **Programs** move under Library (Workouts | Programs).
- **After the summary,** you land on Training. Fix the stale "Back to history" label.
- **Accessibility:**
  - cap the tab labels' text size and add the large content viewer
  - VoiceOver: each tab is a selected or unselected button
  - the bar doesn't ride up on the keyboard
  - the pulse is off under reduce motion and E-ink

## Done when
- `mise run ios-check` exit 0, with 198's tests unchanged.
- Every hands-on item is seen by real taps on `ripit-impl` (reuse it), at default and largest text.

## Don't touch
Tests, `initiatives/ios-app/work/`, `STATE.md`, `status.md`, the roadmap. Don't `rm`.
- 2026-11-10 22:45 MST: dispatched to ios-impl (running; context 10%, cleared)
