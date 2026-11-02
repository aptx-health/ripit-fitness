---
id: 083
state: accepted
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-01 Dustin ("do all of them", stacked PRs)
updated: 2026-11-01
---
# UI6 fixes from review 082

Checkout: worktree2, branch `feature/ui-settings-subpages`. Read `work/082-handback.md`.

## Do
1. **Unsaved changes stay visible.** On Muscle balance and Target movements, when there are unsaved changes, show a sticky bottom bar ("Unsaved changes" + primary Save), sitting above the bottom nav and inside the app's scroll shell (`#app-scroll`, see `components/AppScrollContainer.tsx`), so Save is always reachable. Keep the header Save. Don't add a leave-without-saving warning.
2. **48px:** Agent access input, Create and Revoke (`AgentAccess.tsx` `BUTTON`), "Show all muscles", and the secondary-weight slider's hit area.
3. **Equipment presets in one row** at 390px (shorter labels, or a horizontally scrolling chip row; say which).
4. Movement rows show "0 / 5" instead of "OFF" when nothing is pinned, unless "Off" means something different there (say if so).

Add tests for 1 and 4. Touch-emulated 390px screenshots (light, dark) of Muscle balance scrolled with unsaved changes, Target movements unsaved, Equipment presets, Agent access, into `initiatives/ui-audit/docs/assets/083/`. Own port; restore any data. Don't commit.

## Done when
Suite, tsc, eslint/biome on touched files pass.

## Hand back
Short packet, first line `Report: ...`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-01 MDT: created from 082 findings; dispatched to implementer (wF:p2).
- 2026-11-01 MDT: done. Re-review skipped on purpose (narrow, measured). Phone preview next.
- 2026-11-01 MDT: Dustin on phone preview: "Everything looks great". Accepted.
