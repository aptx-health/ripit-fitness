---
id: 040
state: accepted
waiting_on: 
executor: reviewer
from: lead (lead-ripit-mcp)
confirmed: 2026-10-31 Dustin (no work-item sign-off forms for this initiative)
updated: 2026-10-31
---
# Review: TL2 Training home

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/training-home`, stacked on TL1. The change is uncommitted: `git status`, `git diff` and the new files. Change no files except your own screenshots.

## Goal
Judge whether TL2 meets its contract, is good code, and looks right in the app. Read:
- the contract, `initiatives/training-library/docs/spec.md` ("TL2 Training home");
- the behaviour, `features/training-library/training-home.feature`;
- the decisions, `docs/decisions.md`;
- the tests: `training-home.steps.ts`, `training-home-view.test.tsx`, `nav-active-tab.test.tsx` and `program-detail.steps.ts`.

Don't read `work/039-handback.md` until your first-pass verdict is written.

## Focus
- **Repeat route:**
  - authz, and the order of the 404, 422 and 409 checks;
  - what it copies, and that weight isn't copied;
  - a program session's Repeat doesn't count toward program progress;
  - the shared `startDraftFromPlan` didn't change saved-start's behaviour.
- **The route folder rename,** `completions/[completionId]` to `[id]`: any caller or behaviour broken?
- **Loader correctness:**
  - the skipped-as-done rule;
  - only this user's and non-archived data;
  - query count.
- **Untested page glue:** `/training`, `/`, and the empty-state "Start a workout".
- **Visual check (Dustin's rule):**
  - Take phone-width screenshots (390px) with Claude in Chrome (`mcp__claude-in-chrome__*`). Use Playwright only if Chrome isn't connected, and say which you used.
  - Cover: Training with an active program, the empty Training page, a program detail page (back link), and the bottom nav on each.
  - Compare them with neighbouring screens (Programs, Settings subpages, the program detail page) for consistent headers, buttons, spacing, the nav highlight and gold underline, and the DOOM theme.
  - Flag anything that looks out of place, with a screenshot.
  - Save the screenshots to `initiatives/training-library/docs/assets/040/`.
  - Use the dev server in worktree2 (`BETTER_AUTH_URL`/`NEXT_PUBLIC_APP_URL=http://localhost:3200`), DB `fitcsv-postgres-wt2`.
  - Don't click Repeat or Start on real data, unless you clean up afterwards. No real side effects.
  - Stop the server and DB when done.

## Done when
- A verdict: ship / ship with notes / fix first.
- Findings ranked by severity, each with a `file:line` or a screenshot and a concrete failure.
- You re-ran the TL2 and TL1 tests and tsc.

## Hand back
First line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-10-31 MDT: created; dispatched to reviewer (wF:p3).
- 2026-10-31 MDT: ship with notes; all 4 findings sent to the implementer as 039 fixes. Accepted.
