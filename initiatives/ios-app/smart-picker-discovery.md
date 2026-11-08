# Scoping note: smart exercise picker (sorts, anchors, balance settings)

Date: 2026-11-08 · Author: parity-disco (work item 192) · Request: map exactly how the web's add-exercise modal does its drop-down filters, its A–Z / Neglected / Recovery sorts and Anchors view, and the settings that feed them, so an iOS slice can be specified.

## Summary
On the web, the smart sorts live only in the **freestyle "Add exercise" picker**. They reorder the 18 muscle groups in the muscle-group drop-down; they never reorder the exercise list. Anchors swaps that drop-down for your pinned movements. All the maths is pure and easy to port: balance snapshot, planned volume, recovery score and anchor staleness. The phone already stores every input except **target movements** (not in the export) and the **aggregates and tuning** data that Recovery's "heavy" and "comeback" terms use. Proposal: two slices. (A) Port the sorts and Anchors, plus a Target movements editor. (B) Add a Muscle balance settings screen.

## Constraints
- Nothing built here. iOS is local-only, so any web data reaches the phone through the ripit-export file (`ios/RipitCore/Sources/RipitCore/ExportFile.swift`, `docs/RIPIT_EXPORT_FORMAT.md` on `feature/data-export`).
- Slice 8 (`features/ios-app/picker-custom.feature`) already covers search, the muscle-group and equipment filters, multi-pick and custom exercises. This note doesn't repeat them.
- Ported maths gets goldens from the web's own code (the `scripts/ios/*goldens.ts` pattern).

## How "observed" was done
Local web on this branch at 390×844 (Playwright, Chromium 1248, 2× scale). `dev.sh` couldn't start because another process holds slot 1's overmind socket (same as 173). So I ran `scripts/start-postgres.sh` (container `fitcsv-postgres-wt1`, port 5434, normal seeds) and `next dev` on port 3192, using Doppler via `--scope ~/projects/ripit-fitness`. Logged in as the synthetic `bodybuilder@synthetic.test`: 8 workouts and 307 effective sets in the 14-day window. Through the local API I gave it target movements for 5 of the 6 patterns. Both servers are stopped. Screenshots are in `initiatives/ios-app/handoff/smart-picker-assets/`. Rows below are tagged **O** (seen running) or **C** (read from code only).

## Where the picker appears (web)

| Caller | Sorts / Anchors | Balance % rows | Preload | Tag | Shot |
|---|---|---|---|---|---|
| Freestyle logger › Add exercise (`AdHocExercisePickerModal`, mode add) | A–Z, Neglected, Recovery, Anchors | yes, plus "+N planned" | yes | O | `web-freestyle-picker.png`, `web-sheet-*.png` |
| Freestyle logger › ⋯ › Swap this exercise (same modal, mode swap) | none | none (plain list) | yes | O | `web-freestyle-swap-picker.png`, `web-freestyle-swap-sheet.png` |
| Program builder › + Add exercise (`ExerciseSearchModal`) | none | none | no ("Enter a search term…" prompt) | O | `web-builder-picker.png`, `web-builder-sheet.png` |
| Program workout logger › add / swap wizards (`ExerciseSearchStep`) | none | none | yes | C | — |
| Settings › Target movements › Edit exercises (`TargetMovementsEditor`) | none | none | yes, multi-pick capped at 5 | O | `web-settings-target-movements-editor.png` |

The sorts appear only when the caller passes the data (`ExerciseSearchInterface.tsx` props `muscleBalanceSnapshot`, `recoveryRanking`, `anchors`). Only `app/(app)/training/adhoc/[completionId]/page.tsx` loads that data, and only for the add mode.

## Sorts and filters

