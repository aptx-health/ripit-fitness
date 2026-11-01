---
id: 068
state: accepted
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-01 Dustin ("do all of them", stacked PRs)
updated: 2026-11-01
---
# UI2 fixes from review 067

Checkout: worktree2, branch `feature/ui-quick-actions`. Read `work/067-handback.md`.

## Do
1. **Gold hover border, at the source.** Change `[data-theme="ripit"] .bg-card:hover` (`app/globals.css:2348`) so it never applies on touch devices (wrap in `@media (hover: hover)`) and never applies to folder boxes (Training's `TabbedBlock`/`SECTION_BOX` boxes and this sheet). Pick the least surprising selector; say which. Remove the `hover:border-primary!` pin. Check other themes for the same pattern and apply the same guard if present.
2. **No header strip.** Drop the `border-b` strip and its caption; put the close button on the tab row (right side, outside the tab), as Training has no strip. Keep it 48×48 and accessible.
3. **Discard button** `min-w-12`.

Screenshots at 390px into `initiatives/ui-audit/docs/assets/068/`: the sheet (normal, draft, freestyle; light and dark), one touch-emulated shot after a tap, and Training light/dark to show its boxes are unchanged. Don't commit.

## Done when
Suite, tsc, eslint/biome on changed files pass; on touch emulation the box border stays green after a tap.

## Hand back
Short packet, first line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-01 MDT: created from 067 findings 1–3; dispatched to implementer (wF:p2).
- 2026-11-01 MDT: done; measured on touch emulation. Re-review skipped on purpose (narrow fixes, measured). Phone preview next.
- 2026-11-01 MDT: Dustin on phone preview: "looks great". Accepted.
