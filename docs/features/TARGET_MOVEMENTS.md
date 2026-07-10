# Target Movements / "Anchors" — Feature Spec

**Status:** Draft (pre-issue)
**Milestone:** 17 — Mechanical recommendations v1
**Related:** #963 (recovery-aware FAU score — shares a presentation util only), #964 (exercise ranking within FAU)

## Summary

A user-curated **movement-pattern layer** on top of the exercise picker. In Settings, the
user optionally fills any of 6 movement patterns with up to 5 preferred exercises. In the
picker, a new **"Anchors"** view lists those movements **sorted by staleness** (days since
you last logged any of that movement's picks), each expanding to its short curated list.
Tapping an exercise adds it to the workout — the same action as any other pick.

The intent: a busy user who trains mostly isolation work for aesthetics still wants to make
sure the important compound movements get periodic exposure. Anchors surfaces "what big
movement have I not done in a while" without imposing a schedule.

## Key architectural finding: nearly independent of #963

Staleness here is pure "days since this exercise was last logged," computable
**synchronously** from logged-set history via the existing `getBatchExercisePerformance()`
(`lib/queries/exercise-history.ts:30`). No aggregates job, no `last_session_days_ago`, no
deficit blend, no recovery penalty.

Consequences:
- **Anchors can ship on its own timeline**, unblocked by #962 merging or #963 landing.
- The only thing shared with #963 is *presentation* (a staleness→chip label util), not the
  data path. Do not over-couple.

## Design decisions (locked)

1. **Staleness basis:** days since ANY of a movement's ≤5 curated picks was last logged (the
   *freshest* pick resets the movement).
2. **Taxonomy:** 6 core patterns — Hinge, Squat, Horizontal Push, Horizontal Pull, Vertical
   Push, Vertical Pull. Each optional.
3. **Tap behavior:** selecting a curated exercise adds it to the current workout. No separate
   "anchor fulfilled" event — staleness self-resets from the logged set.
4. **No weekly requirement / rotation** — just a list sorted by most stale.
5. **Never-logged movements** sort to the top (maximally stale). Movement badge uses the
   freshest pick's days-since.

## Data model (one additive column)

Mirror the FAU-importance pattern. `UserTrainingProfile` already stores `fauImportance` as a
normalized JSON blob (`prisma/schema.prisma:429`, `lib/user-training-profile.ts`). Add:

```prisma
// UserTrainingProfile
targetMovements Json?   // Partial<Record<AnchorPattern, string[]>> — pattern → up to 5 ExerciseDefinition ids
```

- **Keys** reuse a 6-item subset of the existing `MovementPattern` enum
  (`lib/exercises/auto-tag.ts:16`): `hinge`, `squat`, `horizontal_push`, `horizontal_pull`,
  `vertical_push`, `vertical_pull`. Define `ANCHOR_PATTERNS` + `ANCHOR_PATTERN_DISPLAY_NAMES`
  next to that enum so it stays consistent with the auto-tagger taxonomy.
- **Values** are `ExerciseDefinition.id` arrays (stable identifier, `schema.prisma:73`),
  capped at 5.
- **Normalization** (mirroring `normalizeFauImportance`, `lib/user-training-profile.ts:307`):
  drop unknown pattern keys, drop unknown/deleted exercise ids, truncate to 5. Stale curated
  ids self-heal on read.
- Requires the standard schema change flow (local `db push` + migration file for the new
  nullable column). No prod deploy from Claude.

## Settings page — "Target Movements"

Mirror `app/(app)/settings/muscle-balance/`:
- **Route:** `app/(app)/settings/target-movements/page.tsx`, linked from the settings hub
  (`app/(app)/settings/page.tsx`).
- **Editor:** `TargetMovementsEditor.tsx` — 6 rows, one per pattern, each optional and
  collapsed by default. Expanding a pattern lets the user pick up to 5 exercises.
- **Reuse:** the picker for choosing the 5 is `ExerciseSearchInterface` in **multi-select
  mode** — it already supports `selectedIds: Set<string>` (`ExerciseSearchInterface.tsx:22`).
- **API:** `app/api/settings/target-movements/route.ts` (GET/PUT), persisting through
  `updateUserTrainingProfile()`. Server-side normalization + range validation.

## The "Anchors" picker view

A **4th mode** in the FAU picker's view toggle (`ExerciseSearchInterface` →
`FilterChoiceSheet` header). With #963 the toggle is A-Z / Neglected / Recovery-aware;
Anchors makes it four. The toggle is currently a **2-button grid**
(`ExerciseSearchInterface.tsx:263`) — four options wants a segmented control or small
dropdown. This is a **shared touch-point with #963** (both edit this toggle — sequence to
avoid a merge conflict).

