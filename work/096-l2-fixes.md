---
id: 096
state: accepted
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-01 Dustin (picked direction A, which is the bb-a-done mockup)
updated: 2026-11-01
---
# L2 fixes from review 095

Checkout: worktree2, branch `feature/logger-bottom-bar`. Read `work/095-handback.md`.

## Do
1. **Match bb-a-done** (Dustin picked A): after the last planned set, "Next exercise ›" / "Finish" is the filled main action and "+ Extra set" is the outline one; the inputs collapse behind a quiet "All prescribed sets logged" strip until "+ Extra set" is tapped, which reopens the form for one more set. Look at `initiatives/ui-audit/docs/logger-audit/ideas/bb-a-done-*.png` (on dev). The locked 093 tests pin names and behaviour, not which is filled; if a locked test conflicts, stop and tell me rather than working around it.
2. **Disabled states read as off** in every theme: off squares get a fainter border and icon; an off main button is clearly off (not just `saturate-50`). Check catppuccin light and ripit dark.

Add tests for 1 (new file). Screenshots (light, dark, plus catppuccin light) of the done state on a non-last and last exercise, and disabled ends, into `initiatives/ui-audit/docs/assets/096/`. Own port; leave data as found. Don't commit.

## Hand back
Short packet, first line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-01 MDT: created from 095 findings 1 and 3; dispatched to implementer (wF:p2).
- 2026-11-01 MDT: 096 question (locked test forbids 'all prescribed sets logged'): lead chose wording 'All planned sets logged'.
- 2026-11-01 MDT: done. Re-review skipped on purpose (narrow, tested, screenshotted). Phone preview next.
- 2026-11-01 MDT: Dustin on phone preview: "Ok looks great". Accepted.
