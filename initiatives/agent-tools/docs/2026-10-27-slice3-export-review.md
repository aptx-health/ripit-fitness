# Slice 3, round 2 review: your rule changes and the raw export

**What you need to do:** reply "accept" and I'll open the PR into `dev` for all of slice 3 (insight tools, your rule changes, and the export). No questions this time.

## What changed
**Your two rule changes to the insight tools**
- **Bodyweight sets now count toward effort.** Pull-ups and dips at 0 weight show up in the weekly effort numbers.
- **Stall uses completed workouts only.** An abandoned workout no longer drags a stall average down. Effort still counts abandoned workouts, because you did do those sets.

**The raw export (bring your own agent)**
- **MCP tool `export_training_data({ since, until?, cursor?, limit? })`:** every set in a date range, warmups included and flagged, weights as logged. It returns up to 2,000 rows per page, each a compact array, plus a `nextCursor` for the next page.
- **CSV download for scripts:** `GET https://<host>/api/agent/export.csv?since=2026-01-01` with header `Authorization: Bearer <token>`. One file, up to 3 years, and the data never passes through the agent's context.
- **Columns:** date, completionId, workoutName, isAdHoc, status, sessionRpe, durationSeconds, exerciseDefinitionId, exerciseName, exerciseOrder, setNumber, reps, weight, unit, rpe, rir, isWarmup.
- **Token for a sandbox:** make a separate one in Workbench → Agent tokens and pass it as an env var (e.g. `RIPIT_TOKEN`). It can only read and propose, and you can revoke it on its own.

Example script for your coach agent:
```sh
curl -sH "Authorization: Bearer $RIPIT_TOKEN" \
  "https://ripit.fit/api/agent/export.csv?since=2026-01-01" -o sets.csv
```

## Evidence
- **Full suite: 1,254 pass**, and the type check is clean. The lead re-ran both after each step.
- The new tests cover:
  - paging 2,500 sets with no gaps or repeats;
  - token checks (none, revoked, wrong kind), done before anything else;
  - the 3-year limit, and the date bounds;
  - safe handling of text that looks like a spreadsheet formula.
- The test-builder broke a scratch version 50+ ways, and each break was caught.
- **Live check:** I ran a production build locally on the synthetic dev data, with notifications off.
  - No token → 401.
  - 4-year range → 400 with a clear message.
  - Valid request → a CSV attachment, `ripit-training-2026-01-01-2026-10-28.csv`, with 543 rows.
  - All three tools answered through the real `/api/mcp`.
  - The test token was revoked afterwards.

Sample CSV lines:
```
date,completionId,workoutName,…,exerciseName,exerciseOrder,setNumber,reps,weight,unit,rpe,rir,isWarmup
2026-08-30T23:30:00.000Z,…,Chest & Back,…,Barbell Bench Press,1,1,7,135,lbs,,,true
2026-08-30T23:30:00.000Z,…,Chest & Back,…,Barbell Bench Press,1,3,9,195,lbs,8,,false
```

## Reviewer's verdict: ship
The first pass was independent. It found no blocking issues and 4 small ones:
- **Fixed now:** the formula guard also catches text starting with a tab or spaces, and a blank `until=` now means "up to now". These were re-reviewed: ship.
- **Recorded in the roadmap for later:**
  - stream big CSVs instead of building them in memory (fine for one user today);
  - give the export its own, stricter rate limit (it shares the agent limit of 60/min now).

## Not verified
- Your real prod data and the speed of a full 3-year download.
- Staging. That comes after merge, and a Hermes or Claude Code trial with a script token is the real test.

## To accept
Reply "accept" and I'll open the PR into `dev`.
