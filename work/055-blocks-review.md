---
id: 055
state: accepted
waiting_on: 
executor: reviewer
from: lead (lead-ripit-mcp)
confirmed: 2026-10-31 Dustin (confirmed the three-block layout)
updated: 2026-10-31
---
# Review: TL6 final layout (three tabbed blocks)

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/training-folder-tabs`. The change is uncommitted. Change no files except your screenshots.

## Goal
Judge the three-block layout against the spec's last section, "TL6 final layout: three tabbed blocks", and the mockup in `docs/mockups/054/`. Dustin made two changes to the mockup: "All suggestions" sits directly beside the coach tab, and Workouts has no See all.

Your earlier TL6 review (053) covered the folder tabs.

## Focus
- **`components/training/TabbedBlock.tsx`:** tablist semantics and keyboard use; both panels rendered with the hidden one truly hidden (not focusable, not read out); the `localStorage` memory (read after mount, try/catch, never opening an empty panel); and no hydration mismatch.
- **No behaviour change** to Start, Repeat, the page-wide lock, the suggestion links or the Up Next link. Check that removing the empty-home screen didn't drop anything a new user needs.
- **`vitest.config.ts`:** the Node 22.4+ `--no-experimental-webstorage` execArgv change. Is it correct, and harmless on Node 20 CI?
- **Visual check:**
  - Take 390px screenshots with Chrome if it's connected, otherwise Playwright.
  - Cover: the 3 states from 054, a reload after switching (memory), and dark mode.
  - Compare them with `mockup 054` and TL6.
  - Save them to `initiatives/training-library/docs/assets/055/`.
  - The preview is running on port 3200 for Dustin. Use it read-only, or start your own server on another port. Don't stop the preview.
  - Seed safely, with the notification URLs blank, and clean up.

## Done when
A verdict (ship / ship with notes / fix first), ranked findings, and a re-run of the targeted tests and tsc.

## Hand back
First line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-10-31 MDT: created; dispatched to reviewer (wF:p3).
- 2026-10-31 MDT: ship with notes; #1, #3 and #4 sent to the implementer; #2 noted for Dustin. Accepted.
