Report: complete

(Received from test-builder by cross-session message, 2026-10-27; summarized by the lead.)

- New file `__tests__/features/agent-tools/training-insights.steps.ts`, read-only and biome-clean. `training-insights`: 33 failed, 41 passed (74). Every failure is a missing tool or arg error. The other agent-tools files pass: 274.
- All 10 scenarios are bound with hand-computed seeds and exact numbers, nulls and order. It asserts that no verdict/flags/thresholds/trend/minSessions/minRatedSets key appears in a response.
- Extra plain tests:
  - every arg limit, with errors carrying `field`;
  - the `sessions` trim keeps the newest;
  - `sinceDays` drops older sessions;
  - 2 sessions give a change of 0;
  - an unknown id gives [];
  - both tools appear in `listTools`;
  - exactly one read query per tool, with 3 exercises.
- Seeds also cover: draft and skipped excluded, abandoned included, `isAdHoc: false` included, other user and archived.
- Pass-proof: a scratch fake passed 74/74; 32 broken variants each failed only their target. One variant survived: best-tie resolution, which the spec didn't say (now pinned). The fake is deleted.
- Assumptions:
  - The date is `completedAt`.
  - Weight and unit are reported as logged, and e1rmLbs is converted.
  - `changePct` allows ±0.15 for rounding order.
  - `repRange` is only asserted where reps are uniform.
  - Week `start`/`end` are full timestamps: contiguous, 7 days each, `weeks[0].end` ≈ now.
- Not verified: performance on large histories, and the HTTP route.
