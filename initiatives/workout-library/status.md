# Workout library: status

- 2026-11-06 CST: Started. Dustin: "We need to figure out workout creation and management. Right now it's just that unsorted list." Pain: clutter and finding one (not building or editing). Wants pinned + custom tags. Folds in the punted "Proposed workouts without sprawl" (ROADMAP): where AI and coach workouts land is part of this. Size: standard. Lead: lead-ripit-mcp. First step: discovery 141 (coach-disco, reused for its proposals context).
- 2026-11-06 CST: Discovery 141 back (docs/141-discovery.md): slices ordering+Older → tags+search → origin+New+archive → bulk tidy. Asking Dustin three questions.
- 2026-11-06 CST: Dustin chose all three recommendations (Older at 30 days + manual archive; New group; own tags, agents reuse). Slice 1 spec written: features/workout-library/order-older.feature (small, implementer writes tests; queued as 142 after 135). Slice 3 (origin + New) lands before coaching send.
- 2026-11-06 CST: Slice 1 build 142 dispatched to implementer (worktree2, feature/workout-library-order, stacked on #1039). Small: test-builder skipped; implementer writes the tests first.
- 2026-11-06 CST: Slice 1 approved by Dustin on the phone preview. Committed; PR into dev. Next: slice 3 (origin + New + archive) before coaching send, then slice 2 (tags + search).
- 2026-11-07 CST: Slice 3 spec (features/workout-library/origin-new-archive.feature) written; Dustin said "yes" to start. Tests 144 dispatched to test-builder (worktree2, feature/workout-library-origin, stacked on #1040).
- 2026-11-07 CST: Tests 144 back (41 tests, 40 red; break matrix 34/34). Lead: dismissedAt column, pinned beats New, MCP ignores pins, archive is not an edit for revert. Build 145 dispatched to implementer.
- 2026-11-07 CST: Build 145 back (suite 4230 pass); lead re-ran 74/74. Review 146 dispatched to coach-review.
- 2026-11-07 CST: Slice 1 merged to dev (#1040).
- 2026-11-07 CST: Review 146: fix first (agentToken null on dev), plus undo hardening, start restores archived, 48px toast close, welcome allowlist. Fixes 147 dispatched to implementer (rebase onto dev first).
- 2026-11-07 CST: Dustin: hold the prod release until slice 3 is merged; then release everything on dev together.
- 2026-11-07 CST: Dustin: prod release waits until all coach features are in dev (coaching slices 2 and 3, after workout library slice 3).
- 2026-11-07 CST: Slice 3 approved by Dustin on the phone preview. 144–147 accepted. Committed; PR into dev. Next: coaching slice 2 (send).
