---
id: 080
state: accepted
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-01 Dustin ("do all of them", stacked PRs)
updated: 2026-11-01
---
# UI6: Settings sub-pages

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/ui-settings-subpages` (stacked on UI5).

## Read
`initiatives/ui-audit/spec.md` → shared rules, "UI6"; the audit's Settings sub-pages table and `11-*`–`14-*` screenshots; `components/ui/SubpageHeader.tsx`; `MuscleBalanceSettingsEditor.tsx`, `TargetMovementsEditor.tsx`, `EquipmentChecklistEditor.tsx`, `AgentAccess.tsx`, `ProgramBackLink`; `components/settings/SettingsBlock.tsx` from UI5 (reuse its row and block pieces).

## Do
Build UI6 as the spec says; keep existing tests passing, add tests for any behaviour you change (e.g. Save turning primary when dirty, expanding a movement row). Before/after touch-emulated 390px screenshots (light, dark) into `initiatives/ui-audit/docs/assets/080/`. Own port; leave data as found (restore any setting you change). Don't commit.

## Done when
Spec "Done when".

## Hand back
Packet per `handoff-implementer`, first line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-01 MDT: created; dispatched to implementer (wF:p2). Test-builder skipped on purpose: layout work; the implementer adds tests for changed behaviour.
- 2026-11-01 MDT: handback: done, green. 082 review dispatched.
- 2026-11-01 MDT: Dustin on phone preview: "Everything looks great". Accepted.
