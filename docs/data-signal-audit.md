# Data & Signal Audit — Suggest Workout (LLM-powered)

Audit of the measurement pipeline feeding the LLM planner, focused on signal quality
for a single user across a year of fluctuating cadence, energy, and goals.

**Sources reconciled** (issue numbers in the task brief were shuffled; verified against live titles):

- Locked payload spec: comment on **#877** (not #876)
- History v2 locked design: comment on **#886** (not #885)
- Training-state builder: #876 (body currently holds the Interview text — see "housekeeping" at the end)
- FAU cleanup: #878 · Aggregates: #887 · Weekly intent: #884 · Profile expansion: #897
- Code: `lib/muscle-balance.ts`, `lib/fau-volume.ts`, `lib/exercises/auto-tag.ts`,
  `lib/stats/exercise-performance.ts`, `lib/stats/workout-rollup.ts`, `prisma/schema.prisma` (all read at `origin/dev`)

---

## Executive summary — the 5 gaps that will most limit LLM quality over a year

1. **`deficit_share` measures composition, not volume.** Shares are zero-sum: total
   training volume cancels out of the math entirely. A taper week (2 upper sessions
   instead of 5 mixed) makes legs look "neglected" when you were deliberately resting;
   a genuine 3-week slide into under-training everything looks "balanced." This is the
   root of your anchoring concern, and **#878 does not fix it** — it changes the panel's
   window primitive, but the payload path already uses rolling days, and the distortion
   survives any window choice. The fix is a second, absolute axis: per-FAU volume vs. a
   personal chronic baseline. Notably, the History v2 spec and the #879 preview both
   already promise "18 sets **above baseline**" — and no baseline is defined anywhere
   in code or spec.

