Report: complete (042, TL3 Library build). Relayed by SendMessage 2026-10-31; saved by the lead (condensed).

**Checks**
- Training-library and nav tests: 320/320.
- Full suite: 1944 passed. The lead re-ran it with the same result.
- tsc is clean.
- eslint shows 3 errors that were already at HEAD.

**Built**
- The seams as named in 041.
- `LibraryView` replaces `ConsolidatedProgramsView`:
  - a bold WORKOUTS | PROGRAMS control over a subtle MY PROGRAMS | BROWSE one;
  - switching type updates the URL with `replaceState`.
- `MyProgramsList`:
  - The active program is first, with ACTIVE and "Week X of Y".
  - VIEW is the primary action, and ACTIVATE is secondary (shown only on inactive programs).
  - `hasActiveProgram` is removed.
- `ProgramBackLink` (← LIBRARY) is on the detail page.
- Nav: Library is active on `/library*` and `/programs/*`.

**Page glue (smoke-tested)**
- The `/library` page.
- Thin redirect pages for `/programs`, `/workouts/saved` and `/community`.
- Deleted: `ConsolidatedProgramsView`, `ActiveProgramStrip` and `ProgramsList`.

**Links updated**
- Onboarding (with new copy), the back links on new and edit, `WorkoutRollupModal`, `QuickActionSheet`, and welcome.
- The grep shows no stale list links left; what remains is API fetches, a comment and the nav rule.

**Screenshots:** `docs/assets/042/` (Playwright).

**Open points**
1. The hierarchy of the two nested switches is worth Dustin's look.
2. "Start a freestyle workout" shows only when the list is empty, as today.
