---
id: 155
state: accepted
waiting_on:
executor: coach-impl
from: lead (lead-ripit-mcp)
confirmed: 2026-11-07 Dustin (keep the colours; the tabs match the folder tabs too much; picked mockup F "Section rule")
updated: 2026-11-07
---
# Group headers: section rule (mockup F)

Checkout: worktree1, branch `feature/workout-row-panel` (153 + 154, uncommitted; build on them). The phone preview is running from this worktree on :3100: stop it first (`.claude/skills/phone-preview/phone-preview.sh stop`) and say so in the packet.

## Goal
Replace 154's paper tabs with the section rule Dustin picked. Contract: the two scenarios at the end of `features/workout-library/row-panel.feature` (rewritten). Picture: option F in `initiatives/workout-library/docs/assets/154/tab-ideas.png` (source `mock.html` beside it).

## Keep
154's colour per group (New accent, Pinned secondary, Recent primary, Older muted), counts, spacing, Older fold behaviour, Show archived.

## Do
1. Update `GroupBox.tsx` (rename if the name no longer fits) and its tests in `__tests__/components/group-boxes.test.tsx` (yours from 154, not locked): no tab shape, count square + coloured name + line, rows in a bordered box.
2. Screenshots at 390px in light, dark and E-INK (collapsed, Older open) into `initiatives/workout-library/docs/assets/155/`.

## Done when
Tests pass; full `npx vitest run` passes; `npx tsc --noEmit` clean; `npm run perf:scan -- --changed origin/dev` clean.

## Hand back
Use `handoff-implementer`. First line `Report: complete | needs decision | further handoff`. Don't edit `work/`, `STATE.md` or `status.md`. Send the packet to the lead with `herdr agent prompt wE:p1 '<packet>'`.

## Log
- 2026-11-07 CST: created; Dustin picked mockup F; dispatched to coach-impl (wE:pA).
- 2026-11-07 CST: back complete (4439 pass); lead re-ran affected suites, tsc clean; screenshots checked. Preview restarted.
- 2026-11-07 CST: Dustin: "go ahead and move forward" without his review; lead accepted on the re-run checks and screenshots.
