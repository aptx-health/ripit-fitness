Report: complete

(Received from implementer by cross-session message, 2026-10-27.)

# 016 scoping note: training insight signals (stall + fatigue)

Request in one sentence: work out what the spec needs for two new read-only MCP tools. One returns per-exercise stall signals; the other returns weekly effort (fatigue) signals. Both return numbers and flags only; the agent writes the coaching words.

Checkout: worktree2 (`feature/agent-insights`). I changed no files. Paths below are relative to the repo root.

Labels:
- FACT: I read it in the code or saw it in the data.
- INFERENCE: I reasoned to it.
- NOT VERIFIED: I could not check it.

## 1. Existing math to reuse

| Code | What it computes | Inputs | Can an MCP tool call it as is? |
|---|---|---|---|
| `lib/stats/exercise-history-derivation.ts:40-42` `isWorkingSet` | A set counts as working if it isn't a warmup and its weight is above 0 (FACT). | one set | Not exported. Same rule as `bestWorkingSet`. |
| `…derivation.ts:49-70` `bestWorkingSet`, `bestSetE1RM` | The highest-e1RM working set in a session, and its e1RM in lbs (FACT). | `{reps, weight, weightUnit, isWarmup}[]` | **Yes.** These are pure functions, and the types match Prisma `LoggedSet` rows (FACT, `:15-25`). |
| `…derivation.ts:73-75` `sessionE1RMs` | One best e1RM per session (FACT). | sessions | **Yes.** |
| `…derivation.ts:106-124` `e1rmTrend` | Up, down or flat, comparing **only the newest and the oldest** session, with a ±1% band (`TREND_EPSILON`, `:31`) (FACT). | sessions, newest first | It can be called, but **not suitable for a verdict**: one bad last session flips it, and a ±1% band is noise-level (INFERENCE). Only the history panel uses it (`components/workout-logging/ExerciseHistoryPanel.tsx:189`, FACT). |
| `lib/learning/math.ts:147-151` `epleyE1RM` | Epley formula, `w × (1 + reps/30)`; at 1 rep it returns the weight (FACT). | lbs, reps | **Yes.** This is the project-wide formula. |
| `lib/stats/exercise-performance.ts:21-26` `normalizeWeightToLbs` | Converts kg to lbs, `× 2.20462`, and treats any other unit as lbs (FACT). | weight, unit | **Yes.** |
| `lib/stats/exercise-performance.ts:5-16` `calculateE1RM`, `getBestE1RM` | A second copy of Epley that ignores units and warmups (FACT). | | **Don't use it.** It duplicates `epleyE1RM`. |
| `lib/queries/exercise-history.ts:130-192` `getRecentExercisePerformances` | The last N `completed` sessions for **one** `exerciseDefinitionId`, with the sets ordered. The client can be injected (FACT). | defId, userId, limit (default 4) | It can be called, but it's one query per exercise. A tool covering every exercise would be N+1 queries (INFERENCE). It doesn't filter `isArchived` and excludes `abandoned` sessions (FACT, `:140`). |
| `lib/aggregates/compute.ts:90-95` `setEffort` | Effort on an RPE scale: `rpe ?? (10 − rir)`, or null (FACT). | one set | **Not exported.** Export it, or reuse the 3-line rule as is. This is the project-wide effort convention (FACT, `compute.ts:8`). |
| `compute.ts:97-99` `effectiveSets` | Sets that aren't warmups (FACT). | session | Not exported. Trivial. |
| `compute.ts:380-417` `collectTopSetsByPattern` | The top e1RM set per **movement pattern** per session over the last 30 days. It skips warmups, bodyweight sets, untagged sets and sets with weight ≤ 0 (FACT). | `ComputeInput` | Not exported, and it groups by pattern (e.g. "squat"), **not** by exercise. That doesn't fit "stalled on preacher curls" (INFERENCE). |
| `compute.ts:490-499` `classifyTrend` → `GoalTrend` (`types.ts:56`) | First vs last e1RM, with a ±2% stall band (`goalTrendStallBand`, `compute.ts:68`). Returns `new` when fewer than 2 distinct weeks are observed (`:69`) (FACT). | series, weeks | Not exported. It's also endpoint-only. **Reuse its 2% band** for consistency (INFERENCE). |
| `compute.ts:556` `computeAggregates`, `lib/aggregates/recompute.ts:42` `computeUserAggregates` | The whole aggregates row: per-muscle volume, acute:chronic ratio, calibration and goal progress. Recompute filters `completed`/`abandoned` sessions with `isArchived: false` (FACT, `recompute.ts:20,52-58`). | user | It can be called, but it's heavy and the output isn't per exercise or per week. It is **the right session filter to copy** (INFERENCE). |
| `lib/learning/weekly-intent.ts:50` `HEAVY_EFFORT_RPE = 8`, `:46` `HEAVY_E1RM_FRACTION = 0.85` | The existing "heavy" cutoffs (FACT). | | Constants to cite. |
| `lib/recommendations/*` | Muscle-group recovery scoring (`fau-score.ts:113`; RPE cutoff 8 at `:53`), anchor staleness (`anchor-staleness.ts:48,102`) and "days since" labels (`staleness.ts:23,35`) (FACT). | | **Not relevant.** They rank what to train, not stall or fatigue. |

