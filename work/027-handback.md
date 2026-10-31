Report: needs decision. Verdict: ship with fixes.

Checks: agent-tools 7 files, 558/558; tsc clean; biome clean on 5 changed files. No edits.

First pass (before reading handbacks): OK on user scoping, per-key conflict on approve and revert, calc settings and ratioTargets never written (except defect 1), reads side-effect free, validation (other users' exercises refused, re-checked on approve), admin page plain text only, query cost (get_anchors 3, get_fau_volume one batched findMany).

Defects:
1. Medium: lib/proposals/balance.ts:117 swapAnchors creates a missing profile with `ratioTargets: {}`. getOrCreateUserTrainingProfile (lib/user-training-profile.ts:491) seeds it from UserMuscleBalanceSettings.targets, and never does once the row exists. normalizeRatioTargets({}) (lib/aggregates/recompute.ts:153) returns null, so aggregates use 1.0 for every FAU for good. Fix: seed from normalizeMuscleBalanceTargets(settings?.targets) or the defaults, in the same tx.
2. Low, test gap: the admin detail page balanceRows (page.tsx:39-81) is untested. findMany ~line 74 has no visibleTo (harmless today); formatTarget(before[fau]) would throw on a malformed row. Needs the phone preview.
3. Low risk: effectiveTargets (lib/insights/balance.ts:48) doesn't accept numeric strings the way normalizeMuscleBalanceTargets does. Not live.
4. Low risk: get_fau_volume days=365 loads every set in the window.

Q1 (defect 1): a) seed (recommended); b) keep {} as a known risk; c) refuse approve with no profile.
Read 025-handback and 026 only after the first pass.
