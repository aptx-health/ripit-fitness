---
id: 132
state: accepted
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-04 Dustin (e-ink spec as confirmed for 131)
updated: 2026-11-05
---
# E-ink theme and display toggle: build

Checkout: worktree2, branch `feature/eink-theme` (from dev at eb282c41). No phone preview is running.

## Goal
Make the tests pass and every scenario in `features/ui/eink.feature` true.

## Read
- `features/ui/eink.feature`
- `work/131-handback.md` (the contract; the lead accepted all 8 choices)
- Locked tests: `__tests__/lib/eink-display.test.ts`, `__tests__/lib/eink-theme.test.ts`, `__tests__/app/eink-inline-scripts.test.ts`, `__tests__/styles/eink-css.test.ts`, `__tests__/components/eink-motion.test.tsx`, `__tests__/components/eink-theme-ui.test.tsx`, `__tests__/app/eink-settings-ssr.test.tsx` (headers hold the full contract)
- Theme system: `lib/theme.ts`, `components/ThemeSelector.tsx`, `components/ThemeInitializer.tsx`, both layout inline scripts, `app/globals.css`, `app/(app)/dev/theme-validator/`

## Do
- `lib/display.ts`, the `eink` theme block and `[data-display="eink"]` rules, ThemeSelector/Settings changes, both inline scripts, and switch the motion components to `useReducedMotion`.
- Design the palette for Kaleido 3: saturated, clearly different fills (say what you picked and why); text always black.
- Also fix what the tests can't reach (131's Not verified): FollowAlongTabs' inline shadows/gradient/color-mix, inline `color: var(--primary)` text, `.text-destructive`, translucent `/10`-style tints, under the eink theme. Report anything you leave.
- Screenshots at 390px and at 1264×1680 / 2 (BOOX Go Color 7 CSS size ≈ 632×840), e-ink theme + display on: Training, Library, logger (keypad and plan line), Progress + lift page, Settings. Also one greyscale copy of each (to see what survives if the colour layer fades). Into `initiatives/eink-theme/docs/assets/132/`. Seed user; leave data as found.
- Run perf-check's `perf:scan -- --changed origin/dev` (AGENTS.md); no tap test needed unless you change a page's loading.

## Done when
New and existing tests pass; full suite and `npx tsc --noEmit` clean; Biome clean on your files.

## Hand back
Use `handoff-implementer`. First line `Report: …`. Don't edit `work/`, `STATE.md`, `status.md` or locked tests. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-04 CST: created; dispatched to implementer (wF:p2).
- 2026-11-04 CST: back; lead re-ran 238 tests + tsc. Review 133 dispatched.
- 2026-11-05 CST: Dustin checked on the BOOX via phone preview ("Looks good"). Accepted.
