---
id: 039
state: accepted
waiting_on: 
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-10-31 Dustin (no work-item sign-off forms for this initiative)
updated: 2026-10-31
---
# Build: TL2 Training home

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/training-home`. It is stacked on TL1 (#1006). Don't commit.

## Goal
Build TL2 so its tests pass. Read:
- the contract, `initiatives/training-library/docs/spec.md` ("TL2 Training home"), including the two lines from Dustin under "Other changes";
- the behaviour, `features/training-library/training-home.feature`;
- the tests and seams, `work/038-handback.md`;
- the test files (read-only): `__tests__/features/training-library/training-home.steps.ts`, `__tests__/components/training-home-view.test.tsx` and `__tests__/components/nav-active-tab.test.tsx`.

## Do
1. Build the seams exactly as named in `038-handback.md`.
2. **Page glue (no tests, so be careful):**
   - `/training` first checks `trainingResumeRedirectTarget` (and redirects if it returns a URL); otherwise it renders `TrainingHome` with `getTrainingHome`.
   - `/` uses `homeRedirectTarget`.
   - "Start a workout" in the empty state opens the center button's QuickActionSheet if that's cleanly reachable; otherwise it starts a freestyle workout the way the sheet does.
3. **Lead decisions:**
   - Repeat of an archived completed session is a 404, the same as not-completed.
   - Remove TL1's `trainingRedirectTarget`, now unused. The test-builder is removing its TL1 tests in parallel; if they're still there when you finish, say so.
   - The detail page's back link is restyled to match the app's existing back navigation. Look at how other detail pages (e.g. program edit, learn articles, settings subpages) do it, and use the same component or pattern.
4. **Check your own UI before handing back:**
   - Take phone-width screenshots with Claude in Chrome (`mcp__claude-in-chrome__*`; Playwright only if Chrome is unavailable).
   - Cover: Training with an active program, Training empty (a user with no programs or sessions), the detail page's back link, and the bottom nav on Training and on the detail page.
   - Put the screenshots in `initiatives/training-library/docs/assets/039/`.
   - Run the dev server per the TL1 note: `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` must be `http://localhost:3200` (or use the phone-preview script if it's free).
   - Leave no real side effects.
5. **Run the check:** the TL2 files, the TL1 files, the full suite, `npx tsc --noEmit`, and biome on the changed files.

## Done when
- The TL2 and TL1 tests are green.
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
- 2026-10-31 MDT: handback saved. Lead re-ran: 1859 passed, 4 skipped; tsc clean; screenshots look right. Review 040 dispatched.
- 2026-10-31 MDT: review 040 fixes sent: onboarding expand, SSR date, Find a program button, back-link padding.
- 2026-10-31 MDT: retry in (4 fixes). Lead re-ran: full suite green, tsc clean. Preview up; waiting on Dustin.
- 2026-10-31 MDT: Dustin: "Looks great" on the phone preview. Accepted.