### Muscle-group drop-down (the "View" toggle)
- **Layout (O).** The toggle sits at the top of the sheet: `A-Z | NEGLECTED | RECOVERY | ANCHORS`. It shows when a balance snapshot or anchors are passed. The default view is **A–Z** (`fauSort` starts as `'alphabetical'`). The choice isn't remembered: reopening the picker resets it.
- **Rows (O).** The first row is "All Muscle Groups", then 18 rows, one per muscle. Each row shows `adjusted / desired target sets`, a % badge and a progress bar. Example: `Hamstrings 29 / 20.0 target sets 145%`.
  - `adjusted = actualSets + plannedSets`
  - `desired = targetShare × totalEffectiveSets`
  - `% = min(adjusted / desired, 9.99) × 100`, rounded
  - Numbers print as integers or with 1 decimal (`formatSets`).
- **A–Z (O).** Sorted by display name with `localeCompare`.
- **Neglected (O).** Sorted by `targetShare − (actualSets + plannedSets) / totalEffectiveSets`, largest first. Ties go A–Z by display name. This is the picker's own adjusted deficit (`ExerciseSearchInterface.tsx` `scoreFAU`), not the snapshot's recency-blended order. Observed order: Obliques, Abs, Adductors (0%), then Forearms, Lower Back (33%), and so on. With no snapshot it falls back to A–Z.
- **Planned (O).** "Planned" means exercises already in the workout plus those ticked in the picker, at **3 sets each** (`HYPOTHETICAL_SETS_PER_EXERCISE`). A primary muscle gets 3 sets; a secondary muscle gets 3 × `secondaryWeight` when secondary muscles are counted. The row shows "+N planned". Ticking a crunch and a hip adduction moved Abs and Adductors to "3 / 16.7, 18%, +3 PLANNED", below Obliques (`web-sheet-neglected-planned.png`).
  - Quirk (C): `desired` still uses the un-planned `totalEffectiveSets`.
- **Recovery (O).** Offered only when the ranking is non-empty. Sorted by `need` (largest first), ties A–Z. Each row's meta line shows a "why" chip instead of "+N planned".
  - `need = d·deficitShare + w1·stale(lastTrainedDaysAgo, 14d) + w2·stale(lastHeavyDaysAgo, 21d) − w3·[hammered]` (`lib/recommendations/fau-score.ts`).
  - `d` is 1, or 0.5 in comeback mode.
  - Default weights: `w1 = 0.05`, `w2 = 0.05`, `w3 = 0.1`.
  - "Hammered" means trained in the last 48h in a session with `sessionRpe ≥ 8`.
  - The tuning values come from the DB (`loadTuningConfig`).
  - The heavy term and comeback mode need `UserTrainingAggregates`, and are off at `cold_start`.
  - If anything fails, it falls back to deficit plus staleness.
  - Chips (`pickReason`): "recovering"; "New — never logged" (not trained inside the window); "heavy overdue"; "Nd since"; nothing when staleness is 0 (trained today).
  - Observed order: Abs, Adductors, Obliques (never logged), Lower Back (1d since), Forearms (no chip), Calves (1d since), and so on (`web-sheet-recovery.png`).
  - Here `deficitShare` is the snapshot's: no planned sets.
- **Anchors (O).** This mode swaps the rows. The sheet title becomes "Filter by Movement", the first row is "All configured movements", then one row per configured pattern with a "days since" line.
  - Sorted by never-logged first, then days since (largest first), with ties in taxonomy order: hinge, squat, horizontal push, horizontal pull, vertical push, vertical pull.
  - Observed: Horizontal Pull (never), Horizontal Push (2d), Vertical Pull (2d), Hinge (1d), Squat (1d) (`web-sheet-anchors-configured.png`).
  - Picking one filters the exercise list to that pattern's pinned ids. Squat showed Barbell Back Squat and Leg Press (`web-picker-anchor-squat.png`).
  - With none configured, the sheet shows "No target movements yet" and a "Set up Target Movements →" link (`web-sheet-anchors.png`).
  - Switching into Anchors clears the muscle filter; switching out clears the anchor filter.
  - Days since = days since the most recent completed, non-archived workout in which any pinned id was logged, over all history (`lib/recommendations/anchor-staleness.ts`).

