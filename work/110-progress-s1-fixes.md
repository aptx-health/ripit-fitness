---
id: 110
state: accepted
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-02 Dustin (normal = only weeks since first workout)
updated: 2026-11-02
---
# Progress S1: fixes from review 109

Checkout: worktree2, branch `feature/progress-report`. Read `work/109-handback.md`.

Skipping a separate test-builder pass on purpose: these are small fixes, and the implementer writes their tests in a new file, `__tests__/lib/insights/progress-fixes.test.ts`, plus route and view tests as needed.

## Do
1. **Normal (Dustin's decision):** average only the prior weeks (up to 8) that start on or after the week of the user's first counted workout. Gaps after the first workout still count as 0. With no qualifying prior week, show normal as "–" with no % change. The new scenario is in `features/analytics/weekly-report.feature` ("Normal only counts weeks since the first workout"). If a locked test pins the old rule, don't edit it. Stop and report which one.
2. **Streak over 8 weeks:** add tests. 10 full weeks plus this week gives 11; one missed week 10 weeks back gives 9.
3. **Bound the older-weeks query:** stop at the first week that missed the target. Use a grouped per-week count (for example `date_trunc` in the user's timezone) or paging, not every completion date.
4. **Future weeks:** the route returns 400 for a `start` after the current week in `tz`.
5. **Chart label:** the current week's last label reads "This wk", as in the mockup.

## Done when
New and existing tests pass, along with the full suite. tsc, eslint and biome are clean on touched files.

## Hand back
Use `handoff-implementer`. First line `Report: ...`. Don't edit `work/`, `STATE.md` or `status.md`. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-02 02:40 CDT: created from 109 + Dustin's answer; dispatched to implementer (wF:p2).
- 2026-11-02 02:55 CDT: implementer flagged locked progress-report.test.ts:429-430 (old normal rule); lead amended to 1 and 4 and re-locked. Item 1 proceeds.
- 2026-11-02 03:20 CDT: back; lead re-ran (207 pass). Phone preview for Dustin.
- 2026-11-02 CST: Dustin checked the phone preview ("Looks good"). Accepted.
