---
id: 198
state: done
executor: ios-tests
skill: handoff-test-builder
waiting_on:
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-10 Dustin ("Yes, go for it"; answers on 196: drop History tab, supersets like the web, the web's keypads, reorder today only + light haptic; install after independent review)
updated: 2026-11-10
---
# iOS slice 9a: bottom bar and quick actions, tests

## Goal
Tests and a hands-on list for `features/ios-app/nav-shell.feature`, before the build.

## Read first
- `features/ios-app/nav-shell.feature`
- `initiatives/ios-app/logger-nav-discovery.md` §3–5, 7–8 and "Logic worth unit-testing" item 6
- iOS today: `ios/App/RipitApp.swift`, `TrainingView.swift`, `LibraryView.swift`, `HistoryView.swift`, `ProgramViews.swift`

## Do
- **RipitCore pure logic, with tests:** which quick actions are offered for (open draft?, active program's next workout?, saved count). Include the labels the web shows: Week · Day · name, "No active program", "n saved", "In progress · tap to resume". Take the expected values from `QuickActionSheet.tsx`, from a golden if it's practical, otherwise from cases cited line by line.
- Add any other pure rule the shell needs: which tab a destination belongs to, and what the discard needs (arm, then confirm within 4 s).
- **Hands-on list for the reviewer,** for everything that is UI only: the bar's look, safe area, per-tab state, pop to root, AX5 and the large content viewer, VoiceOver, keyboard, pulse, reduce motion and E-ink, and where you land after the summary.
- Run the break matrix as before.

## Done when
- `mise run ios-check`: the new tests fail only with `notImplemented`; everything else stays green.
- Every scenario maps to a test or to the hands-on list.

## Don't touch
App code (apart from contract stubs in RipitCore), `initiatives/ios-app/work/`, `STATE.md`, `status.md`, the roadmap. Don't `rm`.
- 2026-11-10 22:39 MST: dispatched to ios-tests (running; context 16%, cleared)
