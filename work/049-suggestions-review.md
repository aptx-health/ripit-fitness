---
id: 049
state: accepted
waiting_on: 
executor: reviewer
from: lead (lead-ripit-mcp)
confirmed: 2026-10-31 Dustin (no work-item sign-off forms for this initiative)
updated: 2026-10-31
---
# Review: TL5a Coach Suggestions

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/coach-suggestions`, stacked on TL4. The change is uncommitted: `git status`, `git diff` and the new files. Change no files except your own screenshots.

## Goal
Judge whether TL5a meets its contract, is good code, and looks right in the app. Read:
- the contract, `initiatives/training-library/docs/spec.md` ("TL5a Suggestions for users");
- the behaviour, `features/training-library/coach-suggestions.feature`;
- the decisions, `docs/decisions.md`;
- the tests: `coach-suggestions.steps.ts` and `suggestions-view.test.tsx`, plus the locked TL2, TL4 and nav files TL5a updated.

Don't read `work/048-handback.md` until your first-pass verdict is written.

## Focus
- **Authz**, the most important part. On every user route, page and loader, can a user see or decide another user's proposal, or an `exercise_definition.*` proposal? Does any path reach the service before the ownership and kind check?
- **Decisions:**
  - accept and reject map service results correctly (404, 409 `not_pending`, 409 `conflict`, 422);
  - there's no revert path for users;
  - no cap check;
  - the program id is returned;
  - the Make active and Not now flow.
- **The lift:** the admin proposal pages behave the same for admins. Compare them against `git show HEAD:'app/(app)/admin/proposals/[id]/page.tsx'`. Is the shared code tidy, with no duplicated logic left?
- **User wording:**
  - "proposal" must never reach a user, including in server error messages.
  - Summaries for targets and anchors currently use keys ("Update targets: quads 1.3 → 1.3, mid-back 1 → 1.2") and appear as the Training headline and the review h1. Judge this against the spec's "display names, never keys" and recommend a fix, e.g. a user-facing title computed from the body instead of the service summary.
  - A "quads 1.3 → 1.3" no-op change appears in the seed. Check whether the service lets through targets that don't change anything.
- **Notification safety:** nothing in TL5a sends to Discord or Bark from a user action, unless the service already did that on approve. Check.
- **Visual check (Dustin's rule):**
  - Take phone-width (390px) screenshots with Claude in Chrome, or Playwright if Chrome isn't connected; say which you used.
  - Cover: Training with suggestions, `/suggestions`, the review screen for at least a workout, a program (including Make it active?) and targets, and an outcome view.
  - Compare them with the rest of the app (headers, buttons, the TL1–TL4 sections), including the all-caps h1 on long summaries.
  - Save the screenshots to `initiatives/training-library/docs/assets/049/`.
  - Seed through MCP `callTool` or the service, with `DISCORD_PROPOSALS_WEBHOOK_URL`, `DISCORD_WEBHOOK_URL` and `BARK_URL` blank. Clean up everything you create.
  - Use the dev server in worktree2 (`BETTER_AUTH_URL`/`NEXT_PUBLIC_APP_URL=http://localhost:3200`) and the DB `fitcsv-postgres-wt2`. Stop both when done.

## Done when
- A verdict: ship / ship with notes / fix first.
- Findings ranked by severity, each with a `file:line` or a screenshot.
- You re-ran the suggestions, training-library, nav and agent-tools tests and tsc.

## Hand back
First line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-10-31 MDT: created; dispatched to reviewer (wF:p3).
- 2026-10-31 MDT: fix first (#1 user titles, #2 error wording). Spec updated with title and error rules; fixes to the implementer, tests to the test-builder; #3 to the roadmap; #4 folded into fixes. Accepted.
