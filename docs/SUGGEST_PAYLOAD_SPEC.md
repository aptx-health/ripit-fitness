# Suggest Workout Payload Spec — v2

**Status: authoritative.** This document is the single source of truth for the
contract between the training-state builder and the LLM planner, and for the
planner's output shape. It supersedes the v1 contract locked in the comment on
issue #877 (M15, closed) and consolidates:

- the four prompt-module amendments (`docs/SUGGEST_PROMPT_DESIGN.md` § deviations)
- the data & signal audit fields (`docs/data-signal-audit.md`)
- the cold-start contract (risk audit § Risk 5,
  `docs/audits/2026-07-01-suggest-workout-milestone-risk-audit.md`)
- the M16 locked decisions (discussion #905)

Changes to this contract require an issue + agreement, same as v1. Downstream
issues (aggregates job, training-state builder, synthetic seeder, planner)
code against this document, not against the historical #877 comment.

---

## Producers

Every field below is annotated with the component responsible for producing it:

| Producer | Meaning |
|---|---|
| **profile** | Read from `UserTrainingProfile` (plus `User.signupIntent`) and passed through, with normalization only. |
| **aggregates** | Computed by the `UserTrainingAggregates` recompute job (nightly + event-triggered, off the request path). Stored with absolute timestamps. |
| **builder** | Computed by the training-state builder at request time: assembles the payload, converts stored timestamps to `days_ago` relative to `now`, synthesizes goal sentences when needed, runs the deterministic candidate filter, derives `data_maturity`. |
| **request** | Taken from the Suggest request modal. Never persisted beyond the resulting `Suggestion` row. |

`days_ago` values are always computed by the **builder** from aggregate
timestamps at request time — the aggregates table stores timestamps, never
relative days.

## Global measurement rules

These were implicit or scattered in v1; they are now explicit contract rules.
Every producer must follow them.

1. **All weights are lbs.** Mixed-unit histories (`LoggedSet.weightUnit`) are
   normalized via `normalizeWeightToLbs` before any aggregation. The payload
   never carries kg. Field names carry the `_lbs` suffix where a weight is
   emitted.
2. **Warmup sets are excluded everywhere.** Sets with `isWarmup: true` are
   excluded from set counts ("effective sets"), from `recent_observations`,
   from EWMA inputs, and from top-set/e1RM series.
3. **Bodyweight-exercise weights are excluded from weight EWMAs.** Exercises
   whose equipment is bodyweight log `weight: 0`; those observations must not
   enter `per_movement_calibration` EWMAs or `recent_observations`. (Their
   sets still count toward FAU volume.)
4. **Abandoned sessions count.** Logged sets from `status: 'abandoned'`
   completions count toward FAU volume and set counts. Abandoned sessions
   appear in `recent_sessions` with `abandoned: true`.
5. **EWMAs are gap-decayed.** Strength estimates decay toward uncertainty
   across layoffs (see `lib/learning/math.ts`, issue #907); calibration
   entries carry `estimate_staleness_days` so the consumer can see how stale
   an estimate is.
6. **Nullable vs. omitted.** Arrays are always present (possibly empty).
   Scalars that can lack data are `null`, never absent — except where this
   spec explicitly marks a key *omitted* (e.g. `per_fau[].status` under
   `low_data`, `user_preference_score` under low confidence,
   `recent_sessions[].session_rpe` when not logged). Omission is reserved for
   fields where a null would still be misread as a signal.

---

## Top-level shape

```jsonc
{
  "data_maturity": "established",   // "cold_start" | "partial" | "established"
  "durable_profile": { ... },
  "ephemeral_context": { ... },
  "training_state": { ... },
  "candidate_exercises": [ ... ]
}
```

### `data_maturity`

| Field | Type | Nullable | Producer |
|---|---|---|---|
| `data_maturity` | `"cold_start" \| "partial" \| "established"` | no | builder (from aggregates counts) |

A **qualifying session** is a `WorkoutCompletion` with status `completed` or
`abandoned` containing at least one non-warmup logged set.

| Level | Threshold |
|---|---|
| `cold_start` | fewer than 3 qualifying sessions (matches History v2's empty-state threshold) |
| `partial` | ≥ 3 qualifying sessions, but fewer than 10 **or** first qualifying session less than 28 days ago |
| `established` | ≥ 10 qualifying sessions **and** first qualifying session ≥ 28 days ago |

Per-field cold-start behavior is specified inline in each section and
summarized in the [Cold-start contract](#cold-start-contract) table.

Consumers: the prompt layer uses `data_maturity` to (a) instruct the model to
plan from profile + candidates only at `cold_start`, and (b) relabel option
*display names* honestly (e.g. "Starter" instead of "Data Driven"). The option
**ids** (`user_preference` / `data_driven` / `wild_card`) never change — they
are the UI contract (#880-era design).

---

## `durable_profile`

Producer: **profile** (pass-through), except `goal_sentences` which the
**builder** synthesizes when the interview hasn't run (see below).

```jsonc
{
  "goal_sentences": ["Upper-body hypertrophy focus", "Spare legs for biking"],
  "weekly_intent": [ /* structured discriminated union — see #908 */ ],
  "equipment_available": ["barbell", "dumbbells", "cable", "machines", "bands", "bodyweight"],
  "banned_exercise_ids": [],
  "default_intensity_preference": "hypertrophy",   // "hypertrophy" | "strength" | "balanced" | null
  "ratio_targets": { "chest": 1.3, "back": 1.2 }   // full FAU dict
}
```

| Field | Type | Nullable | Producer | Cold-start |
|---|---|---|---|---|
| `goal_sentences` | `string[]` | no (never empty — see synthesis) | profile / builder | synthesized when interview absent |
| `weekly_intent` | `WeeklyIntent[]` (union below) | no | profile | as stored (may be `[]`) |
| `equipment_available` | `string[]` | no | profile | as stored |
| `banned_exercise_ids` | `string[]` | no | profile | as stored |
| `default_intensity_preference` | enum or null | yes | profile | `null` when unset |
| `ratio_targets` | `Record<string, number>` | no | profile | defaults from preset |

`weekly_intent` union (unchanged from v1 / #884, now owned by #908):

```typescript
type WeeklyIntent =
  | { type: 'heavy_session'; muscle_group: 'legs' | 'upper' | 'pull' | 'push'; min_per_week: number }
  | { type: 'volume_tilt'; toward: string[]; away_from: string[]; ratio: number }
  | { type: 'movement_frequency'; movement_pattern: string; min_per_week: number }
  | { type: 'free_text'; text: string }
```

Two fields are deliberately **not rendered** into the prompt (unchanged from
the prompt-design doc): `banned_exercise_ids` (bans are enforced upstream by
candidate filtering) and `ratio_targets` (fully expressed by the per-FAU
`target_share`/`deficit_share` columns). They remain in the payload for
auditability and the "what the AI sees" preview.

### Goal-sentence synthesis (cold-start contract, part 2)

`goal_sentences` is the most LLM-legible field in the payload, and the Goal
Interview that produces it is descoped from the beta wave. When
`UserTrainingProfile.goalSentences` is empty, the **builder** synthesizes
sentences from the Goals Wizard's structured fields via this deterministic
template. **No LLM call.** Output is stable for identical profile input.

Importance words: `1 → "very low priority"`, `2 → "low priority"`,
`3 → "medium priority"`, `4 → "high priority"`, `5 → "top priority"`.

```typescript
function synthesizeGoalSentences(profile: UserTrainingProfile, user: User): string[] {
  const out: string[] = []
  const imp = (n: number) =>
    ['very low priority', 'low priority', 'medium priority', 'high priority', 'top priority'][n - 1]
  // Sort: importance desc, then original array order (stable).
  for (const g of sortByImportanceDesc(profile.goalCategories ?? []))
    out.push(`${GOAL_PHRASES[g.category]} (${imp(g.importance)}).`)
  for (const a of sortByImportanceDesc(profile.otherActivities ?? []))
    out.push(`Also does ${a.activity}${a.cadence ? ` ${a.cadence}` : ''} (${imp(a.importance)}) — factor recovery.`)
  if (profile.targetSessionsPerWeek)
    out.push(`Aims for ${profile.targetSessionsPerWeek} sessions/week` +
      (profile.targetMinutesPerSession ? `, ~${profile.targetMinutesPerSession} min each.` : '.'))
  if (profile.patternPreference && profile.patternPreference !== 'no_preference')
    out.push(`Prefers a ${PATTERN_LABELS[profile.patternPreference]} split.`)
  for (const inj of (profile.injuryAreas ?? []).filter((i) => i.severity !== 'past'))
    out.push(`${inj.severity === 'active' ? 'Active injury' : 'Mindful of past injury'}: ${AREA_LABELS[inj.area]}.`)
  if (user.signupIntent) out.push(SIGNUP_INTENT_SENTENCES[user.signupIntent])
  if (out.length === 0) out.push('General fitness; no specific goals stated yet.')
  return out
}
```

Lookup tables (constants, colocated with the builder):

- `GOAL_PHRASES`: `build_muscle → "Build muscle"`, `get_stronger → "Get stronger"`,
  `lose_fat → "Lose fat"`, `general_fitness → "General fitness"`,
  `sport_performance → "Sport performance"`,
  `rehabilitation → "Rehabilitation / return from injury"`,
  `aesthetic_specific → "Aesthetic focus"`, `other → "Other goal"`.
- `PATTERN_LABELS`: `full_body → "full-body"`, `upper_lower → "upper/lower"`,
  `push_pull_legs → "push/pull/legs"`, `body_part_split → "body-part"`,
  `custom → "custom"`.
- `AREA_LABELS`: human-readable area names (`lower_back → "lower back"`, etc.).
- `SIGNUP_INTENT_SENTENCES`: one sentence per `User.signupIntent` value
  (e.g. complete beginner → `"Complete beginner — prioritize simple, learnable movements."`).

Interview-produced sentences, when they exist, are passed through verbatim and
synthesis is skipped entirely (no mixing).

---

## `ephemeral_context`

Producer: **request**. Unchanged from v1.

```jsonc
{
  "time_budget_minutes": 45,          // int, 10–240
  "intensity_vibe": "solid",          // "easy" | "solid" | "heavy" | null
  "deprioritize_freetext": "legs sore",   // string | null
  "prioritize_freetext": null,        // string | null
  "equipment_override": null          // string[] | null — null = use durable
}
```

| Field | Type | Nullable | Producer |
|---|---|---|---|
| `time_budget_minutes` | `number` (int, 10–240) | no | request |
| `intensity_vibe` | `"easy" \| "solid" \| "heavy"` | yes | request |
| `deprioritize_freetext` | `string` | yes | request |
| `prioritize_freetext` | `string` | yes | request |
| `equipment_override` | `string[]` | yes | request |

Cold-start: no behavior change — the request is always fully specified by the
modal.

---

## `training_state`

Producer: **aggregates** for all computed numbers; **builder** converts
timestamps to `days_ago` and assembles the block.

```jsonc
{
  "now": "2026-07-01T18:00:00Z",
  "today_dow": "wednesday",

  // ---- whole-body freshness & load (NEW in v2, data audit findings 1–3, 6) ----
  "sessions_last_7d": 3,
  "days_since_any_session": 2,               // null if no sessions ever
  "total_weekly_sets_baseline": 58,          // null until >= 2 qualifying weeks
  "acute_chronic_ratio": 1.1,                // null until denominator is meaningful
  "detraining_gap": null,                    // { "days": 17 } | null — null unless gap >= 10d

  "per_fau": [ ... ],
  "per_movement_calibration": [ ... ],
  "weekly_intent_status": [ ... ],
  "goal_progress": [ ... ],
  "recent_sessions": [ ... ],                // NEW in v2
  "recent_feedback": { ... },
  "preferences_summary": { ... }
}
```

### Top-level fields

| Field | Type | Nullable | Producer | Definition | Cold-start |
|---|---|---|---|---|---|
| `now` | ISO-8601 string | no | builder | request time | — |
| `today_dow` | string (lowercase day name) | no | builder | derived from `now` | — |
| `sessions_last_7d` | `number` (int) | no | aggregates | qualifying sessions in rolling 7d | present (may be 0) |
| `days_since_any_session` | `number` (int) | yes | aggregates + builder | days since most recent qualifying session | `null` when no sessions ever |
| `total_weekly_sets_baseline` | `number` | yes | aggregates | trailing 8-week **median** of whole-body weekly effective-set totals, Mon–Sun calendar weeks, current partial week excluded, **zero-logging weeks excluded** | `null` until ≥ 2 qualifying (non-zero) weeks exist |
| `acute_chronic_ratio` | `number` | yes | aggregates | rolling-7d effective sets ÷ (trailing-28d effective sets ÷ 4) | `null` when trailing-28d total < 20 effective sets or first session < 28 days ago |
| `detraining_gap` | `{ days: number }` | yes | builder | populated **iff** `days_since_any_session ≥ 10` **and** the user had ≥ 3 qualifying sessions before the gap; otherwise `null` | always `null` at `cold_start` (a new user is not "detrained") |

Interpretation guidance baked into the prompt layer (not the payload):
`acute_chronic_ratio < ~0.6` sustained → deload (deliberate or de facto);
`> ~1.5` → volume spike / overreach precursor; `detraining_gap` present →
ramp (~85–90% of prior loads, reduced volume).

### `per_fau[]`

One entry per FAU **with at least one effective set in the trailing 8 weeks**.
FAUs with no activity in that window are omitted (an all-zeros row is noise).

```jsonc
{
  "fau": "chest",
  "last_session_days_ago": 3,       // null if never trained
  "last_heavy_days_ago": 3,         // null if never heavy (session-relative — see below)
  "rolling_7d_sets": 12,
  "rolling_14d_sets": 21,
  "sessions_14d": 4,                // NEW in v2
  "baseline_weekly_sets": 11,       // NEW in v2 — null until >= 2 qualifying weeks
  "target_share": 0.10,
  "actual_14d_share": 0.07,
  "deficit_share": 0.03,            // positive = under-trained vs target
  "low_data": false,                // NEW in v2
  "status": "neglected"             // OMITTED (key absent) when low_data is true
}
```

| Field | Type | Nullable | Producer | Definition / cold-start |
|---|---|---|---|---|
| `fau` | `string` | no | aggregates | FAU key |
| `last_session_days_ago` | `number` | yes | aggregates + builder | `null` if this FAU has never been trained |
| `last_heavy_days_ago` | `number` | yes | aggregates + builder | `null` if never heavy. "Heavy" is **session-relative** (M16 decision 3): a session is heavy for a FAU iff it contains a working top set ≥ 85% of the relevant movement-pattern EWMA e1RM, or RPE ≥ 8 when logged; `intensityClass` tag is the fallback only when no EWMA exists (< 3 observations) |
| `rolling_7d_sets` | `number` | no | aggregates | effective sets, rolling 7d |
| `rolling_14d_sets` | `number` | no | aggregates | effective sets, rolling 14d |
| `sessions_14d` | `number` (int) | no | aggregates | qualifying sessions in rolling 14d containing ≥ 1 effective set for this FAU |
| `baseline_weekly_sets` | `number` | yes | aggregates | trailing 8-week median of this FAU's weekly effective sets, zero weeks excluded; `null` until ≥ 2 non-zero weeks — always `null` at `cold_start` |
| `target_share` | `number` | no | aggregates | derived from `ratio_targets` |
| `actual_14d_share` | `number` | no | aggregates | this FAU's share of total 14d effective sets |
| `deficit_share` | `number` | no | aggregates | `target_share − actual_14d_share`; positive = under-trained |
| `low_data` | `boolean` | no | aggregates | `true` when the whole-body 14d window holds < 3 qualifying sessions **or** < 20 total effective sets |
| `status` | `"neglected" \| "balanced" \| "over"` | no — but **omitted** when `low_data` | aggregates | pre-chewed label; suppressed under low data because a cheap model echoes whatever label it is handed. At `cold_start` every entry has `low_data: true`, so `status` never appears |

Rationale for the v2 additions (data audit findings 1–2): `deficit_share` is
zero-sum composition — total volume cancels out, so a taper week reads as
"legs neglected" and a genuine three-week slide reads as "balanced."
`baseline_weekly_sets` + `acute_chronic_ratio` add the missing absolute axis,
and also define the "N sets above baseline" figure History v2 promises.

### `per_movement_calibration[]`

One entry per movement pattern with **≥ 3 observations in the last 30 days**
(spec rule 2, unchanged). Observations respect global rules 1–3 (lbs only, no
warmups, no bodyweight-exercise weights).

```jsonc
{
  "movement_pattern": "horizontal_push",
  "current_ewma_top_weight_lbs": 192,
  "estimate_staleness_days": 3,             // NEW in v2 (gap-decayed EWMA, #907)
  "recent_observations": [                  // CHANGED in v2: timestamped
    { "weight_lbs": 185, "days_ago": 12 },
    { "weight_lbs": 190, "days_ago": 9 },
    { "weight_lbs": 190, "days_ago": 7 },
    { "weight_lbs": 195, "days_ago": 5 },
    { "weight_lbs": 195, "days_ago": 3 }
  ],
  "typical_rep_range": "5-8",
  "typical_rpe": 8,                         // null when RPE logging is off (amendment 2)
  "last_session_days_ago": 3
}
```

| Field | Type | Nullable | Producer | Notes / cold-start |
|---|---|---|---|---|
| `movement_pattern` | `string` | no | aggregates | |
| `current_ewma_top_weight_lbs` | `number` | no | aggregates | gap-decayed EWMA (#907) |
| `estimate_staleness_days` | `number` | no | aggregates + builder | days since the observation the estimate was last updated with |
| `recent_observations` | `{ weight_lbs: number, days_ago: number }[]` | no | aggregates + builder | last ≤ 5 top-set observations, ordered oldest → newest. **v1's bare-number array is retired** — timestamp-less arrays are indistinguishable between "5 sessions in 12 days" and "5 sessions in 3 months" |
| `typical_rep_range` | `string` | no | aggregates | e.g. `"5-8"` |
| `typical_rpe` | `number` | **yes** | aggregates | RPE/RIR logging is opt-in; `null` when unavailable. The renderer omits the RPE clause on `null` (amendment 2) |
| `last_session_days_ago` | `number` | no | aggregates + builder | |

Cold-start: the ≥ 3-observations rule makes this array **empty** (`[]`) at
`cold_start` by construction. That is correct — never relax the rule to fill it.

### `weekly_intent_status[]`

One entry per structured intent in `durable_profile.weekly_intent`.
**CHANGED in v2:** satisfaction is evaluated over a **rolling 7-day window**
(M16 decision 3), not the Mon–Sun calendar week — the calendar boundary made
every intent read unsatisfied on Monday mornings. The field is renamed
accordingly.

```jsonc
{
  "intent_summary": "At least 1 heavy leg day per week",
  "satisfied_last_7d": false,               // RENAMED from v1's satisfied_this_week
  "last_satisfied_days_ago": 8              // only when not satisfied
}
```

| Field | Type | Nullable | Producer | Rules |
|---|---|---|---|---|
| `intent_summary` | `string` | no | builder | human-readable rendering of the structured intent |
| `satisfied_last_7d` | `boolean` | no | aggregates (evaluator, #908) | rolling 7d ending at `now` |
| `evidence` | `string` | omitted unless satisfied | aggregates | populated **iff** `satisfied_last_7d === true` (spec rule 3) |
| `last_satisfied_days_ago` | `number` | yes; omitted unless unsatisfied | aggregates + builder | populated **iff** `satisfied_last_7d === false` (spec rule 4); `null` within that when never satisfied |

`free_text` intents get neither `evidence` nor `last_satisfied_days_ago`
(spec rule 5). `heavy_session` intents use the session-relative heavy
definition (see `per_fau.last_heavy_days_ago` above; evaluator spec is #908).

Cold-start: intents are evaluated normally (they are satisfiable even with
little data); `last_satisfied_days_ago` will typically be `null`.

### `goal_progress[]`

One entry per goal sentence with a movement-pattern interpretation.

```jsonc
{
  "goal": "Improve bench press",
  "interpretation": "horizontal_push EWMA + e1RM trend",
  "recent_top_sets_lbs": [185, 190, 190, 195, 195],
  "trend": "progressing",                   // "progressing" | "stalled" | "regressing" | "new"
  "weeks_observed": 5
}
```

| Field | Type | Nullable | Producer | Rules |
|---|---|---|---|---|
| `goal` | `string` | no | builder | the goal sentence |
| `interpretation` | `string` | no | aggregates | how the goal was mapped to measurable signals |
| `recent_top_sets_lbs` | `number[]` | no | aggregates | display series, oldest → newest |
| `trend` | enum | no | aggregates | **CHANGED in v2:** classified from the **e1RM** series (Epley), not raw top weight — 190×5 → 190×8 is progress, not a stall. `"new"` when `weeks_observed < 2` (spec rule 6) |
| `weeks_observed` | `number` | no | aggregates | |

Per M16 decision 5, the per-session e1RM/volume/avgRPE series behind `trend`
is computed **inside the aggregates job** — `ExercisePerformanceLog` is
deleted (see [Recorded decisions](#recorded-decisions)).

Cold-start: entries exist for every interpretable goal with `trend: "new"`
and short (possibly empty) `recent_top_sets_lbs`.

### `recent_sessions[]` — NEW in v2

The last ≤ 10 qualifying sessions, newest first. Closes four discard paths
from the data audit (session duration, abandoned sessions, per-exercise
notes, session RPE) in one block.

```jsonc
[
  {
    "days_ago": 2,
    "duration_min": 52,                     // persisted durationSeconds preferred; null when neither it nor a start time exists
    "total_sets": 18,                       // effective (non-warmup) sets, incl. abandoned sessions
    "abandoned": false,
    "session_rpe": 4,                       // OMITTED when not logged (opt-in 1-tap, may not exist)
    "notes": [                              // non-empty Exercise.notes from this session
      { "exercise": "Overhead Press", "text": "left shoulder clicking on set 3" }
    ]
  }
]
```

| Field | Type | Nullable | Producer | Rules |
|---|---|---|---|---|
| `days_ago` | `number` (int) | no | aggregates + builder | |
| `duration_min` | `number` (int) | yes | builder | prefers persisted `WorkoutCompletion.durationSeconds` (÷60, rounded); falls back to `completedAt − startedAt` rounded to minutes; `null` when neither is available |
| `total_sets` | `number` (int) | no | aggregates | effective sets in the session |
| `abandoned` | `boolean` | no | aggregates | `true` for `status: 'abandoned'` completions |
| `session_rpe` | `number` (int, 1–5) | omitted when absent | aggregates | from `WorkoutCompletion.sessionRpe` if/when the 1-tap rollup chip ships; **omitted**, not nulled, when not logged |
| `notes` | `{ exercise: string, text: string }[]` | no (may be `[]`) | builder | non-empty `Exercise.notes`, each truncated to ~120 chars, ≤ 5 notes per session (tightened from the 10 originally floated in #920 — 5 keeps the block token-cheap while still surfacing the exercises a user actually annotated) |

Cold-start: contains whatever sessions exist (0–2 entries). This block is the
one place a nearly-new user's actual behavior is visible to the model.

### `recent_feedback`

Unchanged from v1.

```jsonc
{
  "suggestions_last_30d": 6,
  "swap_rate": 0.22,
  "common_swaps": [ { "from": "barbell_bench_press", "to": "dumbbell_bench_press", "count": 2 } ],
  "common_additions_fau": ["biceps", "side_delts"],
  "common_deletions_fau": ["quads"]
}
```

| Field | Type | Nullable | Producer | Rules |
|---|---|---|---|---|
| `suggestions_last_30d` | `number` (int) | no | aggregates | |
| `swap_rate` | `number` | no | aggregates | `total_swaps / total_exercises_suggested` over last 30d (spec rule 9); `0` when denominator is 0 |
| `common_swaps` | `{ from, to, count }[]` | no | aggregates | top 5 max |
| `common_additions_fau` | `string[]` | no | aggregates | |
| `common_deletions_fau` | `string[]` | no | aggregates | |

Cold-start: all zeros / empty arrays. The block is always present.

### `preferences_summary`

Unchanged from v1.

```jsonc
{
  "high_confidence_likes": ["incline_dumbbell_press", "cable_fly"],
  "high_confidence_dislikes": ["barbell_back_squat"],
  "low_confidence_note": "Most exercises <3 observations — defer to candidate list"
}
```

| Field | Type | Nullable | Producer | Rules |
|---|---|---|---|---|
| `high_confidence_likes` | `string[]` | no | aggregates | Beta variance below threshold (spec rule 7) |
| `high_confidence_dislikes` | `string[]` | no | aggregates | same |
| `low_confidence_note` | `string` | omitted when confident data exists | builder | |

Cold-start: empty arrays + the low-confidence note.

---

## `candidate_exercises[]`

Producer: **builder** (deterministic pre-filter: equipment match, FAU
relevance, not in `banned_exercise_ids`). ~80–150 entries typical. Sent
unordered — the LLM ranks (spec rule 10). Unchanged from v1.

Equipment gating honors the explicit-record flag (`UserTrainingProfile.equipmentAvailableSet`, #927): when the user has an explicit equipment record, the list is authoritative and an **empty** list yields bodyweight-only candidates. Without an explicit record (or a request `equipment_override`, which is always authoritative), an empty list means "unconstrained — assume full access" so a user who never filled in equipment isn't stranded.

```jsonc
{
  "id": "exr_abc123",
  "name": "Incline Dumbbell Press",
  "primary_faus": ["chest", "front_delts"],
  "secondary_faus": ["triceps"],
  "equipment": "dumbbells",
  "movement_pattern": "horizontal_push",      // null if untagged → LLM infers from name/FAUs
  "intensity_class": "moderate",              // "heavy" | "moderate" | "light"; untagged → "moderate"
  "user_preference_score": 0.78,              // OMITTED entirely if low confidence (spec rule 8)
  "user_preference_confidence": "high"        // omitted with score
}
```

| Field | Type | Nullable | Producer |
|---|---|---|---|
| `id` | `string` | no | builder |
| `name` | `string` | no | builder |
| `primary_faus` | `string[]` | no | builder |
| `secondary_faus` | `string[]` | no | builder |
| `equipment` | `string` | no | builder |
| `movement_pattern` | `string` | yes (`null` = untagged) | builder |
| `intensity_class` | `"heavy" \| "moderate" \| "light"` | no | builder |
| `user_preference_score` | `number` | omitted when low-confidence | builder (from `UserExercisePreference` Beta) |
| `user_preference_confidence` | `"high"` | omitted with score | builder |

Cold-start: preference fields are omitted from every candidate (no
observations yet); everything else is data-independent.

---

## LLM output shape

Three options, fixed ids, fixed order. Consolidates v1 plus amendments 1, 3,
and 4.

```jsonc
{
  "options": [
    {
      "id": "user_preference",               // then "data_driven", then "wild_card" — exact order
      "name": "User Preference",             // display name; <= 60 chars
      "description": "Honors your input — skipping legs, chest-focused",   // <= 240 chars
      "summary": "5 exercises, ~40 min. Pure chest emphasis.",             // <= 240 chars
      "exercises": [
        {
          "id": "exr_abc123",
          "name": "Incline Dumbbell Press",  // NEW in v2 (amendment 1) — see below
          "rationale": "Heavy chest opener — closes 14d chest deficit"     // <= 240 chars
        }
      ]
    }
  ],
  "warnings": []                              // <= 5 strings, <= 300 chars each; defaults to []
}
```

| Field | Type | Rules |
|---|---|---|
| `options` | array, exactly 3 | ids must be `user_preference`, `data_driven`, `wild_card` **in that order** |
| `options[].exercises[].id` | `string` | must be a member of `candidate_exercises[].id`; no duplicates within an option |
| `options[].exercises[].name` | `string` | **Amendment 1.** Anti-hallucination grounding: writing the name forces attention through the real candidate row. Validated for presence only — the transform step reads the canonical name from the DB; a paraphrased name never fails a correct id |
| `options[].exercises[].rationale` | `string` (1–240) | one sentence; only numbers that appear in the input |
| `warnings` | `string[]` (≤ 5 × ≤ 300) | schema defaults to `[]` so a missing key never burns a retry |

### Exercise count enforcement (amendment 3)

v1 left "count fits time budget" undefined. `exerciseCountRange` defines it
(~8 minutes per exercise including rest/setup; v1 output has no sets/reps —
the user logs live). The same function feeds the prompt text and the zod
refinement, so instruction and check cannot drift.

| `time_budget_minutes` | min | max |
|---|---|---|
| ≤ 20 | 2 | 3 |
| 21–35 | 3 | 5 |
| 36–50 | 4 | 6 |
| 51–75 | 5 | 8 |
| > 75 | 6 | 10 |

Every option's exercise count must fall inside the band.

### Distinctness refinements (amendment 4)

- `user_preference` and `data_driven` must **not** contain the same exercise
  set (set-inequality; order-insensitive).
- `wild_card` must contain at least `wildCardNoveltyFloor(range)` exercises
  that appear in **neither** other option: **1** when `range.min ≤ 3` (short
  sessions), otherwise **2**.

These are validation backstops; the per-option procedures in the system
prompt do the real differentiation work (see `docs/SUGGEST_PROMPT_DESIGN.md`).

---

## Cold-start contract

Consolidated per-field behavior by maturity level. "omitted" = key absent;
"null" = key present with `null`; "empty" = `[]` / zero values.

| Field | `cold_start` | `partial` | `established` |
|---|---|---|---|
| `data_maturity` | `"cold_start"` | `"partial"` | `"established"` |
| `goal_sentences` | synthesized from wizard fields when interview absent | same rule | same rule |
| `sessions_last_7d` | present (possibly 0) | present | present |
| `days_since_any_session` | null when no sessions ever | present | present |
| `total_weekly_sets_baseline` | null | null until ≥ 2 qualifying weeks | present |
| `acute_chronic_ratio` | null | null until 28d span + ≥ 20 sets in 28d | present |
| `detraining_gap` | always null | per rule (≥ 3 prior sessions + gap ≥ 10d) | per rule |
| `per_fau` | entries only for trained FAUs; all `low_data: true`; `status` omitted | `status` omitted per-entry while `low_data` | fully populated |
| `per_fau[].baseline_weekly_sets` | null | null until ≥ 2 non-zero weeks | present |
| `per_movement_calibration` | empty (≥ 3-observation rule) | entries as patterns qualify | populated |
| `weekly_intent_status` | evaluated normally | evaluated normally | evaluated normally |
| `goal_progress` | entries with `trend: "new"` | mixed | populated |
| `recent_sessions` | 0–2 entries | populated | populated (≤ 10) |
| `recent_feedback` | zeros / empty arrays | populated | populated |
| `preferences_summary` | empty + `low_confidence_note` | per Beta confidence | per Beta confidence |
| `candidate_exercises[].user_preference_*` | omitted on all | per confidence | per confidence |

Prompt/UX consequences (specified here so no consumer invents its own rule):

1. At `cold_start` the prompt layer instructs the model to plan from
   **profile + candidates only** and to keep rationales free of history
   claims (there is no history to cite).
2. Option display names are relabeled honestly at `cold_start` (e.g.
   "Starter" instead of "Data Driven"); option **ids are unchanged**.
3. The "what the AI sees" preview renders a designed sparse state ("Not much
   history yet — I'm working mostly from your goals"), not a wall of
   "neglected."
4. The beginner archetype in the synthetic seeder (#910) is a first-class
   golden-fixture target for this contract.

---

## Recorded decisions

| Decision | Date / source | Consequence in this spec |
|---|---|---|
| `ExercisePerformanceLog` is **deleted** — its writer functions had zero production callers | 2026-07, discussion #905 (decision 5) | per-exercise-per-session e1RM (Epley) / volume / avgRPE series are computed inside the aggregates job; `goal_progress.trend` derives from that series |
| Chronic (8-week) baseline is **in** — supersedes the M15 "7d + 14d, no 28d" lock | 2026-07, #905 (decision 2); data audit findings 1–2 | `baseline_weekly_sets`, `total_weekly_sets_baseline`, `acute_chronic_ratio`, `detraining_gap`, `low_data` |
| Session-relative "heavy" (top set ≥ 85% of movement-pattern EWMA e1RM, or RPE ≥ 8 when logged); `intensityClass` is cold-start fallback only; weekly intent evaluated over rolling 7d | 2026-07, #905 (decision 3); risk audit Risk 4 | `last_heavy_days_ago` semantics; `satisfied_last_7d` rename |
| Gap-decayed EWMA with timestamped observations; warmups and bodyweight weights excluded | 2026-07, #905 (decision 4); data audit findings 3, 5 | `recent_observations` shape, `estimate_staleness_days`, global rules 2–3, 5 |
| Cold-start contract; beta cohort is the design target | 2026-07, #905 (decision 6); risk audit Risk 5 | `data_maturity`, goal-sentence synthesis, per-field table above |
| Aggregates are shaped for Suggest only; History v2 deferred | 2026-07, #905 (decision 7) | no History-only fields in this contract |

## Testable spec rules

Carried forward from v1 (renumbered where affected) plus v2 additions. These
become unit tests against the synthetic-user fixtures (#910).

1. `per_fau[].last_heavy_days_ago` is `null` if no session-relative-heavy
   session exists for the FAU in the window; the `intensityClass` fallback is
   used only when no movement-pattern EWMA exists (< 3 observations).
2. `per_movement_calibration` only includes movement patterns with ≥ 3
   observations in the last 30d.
3. `weekly_intent_status[].evidence` populated iff `satisfied_last_7d === true`.
4. `weekly_intent_status[].last_satisfied_days_ago` populated iff
   `satisfied_last_7d === false`.
5. For `free_text` intents, neither `evidence` nor `last_satisfied_days_ago`
   is set.
6. `goal_progress[].trend` is `"new"` when `weeks_observed < 2`; otherwise it
   is classified from the e1RM series.
7. `preferences_summary.high_confidence_*` requires Beta variance below
   threshold (TBD: 0.05?).
8. `candidate_exercises[].user_preference_score` is OMITTED (not null) when
   low-confidence.
9. `recent_feedback.swap_rate = total_swaps / total_exercises_suggested` over
   last 30d; `0` when the denominator is `0`.
10. `candidate_exercises` is sent unordered (any consistent order acceptable).
11. `recent_observations` and all EWMA/top-set/e1RM inputs exclude
    `isWarmup: true` sets and bodyweight-exercise weights; all weights are
    normalized to lbs.
12. `per_fau[].status` is omitted (key absent) whenever `low_data === true`.
13. `baseline_weekly_sets` / `total_weekly_sets_baseline` are `null` until
    ≥ 2 qualifying (non-zero) weeks exist; the current partial calendar week
    is excluded from the 8-week window.
14. `detraining_gap` is `null` unless `days_since_any_session ≥ 10` **and**
    the user had ≥ 3 qualifying sessions before the gap.
15. `data_maturity` follows the qualifying-session thresholds exactly
    (3 / 10 / 28-day boundaries).
16. When `UserTrainingProfile.goalSentences` is empty, `goal_sentences` is
    produced by the synthesis template, deterministically, and is never empty.
17. Logged sets from `abandoned` completions count toward FAU volume;
    abandoned sessions appear in `recent_sessions` with `abandoned: true`.
18. `recent_sessions` holds at most 10 sessions, newest first; notes truncated
    to ~120 chars, ≤ 5 per session.
19. Output: `exercises[].name` is required but presence-only (a paraphrased
    name never fails validation when the id is valid).
20. Output: per-option exercise counts fall inside `exerciseCountRange(
    time_budget_minutes)`; `user_preference` ≠ `data_driven` as sets;
    `wild_card` contains ≥ `wildCardNoveltyFloor` exercises absent from both
    other options.

---

## Schema reconciliation — `lib/llm/prompts/suggest-workout/schemas.ts`

Cross-check performed against the module as of this writing. **Fixing the code
is out of scope for this document** — these are the deltas the training-state
builder / prompt issues must land. Note the input schema is a non-strict zod
object (unknown keys are stripped, not rejected), so additive fields *pass*
validation today but are silently dropped from the parsed value and never
rendered — the prompt-design doc's anti-pattern checklist ("new payload fields
must be rendered or explicitly listed as not-rendered") applies to every item
below.

| # | Spec (v2) | `schemas.ts` today | Kind |
|---|---|---|---|
| 1 | `data_maturity` at payload top level | absent from `suggestWorkoutPayloadSchema` | additive |
| 2 | `training_state.sessions_last_7d`, `days_since_any_session`, `total_weekly_sets_baseline`, `acute_chronic_ratio`, `detraining_gap` | absent from `trainingStateSchema` | additive |
| 3 | `per_fau[].baseline_weekly_sets`, `sessions_14d`, `low_data` | absent from `perFauStateSchema` | additive |
| 4 | `per_fau[].status` omitted when `low_data` | `status` is a **required** enum | breaking (must become `.optional()`) |
| 5 | `recent_observations: { weight_lbs, days_ago }[]` | `z.array(z.number())` (bare weights) | **breaking** shape change |
| 6 | `per_movement_calibration[].estimate_staleness_days` | absent | additive |
| 7 | `weekly_intent_status[].satisfied_last_7d` (rolling 7d) | `satisfied_this_week` (calendar week) | **breaking** rename + semantics |
| 8 | `training_state.recent_sessions[]` block | absent | additive |
| 9 | `goal_progress[].trend` classified from e1RM series | shape identical (`recent_top_sets_lbs` retained); producer semantics only | none (doc-level) |
| 10 | Amendment 2: `typical_rpe` nullable | `z.number().nullable()` | ✅ already matches |
| 11 | Amendment 1: output `exercises[].name` | present in `suggestedExerciseSchema` | ✅ already matches |
| 12 | Amendment 3: `exerciseCountRange` bands | identical bands | ✅ already matches |
| 13 | Amendment 4: set-inequality + `wildCardNoveltyFloor` (1 if min ≤ 3 else 2) | identical | ✅ already matches |
| 14 | Header comment cites "locked contract — issue #877 comment" | stale reference | doc-rot (point it here) |

Renderer follow-ups implied by the additive fields (tracked in the builder /
prompt issues, not here): new fields must either get a section renderer or be
explicitly listed as not-rendered with a reason; `data_maturity` drives the
cold-start prompt instruction and option relabeling.

---

## References

- `docs/SUGGEST_PROMPT_DESIGN.md` — prompt rationale; § "Deviations from /
  amendments to the locked #877 contract"
- `docs/data-signal-audit.md` — measurement-pipeline audit behind the v2 fields
- `docs/audits/2026-07-01-suggest-workout-milestone-risk-audit.md` — Risk 4
  (session-relative heavy), Risk 5 (cold start)
- Discussion #905 — M16 locked decisions
- Issue #877 comment (M15, historical) — the superseded v1 contract
- `docs/EVAL_LOOP_DESIGN.md` — eval-gated acceptance for the planner