Conclusion (INFERENCE):
- Both tools should be new pure modules, e.g. `lib/insights/stall.ts` and `lib/insights/effort.ts`, each with one Prisma fetch.
- They should reuse `bestSetE1RM`, `epleyE1RM`, `normalizeWeightToLbs` and the `setEffort` rule.
- They should copy the aggregates session filter.
- Nothing in the existing code can return these signals as is.

## 2. Data actually present (local dev DB only)

I started the stopped `fitcsv-postgres-wt1` container, ran read-only queries and stopped it again. I did not touch staging or prod.

- **All local data is synthetic or test data** (FACT): 7 users; the `synthetic-*` seed comes from `scripts/seed-synthetic-users.ts`. It can show which fields exist, but **not how often real users fill them** (NOT VERIFIED for real users).
- Totals: 95 completions (91 completed) and 1,215 logged sets (FACT).
- `rpe` is set on 1,048 of 1,215 sets; `rir` is set on 0 (FACT). By user, RPE coverage is 100% for four users, 54% for one and 0% for one (FACT). Real-world coverage is unknown and drives the design: the tool must report coverage.
- `sessionRpe` is set on **0 of 95** completions (FACT). It's an optional post-workout rating from 6 to 10 (`app/api/workouts/completions/[completionId]/effort/route.ts:45-54`, FACT). Expect it to be sparse (INFERENCE).
- Warmups: 121 of 1,215 sets are flagged (FACT); 33 sets have weight 0 (bodyweight, FACT).
- Units: 1,163 lbs and 52 kg. One user mixes both units (FACT). So normalize to lbs (the existing convention).
- Ad-hoc vs program: 69 ad-hoc and 26 program completions. The synthetic users are all ad-hoc (FACT).
- Mapping across sessions:
  - `LoggedSet.exerciseId` points to `Exercise`, which has a required `exerciseDefinitionId`, so the definition is the stable key across sessions for both ad-hoc and program workouts (FACT, schema).
  - Existing queries already key by it (`exercise-history.ts:144,156`, FACT).
  - Oddity: in local data, every logged set points to an `Exercise` row with no `workoutId`, even for the program completions. That's probably a seed artifact (NOT VERIFIED). Keying by definition doesn't care either way.
- Depth: the bodybuilder user has up to 9 sessions per exercise in about 2 months (FACT), which is enough to test a 4-session minimum.

## 3. Proposed tool contracts

Shared rules (INFERENCE unless marked):
- Sessions are the token user's, with `status in (completed, abandoned)` and `isArchived: false`. This is the same filter as the aggregates (`recompute.ts:52-58`).
- A working set is non-warmup with weight > 0 (`derivation.ts:40-42`).
- Weights are in lbs.
- Weeks are **rolling 7-day buckets ending now**, not calendar weeks. This avoids the user's timezone (which isn't stored) and matches `rolling_7d_sets` (`types.ts:26`).

### `get_stall_signals`
Args:
- `exerciseDefinitionId?`: one exercise, or every exercise with enough data.
- `sessions` (default 6, range 4–12): the last N sessions per exercise.
- `minSessions` (default 4, range 3–12).
- `sinceDays` (default 120, max 365).

Returns:
```
{ exercises: [{
    exerciseDefinitionId, name,
    verdict: 'progressing' | 'flat' | 'falling' | 'insufficient_data',
    sessionsAnalyzed, spanDays,
    firstDate, lastDate,
    earlyE1rmLbs, lateE1rmLbs, changePct,   // mean of first 2 vs last 2 sessions
    bestE1rmLbs, sessionsSinceBest,
    repRange: '5-8',                         // flags Epley mixing rep ranges
    series: [{ date, e1rmLbs, weight, unit, reps }]  // oldest → newest
  }],
  thresholds: { flatBandPct: 2, minSessions: 4, minSpanDays: 14, staleBestSessions: 3 } }
```

