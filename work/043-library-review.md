---
id: 043
state: accepted
waiting_on: 
executor: reviewer
from: lead (lead-ripit-mcp)
confirmed: 2026-10-31 Dustin (no work-item sign-off forms for this initiative)
updated: 2026-10-31
---
# Review: TL3 Library

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/library`, stacked on TL2 and TL1. The change is uncommitted: `git status`, `git diff` and the new files. Change no files except your own screenshots.

## Goal
Judge whether TL3 meets its contract, is good code, and looks right in the app. Read:
- the contract, `initiatives/training-library/docs/spec.md` ("TL3 Library");
- the behaviour, `features/training-library/library.feature`;
- the decisions, `docs/decisions.md`;
- the tests: `library.steps.ts` (+ `library-support.ts`), `nav-active-tab.test.tsx`, and the TL1/TL2 files TL3 updated (`program-detail-view.test.tsx`, `training-home-view.test.tsx`, `training-home.steps.ts`).

Don't read `work/042-handback.md` until your first-pass verdict is written.

## Focus
- **Page glue (untested):**
  - `app/(app)/library/page.tsx`: the data load, and that it carries over everything the old `/programs` page did;
  - the redirect pages for `/programs`, `/workouts/saved` and `/community`;
  - the detail page's `ProgramBackLink`.
- **The cloning flow,** end to end: adding a community program from Browse, the progress row, the activation modal, the URL tidy.
- **Deletions:** removing `ConsolidatedProgramsView`, `ActiveProgramStrip` and `ProgramsList` left no broken imports and lost no behaviour, e.g. the program limit, the premium gate and admin bypass.
- **Stale links:** grep for any link to `/programs` or `/workouts/saved` list pages that's left. `/programs/new`, `/programs/<id>/edit` and API routes are fine.
- **Visual check (Dustin's rule):**
  - Take phone-width (390px) screenshots with Claude in Chrome (`mcp__claude-in-chrome__*`), or Playwright if Chrome isn't connected; say which you used.
  - Cover: Library → My Programs (collapsed and expanded), Library → Workouts, Browse, a program detail page (← LIBRARY), and the nav on Training, Library and the detail page.
  - Compare them with neighbouring screens (Training, Settings) for headers, the two switches' hierarchy, buttons, spacing, the nav highlight and gold underline, and the DOOM theme.
  - Save the screenshots to `initiatives/training-library/docs/assets/043/`.
  - Use the dev server in worktree2 (`BETTER_AUTH_URL`/`NEXT_PUBLIC_APP_URL=http://localhost:3200`) and the DB `fitcsv-postgres-wt2`.
  - Don't add, clone or delete programs on real data unless you clean up. No real side effects. Stop the server and DB when done.

## Done when
- A verdict: ship / ship with notes / fix first.
- Findings ranked by severity, each with a `file:line` or a screenshot and a concrete failure.
- You re-ran the training-library and nav tests and tsc.

## Hand back
First line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-10-31 MDT: created; dispatched to reviewer (wF:p3).
- 2026-10-31 MDT: fix first (#1 switch ignores URL changes). Fixes sent to implementer, a re-sync test to the test-builder. The settings SSR 500 goes to the roadmap. Accepted.
