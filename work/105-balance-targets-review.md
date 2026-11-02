---
id: 105
state: review
waiting_on:
executor: reviewer
from: lead (lead-ripit-mcp)
confirmed: 2026-11-01 Dustin (tests → build → review)
updated: 2026-11-01
---
# Balance targets: one source of truth — review

Checkout: worktree2, branch `feature/balance-targets` (uncommitted diff against `origin/dev`). No UI change, so no screenshots.

## Do
1. First pass before reading any handback: read `features/agent-tools/balance-targets-source.feature` and the diff (`git diff origin/dev` plus untracked files). Judge whether every reader of targets now reads `UserMuscleBalanceSettings.targets`, nothing writes `UserTrainingProfile.ratioTargets` beyond its required value at creation, and anchor staleness ignores archived workouts with no row cap.
2. Hunt for readers or writers the build missed (`rg ratioTargets`, `ratio_targets`, the MCP tools, the clone-program cloud function, the admin pages, export).
3. Check the tests: do they prove the feature, and could a wrong build pass them?
4. Only then read `work/103-handback.md` and `work/104-handback.md`, and check their claims.
5. Run the full suite once.

## Done when
A verdict (`checks out` / `fix first` / `needs Dustin`) with findings ranked by severity, each with file:line.

## Hand back
First line `Report: complete | needs decision | further handoff`. Don't edit code, `work/`, `STATE.md` or `status.md`. Leave the DB as you found it. SendMessage `lead-ripit-mcp`.

## Log
- 2026-11-01 22:20 CDT: created; dispatched to reviewer (wF:p3).
- 2026-11-01 22:45 CDT: checks out; low findings 1-2 to ROADMAP, 3-6 noted.