### Equipment drop-down (O)
Single choice: All Equipment, Barbell, Dumbbell, Cable, Machine, Smith Machine, Bodyweight, Resistance Band, Kettlebell, "Other (specialized equipment)" (`web-sheet-equipment.png`). It has no sorts and doesn't use the Settings › Equipment checklist. Slice 8 owns it.

## Settings pages

| Page | Fields, defaults, validation | Who reads it | Tag |
|---|---|---|---|
| **Muscle balance** `settings/muscle-balance` → `UserMuscleBalanceSettings` via `PUT /api/settings/muscle-balance` | See the field list below. | balance snapshot → picker Neglected and Recovery; Progress/insights; MCP; planner | O (`web-settings-muscle-balance.png`) |
| **Target movements** `settings/target-movements` → `UserTrainingProfile.targetMovements` via `PUT /api/settings/target-movements` | See the field list below. | picker Anchors; suggest-workout prompt; proposals | O (`web-settings-target-movements*.png`) |
| **Equipment** `settings/equipment` → `UserTrainingProfile.equipmentAvailable` via `/api/profile/training` | Presets (Commercial gym, Home: dumbbells + bands, Bodyweight only); 25 toggles in 6 groups; auto-saves. With no saved record it shows everything on ("full gym"). | **Workout suggestions, MCP and the planner only**: page copy says "Workout suggestions only use exercises you have equipment for". **Not the picker.** | O (`web-settings-equipment.png`) |

**Muscle balance fields:**
- 18 target ratios, each 0–2 in steps of 0.05, default 1.0. A slider plus a number field, with the live "% share" shown.
- Reset to defaults.
- "Completed workouts": 1–52, default 8.
- Include secondary muscles: default on. Secondary set credit: 0–1 in steps of 0.05, default 0.5.
- Ignore warmup sets: default on.
- A live preview panel. Save, then it returns to Settings.
- On save the server clamps and rounds the targets; a target the user didn't set defaults to 1.

**Target movements fields:**
- 6 patterns: Hinge, Squat, Horizontal/Vertical Push, Horizontal/Vertical Pull.
- Each pattern is optional and holds up to 5 exercises, kept in pick order.
- Each pattern expands to show chips with remove (×) and "Add/Edit exercises", which opens the picker in multi-pick mode with a cap banner.
- On save the server drops unknown or deleted ids and empty patterns.

## What I found
- **Observed:**
  - Everything tagged O above.
  - The bodybuilder's snapshot was 8 workouts and 307 effective sets over 14 days. Abs, Adductors and Obliques were at 0 and Triceps at 234%.
  - Recovery chips appeared only on muscles not trained today, and no "recovering" chip appeared (synthetic sessions likely have no `sessionRpe ≥ 8` in the last 48h; not checked).
- **Observed, phone side:**
  - The bundled `catalog.json` has `primaryFAUs`, `secondaryFAUs` and `equipment` for all 312 exercises.
  - The phone stores `completedAt`, `status`, `isArchived`, `loggedSet.isWarmup` and `workoutCompletion.sessionRpe` (`Schema.swift`).
  - The export's `balanceSettings` is present in the file but **skipped** on import (`ExportFile.swift:3`).
  - The export has **no `UserTrainingProfile`**, so no target movements or equipment.
  - Nothing on the phone writes `sessionRpe` (only imports carry it).
  - iOS uses one `ExercisePickerView` in three places: `WorkoutView.swift:106` (logger add), `ProgramBuilderView.swift:156` and `ProgramEditView.swift:63`. iOS has no swap.
  - `SettingsView.swift` exists (theme, intensity, unit, weekly target) and keeps `AppSettings` in UserDefaults.
- **Inferred:**
  - **The web's "Completed workouts" field does nothing to the picker.** The window is `lookbackDays` (default 14), which has no control in the UI. `lookbackWorkouts` is only stored and printed ("Last 8 of 8 completed workouts" is a coincidence: there happen to be 8 workouts in 14 days). This rests on `calculateMuscleBalanceSnapshot` in `lib/muscle-balance.ts` filtering by days only.
  - "New — never logged" in Recovery means "not trained in the window", not "never".
  - The export fixture's `balanceSettings.targets` (`lats: 14`, `chest: 12`, …) would be clamped to 2 by the web's normalizer, with the 14 muscles it doesn't list set to 1. The phone must normalize the same way.
