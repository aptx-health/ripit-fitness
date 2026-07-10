# Suggest Workout Eval Loop

Prompt-refinement loop for the Suggest Workout planner: synthetic scenarios, an
LLM planner run, deterministic gates, an LLM judge, human spot-ratings, and a
refinement engine that turns failures into small prompt diffs. Built so prompt
quality issues surface before they show up in real training, since a handful of
real Suggest runs per week is nowhere near enough signal to iterate against.

## Quick start

```bash
# Score the current prompt against 20 reproducible scenarios
doppler run --config dev_personal -- npm run eval-suggest -- --scenarios 20 --prompt v1 --seed eval-v1

# Rate a sample by hand (no LLM calls, no doppler needed)
npm run rate-suggestions -- --n 8

# Cluster failures and get prompt-diff proposals + ready-to-run variants
doppler run --config dev_personal -- npm run eval-suggest -- --scenarios 20 --prompt v1 --seed eval-v1 --refine

# Re-run a proposed variant against the SAME seed and compare paired scores
doppler run --config dev_personal -- npm run eval-suggest -- --scenarios 20 --prompt v1+<diff-id> --seed eval-v1 --compare <base-run-id>
```

Env: the planner uses `LLM_PROVIDER_URL` / `LLM_API_KEY` / `LLM_MODEL`
(existing client wrapper). The judge defaults to the same model; override with
`LLM_JUDGE_MODEL` (and optionally `LLM_JUDGE_PROVIDER_URL` / `LLM_JUDGE_API_KEY`)
or `--judge-model`.

## Architecture

```
scenario-generator ──► planner (LLM, temp 0) ──► hard-checks (code) ──► judge (LLM)
        │                                                                  │
        │                                    .eval/runs/<runId>/ ◄─────────┤
        │                                                                  │
        └── same seed = same scenarios       report.md / report.json ◄─────┘
                                                       │
                     rate-suggestions (human) ◄────────┤
                     calibration.json ◄── human vs judge agreement
                                                       │
                     refinement-engine ── clusters failures (code),
                                          proposes section diffs (LLM),
                                          writes .eval/variants/*.json
```

Key components:

- `lib/eval/scenario-generator.ts` - stratified archetype × modifier matrix,
  seeded jitter, full #877 payloads synthesized in memory
- `lib/eval/hard-checks.ts` - deterministic gates (IDs, dupes, bans,
  count-vs-time, scenario hard rules)
- `lib/eval/rating-rubric.ts` - anchored 4-point dimensions + weights, shared
  by judge and human CLI
- `lib/eval/judge.ts` - evidence-first LLM judge, K-run stability, median
  aggregation
- `lib/eval/refinement-engine.ts` - code-side failure clustering, LLM diff
  proposals, variant materialization
- `lib/suggest/prompts/registry.ts` - versioned planner prompt as named
  sections; `lib/suggest/schema.ts` - the locked output schema. Both are app
  code: #880 imports the same prompt and schema the eval loop scores.
- `scripts/eval-suggest.ts` / `scripts/rate-suggestions.ts` - the two CLIs
- State lives in `.eval/` (gitignored): runs, ratings.jsonl, calibration.json,
  experimental variants, proposals

Two decisions worth calling out:

