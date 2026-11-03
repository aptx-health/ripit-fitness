---
id: 128
state: accepted
waiting_on:
executor: implementer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-02 Dustin (high reps: Top set tab + cap both; chart: rust with light fill)
updated: 2026-11-02
---
# Per-lift page: fixes after review 127

Checkout: worktree2, branch `feature/lift-page`, uncommitted. Small fixes: no separate test-builder; add or update tests yourself.

## Goal
Make the new scenarios under "After review 127" in `features/analytics/lift-page.feature` true.

## Read
- `work/127-handback.md` (findings 1–5) and the feature's new scenarios.

## Do
1. Browser back: ProgressView writes the shown week to the URL with `router.replace` (`?week=` for past weeks, bare `/progress` for this week).
2. High-rep lifts: open on Top set when no session has an e1RM; e1RM tab empty state "No e1RM: sets over 12 reps". Cap the S2 Lifts row's e1RM at 12 reps (`computeWeekLifts` in `lib/insights/progress-records.ts`: no e1RM, no change, no Flat for sets over 12). Records: drop the 1–12 limit on this page's rep records (weighted lifts).
3. Volume tiles count only sets on or after the exact range start (bars stay weekly).
4. Weighted lifts with some weight-0 sessions: leave those sessions out of the Top set chart and the top-set overlay.
5. Light area fill under the line charts in the folder colour.
- Locked tests that pin the old rules (1–12 records, S2 Lifts e1RM over 12 reps): don't edit them. List each failing one with the line and the new expected value in your packet; the lead amends them.
- Fresh 390px screenshots (light and dark) of a high-rep lift, the e1RM chart with fill, and the Progress row for a high-rep lift into `initiatives/analytics/docs/assets/128/`. Leave data as found.

## Done when
Full suite (after the lead's amendments) and `npx tsc --noEmit` clean; Biome clean on your files.

## Hand back
Use `handoff-implementer`. First line `Report: …`. Don't edit `work/`, `STATE.md`, `status.md` or locked tests. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-02 CST: created after review 127 and Dustin's answers; dispatched to implementer (wF:p2).
- 2026-11-02 CST: back; lead amended 3 locked assertions (records uncapped, Volume tiles in range). Suite 3898 pass, tsc clean. Follow-up sent: cap pinned lastSets e1RM at 12.
- 2026-11-02 CST: follow-up done: pinned lastSets e1RM capped at 12 (pinned-lifts-cap.test.ts). Lead re-ran. State review; phone preview next.
- 2026-11-03 CST: Dustin approved on the phone preview ("I also approve of the fix and the change"). Accepted.