- **Reusable on the phone (slice 4):**
  - `ProgressMath.swift` already has a `localeCompare` port, local-day maths and "completed, un-archived workout with its sets" loaders.
  - `Progress.swift` does the database reads.
  - Slice 8's picker adds the muscle-group sheet these modes plug into.
- **Unknown:**
  - The program-logger wizards were read from code only.
  - Whether the web export will ever carry `UserTrainingProfile`.
  - Whether Recovery's "recovering" chip ever fires for a phone-only user, since the phone never sets `sessionRpe`.

## Feature table

| Web behavior | iOS today | Size |
|---|---|---|
| View toggle in muscle sheet (freestyle add only) | none (slice 8 adds a plain sheet) | S |
| Balance % / target-sets rows + bar | none | S (UI) + M (snapshot port) |
| A–Z sort | slice 8 order | – |
| Neglected sort incl. +N planned | none | S on top of the snapshot |
| Recovery sort + why chips | none | M; heavy and comeback need aggregates (L) |
| Anchors view, days since, filter list to pinned ids | none | S–M |
| Anchors empty state with set-up link | none | S |
| Settings › Target movements (6 × ≤5, multi-pick) | none; no data source (not exported) | M |
| Settings › Muscle balance (18 ratios, secondary, warmups, preview) | none; the imported `balanceSettings` is dropped | M |
| Settings › Equipment checklist | none | M, but **no phone consumer** |
| Equipment drop-down | slice 8 | – |

## Pure functions worth golden-testing
1. `normalizeMuscleBalanceTargets` / `normalizeMuscleBalanceSettings` (`lib/muscle-balance.ts`): clamping, rounding, defaults. Include the fixture's 14/12 targets.
2. `calculateMuscleBalanceSnapshot(settings, completions, now)`: items, shares, fulfillment, status, recency, and their order.
3. `updateMuscleBalanceSnapshotSettings`: the settings screen's live preview.
4. The planned volume (`calculatePlannedFAUVolume` in `AdHocExercisePickerModal.tsx`) and the sheet rows from `fauOptions` in `ExerciseSearchInterface.tsx`: order, the "x / y target sets" text, %, bar and meta per mode. **Neither is exported.** The golden script must copy them or reach them some other way. Say so in the test brief.
5. `scoreFaus` (`lib/recommendations/fau-score.ts`) with and without the heavy and comeback inputs, plus `pickReason` chips.
6. `computeAnchorStaleness`, `daysSinceLabel`, `stalenessScore` (`lib/recommendations/`).
7. `normalizeTargetMovements` (`lib/user-training-profile.ts`): valid patterns, dedupe, cap 5.