2. **No chronic time-scale exists.** The locked decision "7d + 14d, no 28d" removes the
   one window a coach actually needs for deloads, detraining, stalls, and
   acute:chronic load ratios. It's also self-inconsistent: History v2 (#886) requires
   8-week weekly series for its sparklines, so the aggregates job (#887) must compute
   multi-week data anyway. Excluding it from the payload is an artificial gap, not a
   cost saving.

3. **Strength calibration is event-indexed and gap-blind.** `recent_observations:
   [185, 190, 190, 195, 195]` carries no timestamps; the EWMA doesn't decay across
   layoffs. After a 3-week trip the payload still says "current estimate 195" and the
   LLM will suggest heavy at pre-break loads — exactly the moment a coach would ramp.
   Two data-hygiene bugs compound it: bodyweight sets log `weight: 0` (poisoning
   vertical_pull/lunge EWMAs), and per-set `weightUnit` mixing isn't addressed in the
   spec (the normalizer exists — in dead code, see #4).

4. **A whole layer of already-captured signal never reaches the LLM — and one table is
   dead.** `ExercisePerformanceLog` (per-session e1RM, volume, avgRPE — exactly what
   `goal_progress` needs) has writer functions with **zero production callers**; only
   tests invoke `recordStrengthPerformance`. Session duration is computed for the
   rollup UI and discarded. `Exercise.notes` ("shoulder tweaked on set 3") is written
   during logging and never surfaced. Abandoned sessions' logged sets are filtered out
   of every aggregate. Ephemeral context ("legs sore") is persisted to the Suggestion
   row and then forgotten by the next request 48 hours later.

5. **"Heavy" is a static property of the exercise, not the session.** `intensityClass`
   is an LLM-assigned per-exercise tag ("typical fatigue cost"). `last_heavy_days_ago`
   and the weekly-intent rule "heavy leg day" both key off it. Three sets of empty-bar
   technique squats satisfy "1 heavy leg day/week"; a brutal set of weighted lunges
   tagged `moderate` doesn't. Over a year, the payload's weekly-intent status — its
   most directive field — becomes noise. Heaviness must be load-relative-to-capability
   (top set vs. movement-pattern EWMA), with the tag as cold-start fallback only.

---

## Detailed findings

### 1. Measurement-primitive gaps

**"Last N workouts" (panel).** `lib/muscle-balance.ts:4` —
`DEFAULT_LOOKBACK_WORKOUTS = 8`, applied via `take: settings.lookbackWorkouts` on
completions ordered by `completedAt`. Your diagnosis is correct and #878's days/weeks
modes are the right panel fix. But note the payload path (#877 spec) never had this
problem — it specifies rolling 7d/14d. The shared failure mode is the next item.

**Share-of-total as the deficit primitive.** `calculateMuscleBalanceSnapshot`
(`lib/muscle-balance.ts:242-269`) computes `actualShare = actualSets / totalEffectiveSets`
and `deficitShare = targetShare − actualShare`; the payload spec copies this shape
(`actual_14d_share`, `deficit_share`, `status`). Concrete scenario: you bike hard all
weekend, lift twice (both upper) that week. Legs: `actual_share ≈ 0`,
`deficit_share ≈ +0.30`, `status: neglected`. The LLM's Data Driven option prescribes a
heavy leg day — onto legs you thrashed on the bike. Meanwhile the genuinely dangerous
case (everything down 60% for three weeks) produces near-zero deficits across the
board and reads "balanced."

**Sets as the only volume unit.** A set of 3 @ RPE 9 and a set of 20 @ RPE 5 count
identically. Sets-per-muscle is a defensible primary (it's the hypertrophy-literature
standard), but with `rpe`/`rir` already on `LoggedSet`, "hard sets" (exclude RIR ≥ 4
when logged) is a cheap refinement once intensity logging is on. Low priority; noted
for completeness.

**Fix (P0):** add to #887's `perFau`: `baseline_weekly_sets` (trailing 8-week median of
weekly set counts, excluding zero-logging weeks), plus a top-level
`total_weekly_sets_baseline` and `acute_chronic_ratio` (7d sets ÷ mean weekly sets over
trailing 28d). Payload gains one number per FAU and one global ratio; the LLM can then
distinguish "shifted composition" from "reduced volume." This also finally defines the
"above baseline" figure History v2 already promises.

### 2. Aggregation-window mismatches

**7d window vs. training frequency.** At 3 sessions/week, a 7d window contains ~3
samples; `rolling_7d_sets` per FAU swings 0 → 12 → 0 depending on which side of
midnight a session lands. The 14d window is the more stable one, but `status` labels
derive from the share math above with a ±0.02 threshold (`lib/muscle-balance.ts:251-256`) —
authoritative-looking labels on top of noisy small-denominator ratios. An LLM given
`"status": "neglected"` treats it as ground truth.

**Mon–Sun calendar boundary for weekly intent.** `evaluateWeeklyIntent` (#884)
answers "satisfied *this week*." On Monday morning, every intent reads unsatisfied —
the LLM will try to satisfy "1 heavy leg day" every single Monday even if you did one
Sunday. `last_satisfied_days_ago` exists but the spec populates it only when
unsatisfied, and "8 days ago" vs "1 day ago (yesterday, previous calendar week)" demand
opposite responses. Rolling-7d satisfaction ("satisfied in the last 7 days") is the
correct primitive; keep the calendar field if the UI wants it.

**Fix (P0/P1):** suppress or qualify `status` when data is thin — add `sessions_14d`
and `low_data: true` to `per_fau` entries when the 14d window holds < 3 sessions or
< ~20 total effective sets; switch weekly-intent evaluation (or add a parallel field)
to rolling-7d.

### 3. Missing signals we should be capturing

- **Session duration — free, already derivable.** `WorkoutCompletion.startedAt` is set
  on draft creation (`app/api/workouts/[workoutId]/draft/sets/route.ts:81`), and
  `lib/stats/workout-rollup.ts` computes `durationSeconds` for the rollup screen — then
  discards it. Over a year this calibrates the time budget: if you request 45-minute
  suggestions but median session runs 70, the LLM should pick 4 exercises, not 6. Zero
  new capture; just persist/aggregate what exists.
- **Session-level RPE (1-tap, optional).** The design decision rejected an "always-on
  post-workout RPE prompt" — right call for mandatory friction. But the rollup screen
  already exists as a natural end-of-session surface, and `UserSettings` already has
  post-session prompt throttling (`postSessionPromptCount`, `lastPostSessionPromptAt`).
  One optional row of chips on the rollup ("How'd that feel? 😴 / fine / 🔥", skippable,
  never blocks dismissal) yields the single best fatigue signal a coach gets. Store on
  `WorkoutCompletion.sessionRpe Int?`.
- **Body-weight over time.** #897 adds `weightKg` as a scalar — mutable, no history. A
  year of cutting/bulking changes what every relative-strength number means, and
  bodyweight-exercise capability (pull-ups) is uninterpretable without it. Cheapest fix:
  make weight updates append-only (tiny `BodyWeightEntry(userId, weightKg, recordedAt)`
  table written whenever the profile weight is edited). No prompts, no nagging — just
  don't destroy history when the user updates the number.
- **Rest-day density / streaks.** Derivable from `completedAt` alone: `sessions_last_7d`,
  `consecutive_training_days`, `days_since_any_session`. The payload has per-FAU
  recency but no whole-body freshness. Trivial to add in #887.

### 4. Signals we're capturing but discarding

This is the richest category — the data already exists.

- **`ExercisePerformanceLog` is a dead table.** `recordStrengthPerformance` /
  `recordCardioPerformance` (`lib/stats/exercise-performance.ts:114,157`) are called by
  nothing except `__tests__/api/warmup-flag.test.ts`. Yet this table is precisely the
  per-exercise-per-session e1RM/volume/avgRPE series that `goal_progress` trends and
  History v2 charts need — including the unit normalization (`normalizeWeightToLbs`)
  the payload spec silently assumes. Decide: wire it into the completion flow with a
  backfill script, or delete it and compute equivalents inside #887's job. Leaving it
  half-alive guarantees someone later "finds" it and trusts a table with 3 rows in it.
- **Exercise notes.** `Exercise.notes` is written during logging
  (`add-during-logging/route.ts:161`) — "left shoulder clicking," "gym crowded, subbed
  DBs." A human coach reviewing your history would read these first. The payload spec
  has no notes field at all. Include the last 14d of non-empty notes as
  `recent_notes: [{days_ago, exercise, text}]` (cap ~10, truncate each to ~120 chars).
  (`WorkoutCompletion.notes` exists in schema but nothing writes it — no session-notes
  UI. The per-exercise notes are the live signal.)
- **Abandoned/skipped sessions.** Every aggregate filters `status: 'completed'`
  (`lib/muscle-balance.ts:184`). An abandoned session with 12 logged sets contributes
  zero FAU volume — undercounting actual work — and the abandonment event itself
  (ran out of time? gassed?) vanishes. Count logged sets from `abandoned` completions
  in volume; add `sessions_abandoned_14d` to the payload.
- **Ephemeral-context amnesia.** "Deprioritize legs — sore" typed Monday is locked into
  `Suggestion.requestPayload` and never seen again. Soreness is recovery-relevant for
  ~72h. The builder should read the user's own recent Suggestion rows and emit
  `recent_user_signals: [{days_ago, text}]` for the last 7d of deprioritize/prioritize
  free text. The user already told the app; the app chooses to forget.
- **Post-session feedback.** `Feedback` rows with `category: 'post_session'` carry a
  1–5 rating + refinement chips. Low volume, but "rated 2/5 after the last suggested
  workout" is worth a line in `recent_feedback`.

### 5. Signals reaching the LLM in a form it will misinterpret

- **Timestamp-less observation arrays.** `recent_observations: [185, 190, 190, 195, 195]`
  and `recent_top_sets_lbs` are indistinguishable between "5 sessions in 12 days"
  (progressing fast) and "5 sessions across 3 months" (barely training). Ship
  `{weight, days_ago}` pairs, or at minimum add `observation_span_days`.
- **Gap-blind EWMA.** Per-session `estimate = α·obs + (1−α)·prev` never decays in
  calendar time. Post-layoff, the estimate is stale-high precisely when overshooting is
  most costly. Fix in `lib/learning/ewma.ts` (#873, not yet built — cheap to fix now):
  decay toward uncertainty with elapsed time, e.g. effective
  `α' = 1 − (1−α)^(days_gap/typical_gap_days)`, and emit `estimate_staleness_days`.
- **Bodyweight zeros.** Pull-ups logged at `weight: 0` drag the vertical_pull EWMA to
  the floor; a +25 lb weighted set then looks like a 25 lb capability. Exclude
  bodyweight-equipment exercises from weight EWMAs (or model added-weight explicitly);
  the rollup already computes an `isBodyweight` flag you can reuse.
- **Warmups in calibration.** The payload spec never says `recent_observations` excludes
  `isWarmup` sets. The panel excludes them; the spec must too, explicitly — spec rule
  11 material for #886/#877's testable-rules lists.
- **Pre-chewed `status` labels under low data** — covered in finding 2; the fix is the
  `low_data` qualifier, because a cheap model will echo whatever label it's handed.
- **Top-weight-only goal trends.** `goal_progress` tracks `recent_top_sets_lbs`.
  190×5 → 190×8 is real progress that reads as "stalled." Use e1RM (Epley is already
  implemented in `lib/stats/exercise-performance.ts:7`) as the trend series.

### 6. Rare-event blindness

None of these states are detectable in the current payload:

- **Return from layoff.** `days_since_any_session ≥ 10` → payload flag
  `detraining_gap: {days: N}` + prompt guidance to ramp (~85–90% of prior loads, reduced
  volume). Currently the LLM sees stale-high EWMAs and universally "neglected" FAUs —
  the worst possible combination: it will prescribe *more, heavier*.
- **Deload (deliberate or de facto).** `acute_chronic_ratio < ~0.6` for 1–2 weeks. With
  the chronic baseline from finding 1, this is one comparison. Without it, undetectable.
- **Volume spike.** `acute_chronic_ratio > ~1.5` — the classic overreach precursor. Same
  single comparison.
- **Injury flare.** #897's `injuryAreas` has severities (`past`/`mindful`/`active`) but
  no dates and no link to behavior. Cheap proxy once notes flow (finding 4): recent
  exercise notes mentioning pain + a banned-list edit in the last 14d ⇒ include
  `recent_injury_signal: true`. Don't over-build; the notes text itself in the payload
  gets most of the value.
- **Program restart / new program.** `cycleNumber` and program switches exist in the
  data; a `new_program_started_days_ago` field would stop the LLM from reading
  transition turbulence as neglect. Lowest priority of this set.

### 7. Time-scale gaps

Current: rolling 7d/14d (FAU), per-session EWMA (movement), Mon–Sun week (intent).

| Missing scale | What it carries | Cost |
|---|---|---|
| ~48h acute | freshness: `hours_since_last_session`, per-FAU `sets_last_48h` — "trained legs yesterday" vs "3 days ago" changes today's pick | trivial, data exists |
| 28d chronic | baseline, ACR, deload/spike detection (findings 1, 6) | one more window in #887's job |
| 8-week weekly series | trend slopes; **already required** by #886 sparklines | zero marginal — reuse |
| multi-month | PR history, injury recurrence ("shoulder complaints recur when overhead volume exceeds X") | defer; keep raw data, don't build yet |

The 7d/14d choice wasn't wrong — it's incomplete. Everything above slots into
`UserTrainingAggregates` without touching request-time latency, which was the original
rationale for keeping the payload lean.

### 8. Goal-drift blindness

`goalSentences` are free text written once at onboarding; nothing compares stated
intent to observed behavior. Concrete drifts a year will produce: "improve bench" while
horizontal_push goes untouched for 6 weeks (you got bored of benching); cycling
importance 5 in `otherActivities` with no rides mentioned anywhere since March;
`targetSessionsPerWeek: 4` against a trailing-8-week actual of 2.1.

All three are computable from data the aggregates job already touches:

- `profile_age_days` (from `UserTrainingProfile.updatedAt`) — one field in the payload.
- Per-goal `last_relevant_activity_days_ago` — `goal_progress` already maps goals to
  movement patterns; add the recency number.
- `target_vs_actual_sessions_per_week` once #897 lands.

Give the LLM these plus one prompt line — "if stated goals and recent behavior have
clearly diverged, add a gentle note in `warnings`" — and the existing `warnings[]`
channel becomes the goal-refresh nudge for free. No new UI, no scheduled jobs.

### 9. Recovery-context poverty

The awkward truth: the schema has full cardio support (`LoggedCardioSession` with
duration, HR, distance, elevation, intensity zone) **and there is no live UI or API
route that writes it** — the cardio feature's docs are in `docs/archive/`. So today the
app cannot know about the 60-mile ride even if you wanted to tell it, except as
ephemeral free text it forgets per finding 4.

Layered fix, cheapest first:

1. **Stop forgetting what the user already says** — `recent_user_signals` (finding 4).
   "Biked hard yesterday" typed into one suggestion informs the next three days.
2. **1-tap activity quick-log.** Not a cardio-tracking revival: a single row of chips on
   the home/workouts surface — `[Biked] [Ran] [Hiked] [Other]` × `[easy] [hard]`,
   optional duration. Writes a minimal `LoggedCardioSession` (schema already there).
   Payload gains `other_activity_7d: [{days_ago, activity, intensity, duration_min?}]`.
   Two taps, no nag, and it's exactly the signal a coach asks about first: "what else
   did you do this week?"
3. **Later, not now:** Strava/HealthKit import. The quick-log proves whether the signal
   changes suggestions before any integration work.

Session RPE (finding 3) is the other half of recovery context — how hard lifting itself
has been landing — and shares the same 1-tap constraint.

---

## Proposed issues

Modifications to existing issues are preferred where the issue hasn't landed yet — most
of this milestone is still open, so spec changes are cheap this week and expensive next
month.

1. **Modify #887 + payload spec (#877 comment): chronic baseline, ACR, and low-data
   qualifiers.** Add to `perFau`: `baseline_weekly_sets` (trailing 8-week median, zero
   weeks excluded), `sessions_14d`, `low_data`. Add top-level: `acute_chronic_ratio`,
   `total_weekly_sets_baseline`, `sessions_last_7d`, `days_since_any_session`,
   `detraining_gap`. Defines the "above baseline" number History v2 (#886) already
   references. Supersedes the "No 28d" locked decision — the aggregates job pays the
   cost once, off the request path. *Size: autopilot once spec comment is amended.
   Priority: **P0** — this is the fix for the taper/neglect confusion.*

2. **Modify #873 + payload spec: time-aware movement calibration.** Timestamped
   observations (`{weight, days_ago}` or `observation_span_days`), gap-decayed EWMA,
   explicit warmup exclusion, bodyweight-exercise exclusion from weight EWMAs, unit
   normalization via `normalizeWeightToLbs`. #873 hasn't been built — fix the spec
   before the code exists. *Size: autopilot. Priority: **P0**.*

3. **Modify #884 + payload spec: session-relative "heavy" + rolling-7d intent
   satisfaction.** Heavy = top working set ≥ 85% of movement-pattern EWMA e1RM (or
   RPE ≥ 8 when logged); `intensityClass` tag is cold-start fallback only. Evaluate
   `heavy_session` intents over rolling 7d (or add `satisfied_last_7d` alongside the
   calendar field). *Size: autopilot. Priority: **P1**.*

4. **New: resolve `ExercisePerformanceLog` — wire it up or delete it.** Either call
   `recordStrengthPerformance` from the completion endpoints + one-time backfill script,
   or drop the table and fold e1RM series into #887's compute. Blocking-adjacent for
   `goal_progress` trends and #886 charts. *Size: autopilot. Priority: **P1**.*

5. **New: `recent_sessions` block in the payload** (modify #876 builder scope + #877
   spec). Last ~10 sessions: `{days_ago, duration_min, total_sets, abandoned,
   session_rpe?, notes: [...]}` — folds in session duration (derivable today),
   abandoned-session sets (also count them in FAU volume), and per-exercise notes.
   One block closes four discard paths. *Size: autopilot. Priority: **P1**.*

6. **New: 1-tap activity quick-log + `other_activity_7d` payload field.** Chip row
   writing minimal `LoggedCardioSession` rows; builder reads last 7d. Include
   `recent_user_signals` (last 7d of prior ephemeral free text from Suggestion rows) in
   the same issue — both are "recovery context the LLM currently never sees."
   *Size: interactive (small UI design decision), then autopilot. Priority: **P1**.*

7. **Modify #871 before PR #890 merges: preference decay.** Weekly exponential decay on
   Beta counts (e.g., ×0.985/week at recompute, ≈half-life 9 months) so injury-era
   dislikes fade; document that swaps encode context (equipment busy) as well as
   preference, hence bounded weight. Cheap now, migration later. *Size: autopilot.
   Priority: **P2**.*

8. **New: profile-freshness fields + goal-drift warning** (payload: `profile_age_days`,
   per-goal `last_relevant_activity_days_ago`, `target_vs_actual_sessions_per_week`;
   one planner-prompt line routing divergence into `warnings[]`). Depends on #897.
   *Size: autopilot. Priority: **P2**.*

9. **New (smallest, optional): 1-tap session RPE on the rollup screen.** Skippable chip
   row, throttled via existing `postSessionPromptCount` machinery; stores
   `WorkoutCompletion.sessionRpe`. Honors the "no always-on RPE prompt" decision by
   being one optional tap on a screen the user already sees. *Size: autopilot.
   Priority: **P3** — nice signal, weakest cost/benefit of this list.*

### Housekeeping (not a signal issue, but found during the audit)

Issue **#876**'s body currently contains the Goal-Interview text (its title says
"Training-state builder") — another casualty of the number shuffle. Worth fixing before
an autopilot agent implements the wrong feature against it. Same class of check for
#871 (title says UserExercisePreference; body describes the Suggestion table) and #873
(title says EWMA/Beta helpers; body describes the auto-tagger).
