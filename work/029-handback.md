Report: complete. 029 ratio seed fix.
swapAnchors no-profile branch reads userMuscleBalanceSettings.targets in the same tx and seeds ratioTargets with normalizeMuscleBalanceTargets(settings.targets), or getDefaultMuscleBalanceTargets() with no row (same rule as getOrCreateUserTrainingProfile, lib/user-training-profile.ts:491). Revert unchanged. Only lib/proposals/balance.ts changed.
Verdict: agent-tools 7 files 564/564 (balance-proposals 168/168); tsc, biome, eslint clean. Spot break (always defaults): 4 settings-dependent seed tests failed; restored byte-identical.
Note: the seed carries Settings' step rounding noise, matching getOrCreate.
Not run: full suite.