When **Anchors** is active, the sheet swaps its row taxonomy from FAU → movement:
- Rows = the user's **configured** movements only, **sorted by staleness descending**
  (never-logged first).
- Each row badge: `"12d since"` / `"3d since"` / `"New — never logged"` (reuses
  `FilterChoiceSheet`'s existing `badge`/`description` slots — no new primitive).
- **Tap a movement → filter the main exercise list to that movement's ≤5 curated ids.**
  Reuses the existing "pick filter → see filtered exercises" plumbing (today filters by FAU
  tag; Anchors filters by an explicit id set — a small new predicate). Delivers "clicking a
  row pulls up the short list" without a nested/expandable sheet.
- **Tap exercise → adds to workout** (existing add action).
- **Empty state:** if no movements configured, show a "Set up Target Movements in Settings →"
  CTA instead of erroring.
- **Freestyle/ad-hoc picker inherits this for free** — `ExerciseSearchStep` wraps the same
  component.

## Staleness computation (new helper)

`getAnchorStaleness(userId, targetMovements)`:
1. Collect all curated exercise ids across configured movements.
2. `getBatchExercisePerformance(ids, userId)` → most-recent completion per exercise
   (`lib/queries/exercise-history.ts:30`).
3. Per movement: `daysSince = min(days-since across its ids)`; `null` if none ever logged.
4. Sort: `null` (never) first, then by `daysSince` desc. Stable tiebreak on taxonomy order.

## The staleness split (finalized)

The only thing shared between #963 and Anchors is **one tiny pure label function** — a
presentation coupling, not a data or engine one.

**What already exists (do not rebuild):**
- **Numeric staleness per FAU** — #962 (PR #973) adds `MuscleBalanceItem.lastTrainedDaysAgo`
  + `recencyScore` and a days-based window to `lib/muscle-balance.ts`, live/synchronous.
- **Numeric staleness per exercise** — `getBatchExercisePerformance()`
  (`lib/queries/exercise-history.ts:30`) gives most-recent completion per exercise id. Anchors
  derives its per-movement days-since from this.
- **A verbose Date formatter** — `formatRelativeTime(date)` (`lib/format/relativeTime.ts`)
  produces "5 days ago". Wrong shape for chips (Date-based, verbose, no "never" case).

**The shared util** — `lib/recommendations/staleness.ts`, one pure function:
```ts
daysSinceLabel(daysAgo: number | null): string
// null            -> "New — never logged"
// 0               -> "Today"
// 1               -> "1d since"
// n               -> "{n}d since"
```
Used by both #963's staleness reason chip and Anchors' movement badges so the wording is
identical. `lib/recommendations/` does not exist yet; **whichever of #963 / Anchors lands
first creates this file, the other imports it** (pure + zero-dep, so no merge-order coupling).

**Not shared / dropped:**
- #963's `fau-score.ts` composite need-score and its other chip variants ("heavy overdue",
  "recovering") stay #963-local — Anchors has no deficit/recovery concept.
- The earlier "keep the need-score generically keyed so Anchors can reuse it" idea is dropped:
  Anchors sorts on raw days-since and never touches the need-score. No coupling needed.
- No shared `staleness(daysAgo)` *curve* — #962 already owns `recencyScore` for FAUs; Anchors
  sorts on raw `daysAgo`.

## Sequencing & dependencies

- **Independent of #962/#963 for data.** Can be built in parallel; shares only the
  `staleness.ts` presentation util (land that small util in whichever ships first).
- **Shared touch-point:** the picker view-toggle control. #963 makes it 3-way, Anchors 4-way.
- **Schema migration** for `targetMovements`.

## Test plan

- **Unit:** `normalizeTargetMovements` (drops >5, invalid patterns, unknown/deleted ids);
  `getAnchorStaleness` (min-across-picks, never-logged → top, ordering, tiebreak);
  `daysSinceLabel` formatting.
- **Integration:** settings GET/PUT round-trip; Anchors ordering for a fixture user with
  mixed histories; empty-config → CTA, no error; freestyle picker shows the same mode.

## Non-goals (v1)

- No weekly coverage requirement or rotation enforcement.
- No recovery/deficit blend on anchors — pure staleness only.
- No dependency on the LLM `movement_pattern` catalog tags (sparse/null; user-curation
  sidesteps them).
- No new "anchor fulfilled" event/table.
