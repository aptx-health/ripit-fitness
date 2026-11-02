Report: complete (reviewer, wF:p3, 2026-11-01). Verdict: checks out.

- All target readers go through `getMuscleBalanceTargets` (profile DTO, planner, computeUserAggregates → recompute and clone-program). MCP get_balance_targets and suggestions already read Settings.
- Column writers: only the required default at creation; `updateUserTrainingProfile({ratioTargets})` writes Settings, and no production caller sends it.
- Staleness: completed, non-archived, MAX(completedAt), no cap.
- Low findings: (1) staleness tests don't pin user scoping or status filter; (2) staleness query duplicates get_anchors' (lib/mcp/tools.ts:451); (3) Settings write + profile update not in one transaction (latent); (4) docstring should say full replace resets missing FAUs to 1.0; (5) get_balance_targets shows raw values vs normalized elsewhere (pre-existing); (6) stored aggregates refresh only on recompute (planner computes live).
- Suite: 3056 passed / 4 skipped; tsc ok; lint/biome clean.