Verdict rules:
- `insufficient_data` when there are fewer than `minSessions` sessions with a working set, or the sessions span fewer than 14 days. Bodyweight-only exercises are always `insufficient_data`.
- `falling` when `changePct < −2`.
- `flat` when `changePct` is within ±2 **and** `sessionsSinceBest ≥ 3`.
- `progressing` otherwise.
- Sort the list so `falling` comes first, then `flat`.

Why these numbers:
- Averaging two sessions at each end damps a single off day. The endpoint-only `e1rmTrend` doesn't.
- ±2% matches `goalTrendStallBand` (`compute.ts:68`). An Epley e1RM moves about 2–3% for one extra rep at 5 reps, so a smaller band would flag noise.
- Requiring 4 sessions over at least 14 days, plus no new best in the last 3 sessions, stops a "stall" verdict from 2–3 sessions logged in the same week.
- `repRange` and the series let the agent spot a change of rep scheme rather than a real stall. Epley is unreliable above about 12 reps.

### `get_effort_summary`
Args:
- `weeks` (default 4, range 1–12).
- `minRatedSets` (default 10).

Returns:
```
{ weeks: [{                       // index 0 = the last 7 days
    start, end, sessions, workingSets,
    ratedSets, coveragePct,       // sets with rpe or rir
    avgEffortRpe,                 // rpe ?? 10 - rir
    distribution: { le6, rpe7, rpe8, rpe9, rpe10 },
    pctAtOrAbove9,
    exercisesTrained,
    exercisesTopSetAt10,          // count of distinct exercises whose top-effort set was 10
    sessionRpe: { count, avg }    // nullable avg
  }],
  trend: { avgEffortDelta, pctAtOrAbove9Delta, consecutiveHighWeeks },  // latest week vs the mean of the earlier weeks
  flags: ['high_effort_week' | 'rising_effort' | 'low_effort_data'],
  thresholds: { highEffortPct: 50, nearFailureRpe: 9, minRatedSets: 10, minCoveragePct: 50 } }
```

Flags:
- `low_effort_data` when the latest week has fewer than 10 rated sets or coverage below 50%. In that case raise **no** other flag.
- `high_effort_week` when at least 50% of rated sets in the latest week are at effort 9 or more.
- `rising_effort` when `avgEffortDelta ≥ +1.0` against the earlier weeks.

Why these numbers:
- "Heavy" already means RPE 8 or more (`weekly-intent.ts:50`), and normal hard training sits there. A deload question needs near-failure work, so the cutoff is RPE 9.
- "RPE 10 on most exercises" maps directly to `exercisesTopSetAt10 / exercisesTrained`.
- Coverage gating stops a week with only 3 rated sets from producing a verdict.
- Session RPE is reported but never drives a flag, because it's 0% filled locally and capped at 6–10.

Implementation notes (INFERENCE):
- One `findMany` per tool, like `get_workout_history` in `lib/mcp/tools.ts:60`, then group by `exerciseDefinitionId` in memory. This avoids per-exercise `getRecentExercisePerformances` calls.
- Export `setEffort` from `lib/aggregates/compute.ts` rather than copy it.

## 4. Questions for Dustin
1. **Stall by exact exercise or by movement pattern?**
   - The existing goal tracking groups by pattern, so "squat" covers every squat variant (`compute.ts:380`).
   - **Recommend exact exercise** (`exerciseDefinitionId`). The example "stalled on preacher curls" is per exercise, and pattern-level is already in the aggregates.
2. **The stall bar.** "Flat" means within ±2% over at least 4 sessions spanning at least 14 days, with no new best in the last 3 sessions. **Recommend these**: they're conservative, so the agent rarely calls a stall on thin data. Loosen to 3 sessions only if Dustin wants earlier nudges.
3. **When effort isn't logged.** Real RPE and RIR fill rates are unknown, because local data is synthetic. **Recommend** that the fatigue tool returns `low_effort_data` and no verdict when the latest week has fewer than 10 rated sets or under 50% coverage, rather than guessing from volume or session RPE. The agent can then ask the user to log RPE.

## Proposed shape of the work (INFERENCE)
- **Test builder:** one `.feature` covering both tools, with seeded histories for progressing, flat, falling, thin data, a high-effort week and low coverage, plus a kg/lbs mix.
- **Implementer:** the two `lib/insights/*` modules, the tools, and exporting `setEffort`.
- **Reviewer:** check the thresholds against the spec.

No schema change and no UI are expected.
