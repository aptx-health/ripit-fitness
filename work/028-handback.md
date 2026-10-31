Report: complete. 028 seed tests (red).

Added describe 'anchor approve seeds a new profile from Settings' (6 tests) to balance-proposals.steps.ts, relocked. Oracle: real getOrCreateUserTrainingProfile for a second user with the same settings.
1. settings quads 1.5 + lats 0.8, no profile -> ratioTargets equals oracle. 2. no settings, no profile -> default seed (18 FAUs). 3. sparse settings {quads:1.5} -> filled to 18 like oracle. 4. calc settings set -> seed has the 18 FAU keys only. 5. revert of a creating approve leaves seeded ratioTargets. 6. control: existing profile keeps its ratioTargets (passes today).
Red: 5 failed / 163 passed (168), all on the seed ({} today). Biome clean, no tsc errors in file.
Notes: test 5 assumes revert neither deletes the profile nor resets ratioTargets. Reference for implementer: normalizeMuscleBalanceTargets(settings.targets) or getDefaultMuscleBalanceTargets().
