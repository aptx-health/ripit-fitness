---
id: 064
state: accepted
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-01 Dustin ("do all of them", stacked PRs)
updated: 2026-11-01
---
# UI1 fixes from review 063

Checkout: worktree2, branch `feature/ui-shared`. Read `work/063-handback.md`.

## Do
1. **Status bar follows the app's theme.** When the app applies a theme or mode (`lib/theme.ts`, `applyTheme` around line 211), update `<meta name="theme-color">` to that theme's actual `--background` (read the computed value, so all 12 themes and light/dark work). Keep the server-rendered light/dark tags as the first-paint default; make sure the runtime update wins (e.g. update both tags, or replace them with one). Add a unit test for it in `lib/theme.test.ts` style.
2. **`PaperTabs`:** if `value` matches no tab, the first tab gets `tabIndex` 0, so keyboard users can still reach the strip. Add a test (in a new file; the 061 files are read-only).
3. **`SubpageHeader`:** back link `min-h-12` (48px).

Don't commit.

## Done when
The new tests and the whole suite pass; tsc and eslint clean on changed files.

## Hand back
Short packet, first line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-01 MDT: created from 063 findings 1–3; dispatched to implementer (wF:p2).
- 2026-11-01 MDT: done; lead re-ran 96/96 + tsc. Review: Dustin's phone preview.
- 2026-11-01 MDT: Dustin: keep UI1 as is (blur needs the scroll-shell item, 065). Accepted.
