---
id: 053
state: accepted
waiting_on: 
executor: reviewer
from: lead (lead-ripit-mcp)
confirmed: 2026-10-31 Dustin (picked mockup A)
updated: 2026-10-31
---
# Review: TL6 Training folder tabs

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/training-folder-tabs`, stacked on TL5a. The change is uncommitted: `git status` and `git diff`. Change no files except your own screenshots.

## Goal
Judge whether TL6 matches mockup A and the TL6 spec without changing behaviour. Read:
- the TL6 section of `initiatives/training-library/docs/spec.md`;
- `docs/mockups/050/mockup-a.png` and `.html`;
- the tests the test-builder updated, and the new `training-home-tabs.test.tsx`.

Don't read `work/052-handback.md` until your first-pass verdict is written.

## Focus
- **No behaviour change** from TL2, TL4 and TL5a: link targets, section order, the empty home, Start, Repeat and their locks.
- **Accessibility:** the `h2` labels, count chips (`role=img` with an `aria-label`), link names, focus order, and colour contrast of the gold and tan tabs against the text.
- **Code quality:** `SectionTab` is tidy, reusable and uses the theme tokens, with no stray hard-coded colours where tokens exist.
- **Visual check (Dustin's rule):**
  - Take phone-width (390px) screenshots with Claude in Chrome, or Playwright if Chrome isn't connected.
  - Cover: Training with 3, 1 and 0 suggestions, and a long target title.
  - Compare them side by side with `mockup-a.png`, and check the dark/light theme if the app has both.
  - Note any drift from the mockup.
  - Save the screenshots in `initiatives/training-library/docs/assets/053/`.
  - Seed safely, with `DISCORD_PROPOSALS_WEBHOOK_URL`, `DISCORD_WEBHOOK_URL` and `BARK_URL` blank, and clean up. Stop the server and DB.

## Done when
- A verdict: ship / ship with notes / fix first.
- Findings ranked by severity.
- You re-ran the targeted tests and tsc.

## Hand back
First line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-10-31 MDT: created; dispatched to reviewer (wF:p3).
- 2026-10-31 MDT: ship with notes. #1, #3 and #4 (clamp-2, short row label) go to the implementer; #2 to the roadmap; #5 stays as is (the chip shows what's listed, which the tests pin). Accepted.
