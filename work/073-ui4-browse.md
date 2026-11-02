---
id: 073
state: accepted
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-01 Dustin ("do all of them", stacked PRs)
updated: 2026-11-01
---
# UI4: Browse and program detail

Checkout: `~/projects/worktrees/ripit-fitness/worktree2`, branch `feature/ui-browse` (stacked on UI3).

## Read
`initiatives/ui-audit/spec.md` → shared rules, "UI4" and the 072 carry-overs; the audit's Browse / My Programs / Program detail sections and `05-*`, `06-*`, `07-*`, `15-*` screenshots; `initiatives/ui-audit/docs/assets/072/library-browse-*.png`; `components/community/CommunityProgramCard.tsx`, `CommunityProgramsView.tsx`, `MyProgramsList.tsx`, `ProgramHeader.tsx`, `StrengthWeekView.tsx`, `WorkoutHistoryList.tsx`.

## Do
Build UI4 as the spec says; keep existing tests passing and add tests for anything behavioural you change (count refresh, PaperTabTitle `span`). **Don't start a dev server or build until the lead says so**: Dustin's phone preview is serving from this worktree's `.next`. Read and edit code meanwhile; the lead will message you when the preview stops. Then take before/after 390px touch-emulated screenshots into `initiatives/ui-audit/docs/assets/073/` (use `git stash`-free "before" shots from the UI3 screenshots in `assets/072/` where they exist). Leave data as found. Don't commit.

## Done when
Spec "Done when".

## Hand back
Packet per `handoff-implementer`, first line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-01 MDT: created; dispatched to implementer (wF:p2), told to wait for the preview to stop before running a server.
- 2026-11-01 MDT: handback: done, green. 074 review dispatched (watch: dropped author/goals, 44px week arrows, 4 per screen).
- 2026-11-01 MDT: Dustin on phone preview: "Looks excellent". Accepted.