## What web data the phone lacks
- **Target movements:** not in the export. They must be set on the phone, or added to the export (a web change, outside this initiative's iOS slices).
- **Muscle-balance settings:** in the export but not imported.
- **`UserTrainingAggregates.perFau.last_heavy_days_ago`, `detrainingGapDays`, `dataMaturity`:** computed by a web job from movement-pattern tags and e1RM fractions (`lib/aggregates/compute.ts`). Not exported, and big to port.
- **`TuningConfig`** (Recovery weights, window, RPE cutoff): server-only. The code defaults would do.
- **`sessionRpe` for new phone sessions:** the phone has no UI to record it.

## Decisions and assumptions
- **Where it shows on the phone.** On the web, smart sorts appear only in freestyle add, not in program-session add, the builder or swap. The phone has one logger picker (`WorkoutView`). Assumption: show smart sorts in the logger's add picker and keep the builder and edit pickers plain. That matches the web where the screens line up.
- **Recovery on the phone.** Recommended: port `scoreFaus` with the heavy and comeback terms off. That is exactly what the web does at cold start or when aggregates are missing, so it is still the web's behavior.
- **Neglected uses the picker's adjusted-deficit order, not the snapshot's recency-blended order.** That is what the web shows; the goldens should lock it.

## Proposed work
Slice A, "Smart picker" (M):
- Sorts, planned volume and Anchors in the logger's add picker.
- Import `balanceSettings`, using defaults when it's missing.
- A Settings › Target movements editor that uses slice 8's multi-pick, so Anchors has data.

Slice B, "Muscle balance settings" (M):
- The editor with live preview.

| Step | Role | Input | Output | Checked by |
|---|---|---|---|---|
| 1 | test-builder | this note, the web functions listed above | `scripts/ios/smart-picker.goldens.ts` + fixtures, Swift tests, break matrix | goldens deterministic; each test fails on a broken fake |
| 2 | implementer | tests, `.feature` | Swift port + UI | tests green; phone-width screenshots next to the `web-sheet-*.png` shots |
| 3 | reviewer → Dustin | PR packet | review | Handoff Hub page with sim screenshots |

Order: A then B. B reuses A's snapshot port, so it is mostly UI. Both wait for slice 8's sheet and multi-pick.

### Scenarios, plain English (slice A)
- When I open the muscle-group filter in the workout's Add picker, I see A–Z, Neglected, Recovery and Anchors, with A–Z selected. Each muscle shows "sets / target sets", a % and a bar, the same as the web for the same history and settings.
- Neglected puts the muscles furthest below their target share first. Ties go A–Z.
- Exercises already in the workout, and ones I've ticked, count as 3 sets each. They show "+N planned" and move the muscle down the Neglected list.
- Recovery orders muscles by need and shows why: "New — never logged", "Nd since", or "recovering" after a hard session (RPE 8 or more) in the last 48 hours.
- Anchors lists my target movements: never-logged first, then the longest since. Picking one shows only its pinned exercises. Switching views clears the other filter.
- With no target movements, Anchors shows an empty state with a link to set them up.
- In Settings › Target movements I can pin up to 5 exercises to each of the 6 patterns, remove them, and save. They survive a relaunch.
- Importing a ripit export brings in my muscle-balance targets, normalized as the web does.
- The builder and edit-program pickers stay plain.

### Scenarios (slice B)
- Settings › Muscle balance shows 18 ratios (0–2, steps of 0.05) with their % share, secondary on/off with its credit (0–1), and ignore warmups. A preview updates as I edit.
- Reset restores the defaults (all 1, secondary on at 0.5, warmups ignored). Saved values change the picker's Neglected and Recovery straight away.

## Risks
- Time-based maths (14-day window, 48h, days since) is sensitive to "now" and the local day. The goldens must pin `now`. The web uses whole 24h periods (`floor(ms / day)`), not calendar days. Don't reuse Progress's local-Monday helpers here.
- Sheet rows are computed inside a React component. A golden script that copies that logic can drift from the web's code.
- The synthetic data had no recent high-RPE sessions, so "recovering" wasn't seen running.

## Needs Dustin
1. **The "Completed workouts" field.** The web's field has no effect; the window is really 14 days. On the phone: (a) show a "Window: days" control that works; (b) leave the window out and fix it at 14 days; (c) copy the web's field as it is. Recommend **(b)**, plus a web bug ticket. Confidence: high that it's a web bug.
2. **Recovery's heavy and comeback terms.** (a) Leave them off (the web's cold-start behavior); (b) port the aggregates job. Recommend **(a)**. Confidence: medium-high.
3. **Where target movements come from.** (a) Set them on the phone only; (b) also add `UserTrainingProfile` to the web export. Recommend **(a)** now and (b) later. Confidence: medium.
4. **The equipment checklist.** It has no phone consumer, because the phone has no suggestions or planner. Recommend leaving it out. Confidence: high.

## Out of scope / later
- The program builder's own "Muscle Group Balance" panel (`calculateWeekFAUVolume`). It isn't part of the picker.
- Recording session RPE on the phone, which would feed Recovery's "recovering" chip.