**Payloads are synthesized in memory, not seeded through the DB.** The
training-state builder (#876) and seeder (#886) do not exist yet, and even when
they do, going DB → aggregates → payload for every eval scenario would be slow
and would couple prompt iteration to schema state. The generator produces
payloads directly against the locked #877 contract. When #886 lands, its golden
files pin the builder to the same contract from the other side; if the contract
drifts, the golden tests fail, and `lib/eval/types.ts` must be updated in the
same PR.

**Gates and judged scores never blend.** Anything code can verify
(hallucinated exercise IDs, duplicates, banned exercises, exercise count vs
time budget, scenario hard rules) is a deterministic gate, reported as a pass
rate next to the judged composite. A prompt change that raises the composite
while doubling gate failures is a regression; a blended score would hide it.

## Rubric design

Six dimensions, weights encoding product priorities:

| dimension | weight | why it exists |
|---|---|---|
| `state_grounding` | 0.25 | The entire premise of the milestone is that state summaries make a cheap model coach-like. If picks don't track deficits/recency, the feature is a template generator. |
| `constraint_respect` | 0.20 | Ephemeral free text is the user talking to the feature. Misreading "keep legs fresh" once destroys trust faster than any other failure. |
| `safety_recovery` | 0.20 | Injuries, deloads, layoffs. Worst-case harm lives here. |
| `option_identity` | 0.15 | The three-option UX only works if the options are genuinely distinct; scored once across options. |
| `rationale_quality` | 0.10 | Rationales are the trust surface, but a good workout with mediocre prose beats the reverse. |
| `session_coherence` | 0.10 | Ordering/structure. Real, but users can reorder; least costly failure. |

Scale design choices, made for judge stability rather than expressiveness:

- **4 points, not 10.** Cheap judges are noisy on wide scales; forced choice
  between four concretely described levels is much more repeatable.
- **No middle point.** The judge must commit to "acceptable" (3) vs "flawed"
  (2). Score-2-vs-3 is exactly the boundary you iterate prompts on.
- **Anchors describe observable behavior**, not adjectives. "Cites numbers not
  in the payload" is checkable; "poor quality" is vibes.
- **Tie-break rule is in the judge prompt**: when torn, pick the lower level.
  Cheap models otherwise drift optimistic.

### Adding a dimension when you notice a quality gap

1. Add the dimension to `RUBRIC_DIMENSIONS` in `lib/eval/rating-rubric.ts`
   with a unique `flagKey`, four behavior-anchored levels, and a weight;
   rebalance the other weights so they sum to 1.
2. Bump `RUBRIC_VERSION`. Calibration entries record the rubric version, so
   old human/judge agreement stats do not silently carry over.
3. Nothing else changes: the judge prompt, human CLI flags, composite, and
   report all render from the rubric structure.
4. First run after the change: use `--judge-runs 3` and check the stability
   spread; a new dimension with mushy anchors shows up immediately as spread.
5. Ask first whether it should be a gate instead. If code can check it
   (for example "no two exercises with identical primary FAU and movement
   pattern in one option"), put it in `hard-checks.ts` and skip the rubric.

## The five hard parts

### 1. Judge robustness

Mechanisms, in order of impact:

- **Evidence before score.** The judge must quote payload/response facts per
  dimension before emitting the number. This is the single biggest variance
  reducer for cheap models; scoring first and rationalizing after is where they
  drift.
- **Anchored 4-point forced choice** (above).
- **Digest, not raw payload.** The judge sees a compact rendering: per-FAU
  table, calibrations, expectations, the chosen exercises with their catalog
  metadata, plus which candidates were available for each neglected FAU. It
  does not see the 80-150 raw candidate list, which is where a small judge
  gets lost.
- **Scenario expectations injected.** Each scenario carries "things a good
  suggestion must do here" written at generation time. The judge scores
  against scenario intent, with a hard cap (violated expectation → dimension
  ≤ 2), instead of its own taste.
- **Gate results injected.** The judge is told which deterministic checks
  already failed so it doesn't spend evidence re-detecting them.
- **K-run stability.** `--judge-runs 3` runs once at temp 0 and twice at 0.4,
  aggregates by median, and reports the composite spread. Spread > ~0.3 means
  the rubric (not the prompt) needs work. Use K=3 for release decisions, K=1
  for cheap inner-loop iteration.

### 2. Synthetic scenario diversity

Diversity is structural, not sampled. Scenarios come from the product of 5
base archetypes (matching #886: cyclist, bodybuilder, powerlifter, beginner,
inconsistent) × 10 edge-case modifiers (injury-recovery, deload, sparse-data,
competing-goals, activity-overlap, time-crunch, equipment-limited,
return-from-break, all-satisfied, ambiguous-freetext). The matrix is ordered
so all archetypes appear in the first 5 scenarios and every modifier appears
as early as possible; 55 combos before repetition. Seeded RNG only adds
jitter (weights, deficits, ephemeral context) on top of the structure, so no
amount of bad luck produces 20 samey scenarios. `--dry-run` prints the
coverage table without spending tokens.

A deliberate non-goal: LLM-generated scenarios. Free generation regresses to
median gym-goers, and you cannot attach machine-checkable expectations to a
scenario you didn't construct. New edge cases are added as modifiers (a
~20-line function plus expectations), which keeps them reproducible forever.

### 3. Rating-to-diff translation

Three design moves make ratings actionable:

- **Failures cluster in code, not in the LLM.** Grouping by failed gate name
  and by low-median dimension is counting; the refinement LLM only sees the
  top 3 clusters with exemplar evidence (judge quotes, gate details).
- **The prompt is named sections** (`role`, `option_identities`,
  `selection_principles`, `time_budget`, `safety`, `rationale_style`,
  `output_format`). A diff is "replace or append to exactly one section",
  which forces small, targeted changes and makes review trivial.
- **Diffs materialize as runnable variants.** Each accepted diff is applied
  and written to `.eval/variants/<base>+<diff-id>.json` with lineage. The next
  command is mechanical: re-run the same seed with `--prompt v1+<diff-id>
  --compare <base-run>`, read the paired improved/regressed counts. Winners
  get promoted into `registry.ts` by hand, in a commit, with the eval run id
  in the commit message.

Each diff must also state its `risk` (what it could make worse). Check that
dimension in the comparison; single-metric chasing is how prompts rot.

### 4. Overfitting to synthetic data

Detection and prevention, cheapest first:

- **Generality constraint on diffs, enforced.** The refinement engine rejects
  diffs referencing scenario ids and flags archetype-name mentions. Diffs must
  state general principles ("when the user reports soreness in a muscle group,
  exclude heavy work for it"), never test-set facts ("avoid squats for
  cyclists").
- **Seed splits.** Iterate on `--seed eval-v1`; before promoting a variant to
  the registry, run it once on a seed you have never refined against
  (`--seed holdout-1`). Same structure, different jitter. Train score up while
  holdout is flat or down = you tuned to jitter, revert.
- **Modifier breakdown in every report.** Overfitting to synthetic shows up
  as one modifier's score soaring while `(plain)` scenarios stagnate.
- **Real payloads become the canary set.** Once real Suggest runs exist,
  their `Suggestion` rows contain real payloads. Snapshot a handful into a
  frozen canary run and score every candidate variant against it; the eval
  scenarios validate breadth, the canaries validate reality. Until then the
  #886 golden-file payloads serve the same role.
- **Human ratings are the backstop.** You rate real outputs against real
  taste; a prompt drifting toward "scores well on synthetic quirks" shows up
  as human/judge divergence in calibration before it shows up in the gym.

### 5. Human-machine calibration

The human CLI rates on the same 1-4 anchored scale, and optionally flags
problem dimensions with single letters. After every rating session the
calibration recomputes over all ratings to date and appends to
`.eval/calibration.json`:

- **Spearman rank correlation** between human overall and the judge's
  per-option composite. Rank correlation, because you care whether the judge
  orders suggestions the way you do, not whether it matches your absolute
  numbers.
- **Mean absolute difference** on the shared scale (systematic
  leniency/harshness; informative, not decisive).
- **Flag agreement**: when you flag a dimension, how often it is among the
  judge's two lowest for that option. This validates per-dimension diagnosis,
  which is what the refinement engine consumes.

Trust policy:

| Spearman | policy |
|---|---|
| ≥ 0.6 | Trust judge for inner-loop iteration; humans spot-check 5-8 per session |
| 0.4-0.6 | Judge is directional; require human confirmation on any promote/revert decision |
| < 0.4 | Stop iterating on judge scores. Fix the rubric anchors or judge model first, using disagreement cases as the test set |

Recalibrate (a normal rating session does this automatically) whenever the
judge model changes, the rubric version bumps, or roughly every 4th eval
session otherwise. The `mix` picker sends you half judge-suspected-bad and
half random items, so calibration covers both tails without you choosing.
Anti-anchoring: the CLI reveals the judge's score only after you rate, and
prints a marker when you disagree by ≥ 1 point; those items are the highest
value things to leave a note on.

## Failure modes of the loop itself

- **Judge drift / self-preference.** If planner and judge are the same model,
  the judge can prefer its own idiom. Mitigation: `LLM_JUDGE_MODEL` exists
  precisely so the judge can be a different (ideally different-family) model;
  calibration catches residual bias.
- **Reward hacking the rubric.** The planner learns (via your diffs) to name
  payload numbers in rationales without the picks actually following them,
  inflating `rationale_quality` and `state_grounding`. The evidence-first
  judge is instructed to check picks, not prose, but the durable defense is
  human ratings on the `worst`/`mix` picker.
- **Human fatigue.** 8 options ≈ 5-10 minutes. Past that, ratings regress to
  3s and calibration data gets worse, not better. The CLI defaults to 8 and
  skips already-rated items; resist raising it. Better ten honest ratings a
  week than fifty tired ones.
- **Seed lock-in.** Always comparing on `eval-v1` slowly specializes the
  prompt to those 20 payloads even with general diffs. Rotate a fresh seed in
  every few sessions; keep one holdout seed permanently unrefined-against.
- **Nondeterminism at temp 0.** Providers do not guarantee bit-identical
  completions at temperature 0. Scenarios are exactly reproducible; planner
  responses are approximately so. This is why comparisons use paired
  per-scenario deltas with a ±0.1 dead zone and improved/regressed counts
  rather than raw mean deltas.
- **Stale contract.** If #877's payload shape changes without updating
  `lib/eval/types.ts` and the generator, the loop keeps scoring a payload the
  product no longer sends. The shared-schema imports (#880 planner using
  `lib/suggest/schema.ts` + registry) and #886 golden files are the tripwires.

## Cadence

- **Inner loop (an evening):** `eval-suggest --scenarios 20` with K=1 judge →
  read report → `--refine` → re-run best variant with `--compare` → maybe
  promote. Roughly 20 planner + 20-40 judge calls per pass; at
  Haiku/Llama-8B-tier pricing this is cents, not dollars.
- **Rating session (~10 min, 1-2× per week):** `rate-suggestions --n 8` on the
  latest run. Keeps calibration alive and catches judge blind spots.
- **Release decision (before promoting to `CURRENT_PLANNER_VERSION`):**
  20 scenarios on the training seed with `--judge-runs 3`, plus one holdout
  seed run, plus canary/golden payloads once they exist. Human-rate the
  candidate's 5 worst options before promoting.
- **When real data arrives:** add real-payload canaries, and start comparing
  the judge against implicit signals (swap rate on suggested exercises,
  selected option distribution in `Suggestion.selectedOptionId`). If judge
  scores and real swap behavior disagree, believe the swaps.

## What "done tonight" looks like

1. `doppler run --config dev_personal -- npm run eval-suggest -- --scenarios 20 --prompt v1 --seed eval-v1`
2. Read `report.md`: say `constraint_respect` means 2.3 and `ambiguous-freetext` scenarios sit at the bottom.
3. Re-run with `--refine`: get 1-3 section diffs, e.g. an append to `selection_principles` about slang interpretation, saved as `v1+freetext-slang`.
4. `... --prompt v1+freetext-slang --seed eval-v1 --compare <run-1-id>`
5. Read the paired comparison: improved/regressed counts, dimension deltas, gate delta. Promote to `registry.ts` or discard.
