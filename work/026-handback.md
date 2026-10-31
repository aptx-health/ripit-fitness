Report: complete (026 build balance)

Held outside work/ until the 027 reviewer's first pass is done.

Built: lib/insights/balance.ts (pure: effectiveTargets unrounded with default 1, calcSettings, isValidTarget 0-2 step 0.05 tol 1e-9, formatTarget <=2 decimals, buildAnchors, computeFauVolume); lib/proposals/balance.ts (checkAnchorChanges/checkTargetChanges name first failure by key, calc keys refused; anchorsBefore/targetsBefore; summaries; swapAnchors/swapTargets compare touched keys then write, updatedAt guard inside tx for concurrent writes only; missing rows created: profile ratioTargets {}, settings default calc); service.ts kinds anchors.update and balance_targets.update (create re-checks, before = touched keys; approve re-check+swap, inverse=before; revert only if each touched key still holds approved value; P2002 -> conflict); tools.ts 5 tools, zod non-empty record of string[] | number; admin detail page balanceRows, one FieldDiff row per key, anchor names in one findMany, pending shows live value when moved, Revert shown.

Queries: get_anchors 3 (1 when none); get_balance_targets 1; get_fau_volume 2. Reads write 0 (test proxy).

Verdict: balance-proposals 162/162. Spot break of target conflict check and warmup exclusion failed exactly the 6 targeted tests; restored byte-identical. Full run: 3 files/12 tests failed from load (can't reach db localhost:33017); events 11/11, guided-completion 7/7, workout-limits 13/13 pass alone. Net 84 files pass, 1 skipped; 1416 pass, 4 skipped. tsc clean; biome and eslint clean on 5 files; npm run build exit 0.

Decisions to check:
1. Didn't reuse updateMuscleBalanceSettings / normalizeMuscleBalanceTargets for writes: Math.round(v/0.05)*0.05 stores float noise (0.35 -> 0.35000000000000003). Approve writes the raw on-step value. Settings-saved rows may hold noisy values; reads return raw, summaries/diff format to 2 decimals.
2. get_anchors omits anchor ids with no visible definition (deleted or another user's). Settings doesn't check visibility, so such ids can be stored.
3. get_fau_volume `sessions` counts every completed unarchived session in the window, including ones with no counted sets (same as Settings completedWorkouts).

Out of scope: ratioTargets drift; getAnchorStaleness archived/last-50; Settings rounding noise.
Not verified: admin page in a browser; rate limiting (limiter unchanged).
