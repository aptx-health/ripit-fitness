---
id: 098
state: accepted
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-01 Dustin (picked direction A for all three)
updated: 2026-11-01
---
# L3 build: paper tabs and the plan sheet

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/logger-plan` (on dev after L2's merge).

## Read
`initiatives/ui-audit/spec.md` → "L3"; `features/ui-audit/logger-plan.feature`; the 097 tests (read-only; interface pinned in the four file headers) and `work/097-handback.md`; the looks `initiatives/ui-audit/docs/logger-audit/ideas/tb-a-*.png`, `pd-a-*.png` and the audit README's Plan drawer / Tab bar sections (all on dev now).

## Do
Build L3 as the spec and tests say. `PaperTabTitle`'s `count` is a number; extend it (or add a chip) for "2/6" without breaking its other callers. Real drag (pointer and keyboard) must still work in reorder mode: check it live, since the tests mock DndContext. Touch-emulated 390px screenshots, light and dark, before/after: each tab, the plan sheet mid-workout, reorder mode, a long name, the header, the last exercise with one Finish; into `initiatives/ui-audit/docs/assets/098/`. Own port; leave data as found (temp user via SQL copy if needed, deleted after). Don't commit.

## Done when
Spec "Done when".

## Hand back
Packet per `handoff-implementer`, first line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-01 MDT: created after 097; dispatched to implementer (wF:p2).
- 2026-11-01 MDT: handback: done, green. 099 review dispatched.
- 2026-11-01 20:45 CDT: accepted (Dustin, L3 preview: "Looks great").
