---
id: 092
state: accepted
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-01 Dustin (phone preview feedback)
updated: 2026-11-01
---
# L1: header button stroke (Dustin's preview)

Checkout: worktree2, branch `feature/logger-shared`.

## Problem
On the phone preview, the plan button (≡ + progress) and the X in `ExerciseLoggingHeader` show "a strange stroke": a light cream `border-2 border-border` outline on the brown header (`initiatives/ui-audit/docs/assets/dustin-l1-header-stroke.png`). `border-border` is a page-background token and looks wrong on `bg-secondary`.

## Do
Header buttons get no light outline: use a darker brown fill (`bg-secondary-active`, like the progress well) or a stroke in a header-appropriate token (e.g. `border-secondary-active`), whichever reads cleaner; keep 48px and a visible focus ring. Check the follow-along header for the same issue. Check every theme's header in light and dark (the brown is ripit; other themes have other header colours). Screenshots (crop to the header) into `initiatives/ui-audit/docs/assets/092/`. Don't commit.

## Hand back
Short packet, first line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-01 MDT: from Dustin's L1 preview screenshot; dispatched to implementer (wF:p2).
- 2026-11-01 MDT: done; preview restarted for Dustin.
- 2026-11-01 MDT: Dustin on phone preview: "Ok that's better". Accepted.
