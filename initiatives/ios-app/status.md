# iOS app — status

- 2026-11-07: Request: rebuild Ripit as a native iOS app on its own build/dev stream, keep the web app. Local on-device DB for workouts/programs/user data, bundled exercise images, MCP target TBD. Local test builds first (7-day free signing). Inspiration: ~/projects/offscreen. Size: standard. Lead: worktree-brave-field-c150 session.
- 2026-11-07: Discovery started: three read-only Sonnet inventories (Offscreen template, Ripit features/data, exercise images + MCP). Dustin allowed subagents for this.
- 2026-11-07: Discovery done: initiatives/ios-app/scoping.md. Dustin decided: SwiftUI + GRDB (Offscreen pattern); code in ios/ in this repo; v1 is local-only plus a one-time import of his ripit.fit history. Coaching, community, MCP deferred. Slice order: 1 skeleton + ad-hoc logging, 2 history import, 3 programs, 4 progress.
- 2026-11-07: Dustin confirmed slice 1 plan (items 153-155; this worktree, branch feature/ios-skeleton; bundle id fit.ripit.ios). 153 dispatched to ios-tests (herdr tab wX:t2).
- 2026-11-07: 153 back (30 tests, 22/22 breaks). Dustin: logged weight = number + unit like web (spec updated); ios-tests amending.
- 2026-11-07: 153 amended (86be3729, 32 tests, 24/24 breaks); check re-run. 154 dispatched to ios-impl (herdr tab wX:t3).
