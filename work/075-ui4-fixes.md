---
id: 075
state: accepted
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-01 Dustin ("do all of them", stacked PRs)
updated: 2026-11-01
---
# UI4 fixes from review 074

Checkout: worktree2, branch `feature/ui-browse`. Read `work/074-handback.md`.

## Do
1. **48px targets** on everything 074 listed: week arrows, Level menu items, the empty-state inline link (make it a proper 48px target or an outline button), My Programs row actions, WorkoutCard Start/Skip.
2. **Browse density:** hide the type chip when every listed program has the same type (show it only when it tells the user something); keep each meta item from breaking mid-item (`whitespace-nowrap` per item or non-breaking spaces).
3. **Bring back the author** ("by <author>" or the author first in the meta line, muted) and a small "more" cue (text or chevron) on the clamped description when it's clamped.
4. **Level menu closes** after a level is chosen (controlled `open`).
5. Give `PaperTabTitle` a `quiet` tone and use it for Recent history; fix the "1 exercises" plural.

Add tests for the behavioural bits (chip hidden when uniform, menu closes, plural). Touch-emulated 390px light/dark screenshots of Browse top and scrolled, the Level menu, program detail week and history into `initiatives/ui-audit/docs/assets/075/`. Own port; leave data as found. Don't commit.

## Done when
Suite, tsc, eslint/biome on touched files pass; every target touched is ≥48px.

## Hand back
Short packet, first line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-01 MDT: created from 074 findings 1–5; dispatched to implementer (wF:p2).
- 2026-11-01 MDT: done; measured. Re-review skipped on purpose (narrow, measured). Phone preview next.
- 2026-11-01 MDT: Dustin on phone preview: "Looks excellent". Accepted.
