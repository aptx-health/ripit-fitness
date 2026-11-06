---
id: 133
state: accepted
waiting_on:
executor: reviewer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-04 Dustin (e-ink spec)
updated: 2026-11-05
---
# E-ink theme and display toggle: review

Checkout: worktree2, branch `feature/eink-theme`, uncommitted (`git status`). No phone preview or DB is running.

## Goal
An independent judgment of whether the build makes every scenario in `features/ui/eink.feature` true, is good code, and doesn't change any other theme.

## Do
1. First pass before reading any handback: read the feature and the diff. Check that the other 12 themes are untouched (CSS scoping, the global `*` rules only under `[data-theme="eink"]` or `[data-display="eink"]`), the inline scripts (no flash, no crash on bad storage, sign-in layout too), useReducedMotion on the server, and that the display toggle works with a non-eink theme.
2. Run it (production build via `.claude/skills/perf-check/scripts/serve-build.sh start`): seed user, e-ink theme + display on, screenshot at 390px and 632×840 (Chrome first, Playwright fallback): Training, Library, a logger session (keypad, plan line, rest timer, follow-along), Progress + lift page, Settings, sign-in, a dialog/sheet, an empty state. Look for anything unreadable, invisible, colour-only, or still moving. Then display on with the `ripit` theme (dark), and display off with `eink`, to check each half alone. Make greyscale copies. Save to `initiatives/eink-theme/docs/assets/133/`.
3. Run `npm run perf:scan -- --changed origin/dev` and one `perf:tap` on Progress → lift page with the display on (skeleton must still paint fast without the pulse).
4. Then read `work/131-handback.md` and `work/132-handback.md` and say whether their decisions hold.
5. Leave data as you found it; stop what you started.

## Hand back
First line `Report: complete | needs decision`. Verdict: ship / fix first, with findings ranked by severity (file:line). Don't edit code, `work/`, `STATE.md` or `status.md`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-04 CST: created; dispatched to reviewer (wF:p3).
- 2026-11-04 CST: back: fix first (invisible inputs, opacity fades, blocked storage, 5 low). Fixes 134 dispatched.
- 2026-11-05 CST: Dustin checked on the BOOX via phone preview ("Looks good"). Accepted.
