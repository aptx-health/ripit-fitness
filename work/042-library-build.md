---
id: 042
state: accepted
waiting_on: 
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-10-31 Dustin (no work-item sign-off forms for this initiative)
updated: 2026-10-31
---
# Build: TL3 Library

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/library`. It is stacked on TL2 (#1007) and TL1 (#1006). Don't commit.

## Goal
Build TL3 so its tests pass. Read:
- the contract, `initiatives/training-library/docs/spec.md` ("TL3 Library");
- the behaviour, `features/training-library/library.feature`;
- the tests and seams, `work/041-handback.md`, and the header of `__tests__/features/training-library/library-support.ts`;
- the test files, which are locked: `library.steps.ts`, `nav-active-tab.test.tsx`, `program-detail-view.test.tsx`, `training-home-view.test.tsx` and `training-home.steps.ts`.

## Do
1. Build the seams exactly as named.
2. **Page glue (no tests):**
   - `app/(app)/library/page.tsx` loads what `/programs` loads today and renders `LibraryView`.
   - `/programs`, `/workouts/saved` and `/community` redirect through the new targets.
   - The detail page uses `ProgramBackLink`.
   - Remove `ConsolidatedProgramsView` and `ActiveProgramStrip` if nothing else uses them, and delete the dead `components/ProgramsList.tsx` (from 034).
3. **The untested links in the spec:**
   - onboarding;
   - the back links on `/programs/new` and `/programs/[id]/edit`;
   - `WorkoutRollupModal`;
   - the `QuickActionSheet` saved-workouts link.

   Afterwards, `grep -rn "'/programs\b\|\"/programs\"\|/workouts/saved" app components lib hooks` should show only `/programs/new`, `/programs/<id>/edit`, API routes and the redirect pages. List what's left in the packet.
4. **Self-check visually:**
   - Take phone-width screenshots: Library → Programs (My Programs, with the active entry), Library → Workouts, Browse, the detail back link, and the nav on Training, Library and the detail page.
   - Use Claude in Chrome if it's connected, otherwise Playwright.
   - Save them in `initiatives/training-library/docs/assets/042/`.
   - Compare them with today's Programs page for consistency.
   - Leave no real side effects. Stop the server and DB afterwards.
5. **Run the check:**
   - all training-library and nav tests;
   - the full suite;
   - `npx tsc --noEmit`;
   - biome on the changed files.

## Done when
- The TL3, TL2 and TL1 tests are green.
- The full suite passes.
- tsc is clean.
- The screenshots exist.
- Every scenario maps to code.

## Don't touch
- The test files.
- `work/`, `STATE.md`, status files.
- No schema change.

## Hand back
The `handoff-implementer` packet. First line: `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-10-31 MDT: created; dispatched to implementer (wF:p2).
- 2026-10-31 MDT: handback saved. Lead re-ran: 1944 passed, tsc clean; screenshot looks right. Review 043 dispatched.
- 2026-10-31 MDT: review 043 fixes sent: sync type/tab with the URL, archived filter on week SQL.
- 2026-10-31 MDT: retry in (URL sync + archived filter). Lead re-ran: full suite green, tsc clean. Preview up; waiting on Dustin.
- 2026-10-31 MDT: Dustin: "Looks great" on the phone preview. Accepted.
