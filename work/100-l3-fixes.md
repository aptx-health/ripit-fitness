---
id: 100
state: accepted
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-01 Dustin (picked direction A for all three)
updated: 2026-11-01
---
# L3 fixes from review 099

Checkout: worktree2, branch `feature/logger-plan`. Read `work/099-handback.md`.

## Do
1. **Added exercises show in the plan.** Build the sheet's rows from the logger's own exercise list (which includes one-offs added during the workout), so the chip, rows and summary match the header's "PLAN n/m" and you can jump to an added exercise.
2. **Reorder keeps you on your exercise.** After a reorder, the logger stays on the same exercise (by id), not the same position; the header count updates to its new position.
3. Drag grips 48×48.
4. The summary clock ticks while the sheet is open.

Add tests for 1, 2 and 4 (new file; 097 files stay read-only). Screenshots of the sheet after adding an exercise and after reordering the NOW row (light, dark) into `initiatives/ui-audit/docs/assets/100/`. Own port; temp user via SQL copy, deleted after; leave Dustin's "Push A" draft alone. Don't commit.

## Done when
Suite, tsc, eslint/biome on touched files pass.

## Hand back
Short packet, first line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-01 MDT: created from 099 findings 1, 2, 3, 5; dispatched to implementer (wF:p2).
- 2026-11-01 MDT: done; API change → 101 focused code review (no server) while the preview runs.
- 2026-11-01 20:45 CDT: accepted (Dustin, L3 preview: "Looks great").
