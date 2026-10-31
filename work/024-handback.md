Report: needs decision

(Received from implementer by cross-session message, 2026-10-30; summarized by the lead. Read-only; dev DB started for counts, then stopped.)

## Facts
- **Anchors:** `UserTrainingProfile.targetMovements` is `{ [pattern]: definitionId[] }`, at most 5 per pattern (schema:439; `lib/exercises/anchor-patterns.ts:44`). There are 6 patterns: hinge, squat, horizontal_push, horizontal_pull, vertical_push, vertical_pull.
  - `normalizeTargetMovements` (`lib/user-training-profile.ts:336`) cleans the map.
  - Settings writes it via `PUT /api/settings/target-movements`, replacing the whole map and dropping unknown ids. It doesn't check the exercise's movementPattern.
  - `computeAnchorStaleness` is pure (`anchor-staleness.ts:48`). `getAnchorStaleness` uses the global prisma, looks at the last 50 completions only, and has no archived filter.
- **FAU targets:** `UserMuscleBalanceSettings.targets` holds 18 FAUs (`ALL_FAUS`, `lib/fau-volume.ts:32`). With no row, every target is 1. Values are 0–2 on a 0.05 step (`lib/muscle-balance.ts:9-103`).
  - `getOrCreate` writes on read.
  - The Settings PUT does a full upsert, and the normalizer fills in missing FAUs.
- **Second store:** `UserTrainingProfile.ratioTargets` is copied from the settings row only when the profile is created, and never synced after. The aggregates and the suggest planner read `ratioTargets`; Settings and the picker read `settings.targets`. So Settings edits don't reach the planner.
- **Volume:** `getMuscleBalanceSnapshot` takes completed, unarchived sessions in `lookbackDays`. Each non-warmup set adds +1 per primary FAU and +`secondaryWeight` per secondary FAU. It outputs labels (neglected/balanced/over). The aggregates count primary FAUs only, over 7d/14d windows plus an 8-week median.
- **Write helpers:** `updateMuscleBalanceSettings` and `updateUserTrainingProfile` take a PrismaClient, not a transaction client.
- **Dev DB:** 0 settings rows, 0 anchors, 313 definitions, all FAU tags valid.

## Proposed contracts
- **Reads:** `get_anchors`, `get_balance_targets` and `get_fau_volume`, with primary and secondary sets reported separately and no labels. No write on read. The pure logic goes in `lib/insights/balance.ts`.
- **Proposals:** kinds `anchors.update` and `balance_targets.update`, both partial (only the named keys change).
  - `before` holds the full normalized value.
  - Conflict and revert compare the touched keys' values, not `updatedAt`, which bumps on unrelated profile or settings edits.
  - Targets must be on the 0.05 step (rejected, not rounded).
  - With no settings row, approve creates it with the default calc settings.
- **Admin page:** reuse FieldDiff, one row per touched key, with anchor ids resolved to exercise names.

## Questions
1. Which target store do agents use? Recommend `UserMuscleBalanceSettings.targets`, and fix the drift as a separate item.
2. The `get_fau_volume` window. Recommend his `lookbackDays` by default, with `days` up to 365.
3. Must an anchor exercise match its pattern? Recommend no, as in Settings.

Out of scope: `getAnchorStaleness` counts archived sessions and only looks at the last 50 completions.
