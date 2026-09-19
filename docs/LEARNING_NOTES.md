# Learning-System Design Notes

Design rationale for Ripit's per-user learning layer: the small pile of
interpretable statistics we compute from a user's own logged history and hand to
the Suggest planner. Written after the core shipped, so this records decisions
that are real in the code rather than planned on a whiteboard.

**Audience:** future-me, six months out, with no memory of the milestone. Every
claim cites a module. Where a design is intended but *not yet in shipped code*,
it is called out explicitly with the open issue that will land it — do not read
those sections as describing current behavior.

**What this is not:** the payload contract (`docs/SUGGEST_PAYLOAD_SPEC.md`), the
prompt copy (`docs/SUGGEST_PROMPT_DESIGN.md`), or the eval loop mechanics
(`docs/EVAL_LOOP_DESIGN.md`). Those describe *what* and *how*; this is the *why*.

## Shipped-vs-pending at a glance

| Area | Status | Where |
|---|---|---|
| Gap-decayed EWMA + `estimate_staleness_days` | shipped | `lib/learning/math.ts`, `lib/aggregates/compute.ts` |
| Beta preference math + decay-on-read accessor | shipped (#913) | `lib/learning/math.ts`, `lib/learning/preference-store.ts` |
| Effort normalization (RPE-equivalent) | shipped | `lib/effort-prompt.ts`, `lib/learning/weekly-intent.ts`, `lib/aggregates/compute.ts` |
| Session-relative "heavy" + `intensityClass` cold-start | shipped | `lib/learning/weekly-intent.ts` |
| `data_maturity` levels + cold-start synthesis | shipped (#920) | `lib/aggregates/compute.ts`, `lib/suggest/goal-sentences.ts` |
| Eval loop (scenarios → planner → gates → judge → refine) | shipped | `lib/eval/*`, `docs/EVAL_LOOP_DESIGN.md` |
| Preference **writers** (evidence tiers: selection < edit, swaps weak) | **pending #922** | designed below; no shipped writer |
| Suggest v1 async flow + first eval **release run** | **pending #921** | process below; observations not yet real |

---

## 1. Gap-decayed EWMA over plain EWMA

**Module:** `lib/learning/math.ts` (`gapDecayedEwma`, `effectiveAlpha`),
consumed by `lib/aggregates/compute.ts` (per-movement calibration).

A plain EWMA over logged top sets is *gap-blind*: it weights the most recent
observation by a fixed `alpha` no matter whether it landed the next day or after
a three-week layoff. That produces two failures the calibration is meant to
avoid:

- After a layoff, a plain EWMA stays anchored to pre-layoff loads, so the first
  session back looks like a huge regression against a stale estimate.
- During a dense block, a fixed alpha under-weights the newest data relative to
  how much genuinely-new information it carries.

The fix is to scale the smoothing factor by the *calendar gap* between
consecutive observations:

```
alpha' = 1 - (1 - alpha)^(gapDays / typicalGapDays)
```

`gapDays == typicalGapDays` reproduces the base `alpha` (default `0.3`,
`typicalGapDays` default `7` — weekly). A 3×-typical gap with `alpha 0.3` yields
`alpha' ≈ 0.66`, so a post-layoff observation dominates the estimate instead of
being smoothed into irrelevance. Gaps are clamped to a 1-day minimum so
same-day observations still contribute (`alpha'` of 0 would drop them).

Derivation intuition: plain EWMA is the discrete solution to exponential
forgetting at one observation per step. Substituting `gapDays / typicalGapDays`
for the step count makes forgetting a function of *elapsed calendar time*, which
is the thing we actually care about — memory should fade with days, not with
how often the user happened to log.

### What `estimate_staleness_days` protects against

`gapDecayedEwma` always emits `estimateStalenessDays` = days since the newest
observation. This is deliberately separate from the point estimate. The EWMA
answers "what could they lift"; staleness answers "how much should we trust
that." A user who last squatted 90 days ago still has an EWMA, but downstream
consumers (and the planner, via `estimate_staleness_days` in the calibration
payload — see `toCalibrationPayload` in `lib/suggest/training-state-builder.ts`)
need to decay confidence in it rather than prescribe against a number that
predates a season off. Without a staleness channel, a confident-but-ancient
estimate is indistinguishable from a confident-and-fresh one, which is exactly
the failure that produces "add 5 lbs to your squat" for someone who hasn't
squatted since spring.

Input hygiene is the caller's contract, asserted loudly: warmup sets and
bodyweight-exercise weights are excluded, and weights must be pre-normalized to
lbs (`normalizeWeightToLbs`). `math.ts` is deliberately I/O-free (no Prisma,
fetch, or fs) so it stays unit-testable and reusable from the aggregates job and
the weekly-intent evaluator alike. Origin: `docs/data-signal-audit.md` finding 3
("gap-blind EWMA"), issue #907.

---

## 2. Beta-distribution preference model

**Modules:** `lib/learning/math.ts` (Beta helpers), `lib/learning/preference-store.ts`
(decay-on-read/-write accessor). Shipped as #913.

Each `(user, exercise)` preference is a `Beta(alpha, beta)` posterior over "does
this user want this movement," seeded from a uniform `Beta(1, 1)` prior. Beta is
the conjugate prior for Bernoulli evidence, so an accept/reject update is just
`alpha += accepts; beta += rejects` (`updateBeta`) — cheap, closed-form, and it
carries *uncertainty* natively. A brand-new exercise sits at mean 0.5 with wide
variance; the credible interval (`betaCredibleInterval`, normal approximation)
narrows only as evidence accrues. That lets ranking/eligibility distinguish "we
know they dislike this" from "we have never offered it," which a scalar
like-score cannot.

`sampleBeta` (Marsaglia–Tsang gamma sampler) is present for Thompson sampling
over preferences, but see §7 — it is not wired into any selection path in v1.

### Weekly exponential decay and its half-life

`decayBeta` relaxes evidence toward the prior by `factor^weeks`, default
`WEEKLY_DECAY_FACTOR = 0.985`. Solving `0.985^w = 0.5` gives `w ≈ 45.9 weeks`, a
**~10.5-month half-life**. (The issue framed this as "~9 months"; the shipped
constant works out closer to ten and a half — trust the code.) After the
half-life the influence of a given accept/reject is halved, so an exercise you
hated a year ago stops drowning out what you have gravitated to lately.

The decay is applied to *evidence above the prior*, not to the raw parameters:

```
alpha' = prior.alpha + (alpha - prior.alpha) * factor^weeks
```

A naive `alpha * factor^weeks` would eventually push parameters below 1, which
is a valid Beta but a *bimodal* one (mass piling at 0 and 1) — the opposite of
"less certain." Relaxing toward the prior instead means "old and untouched" maps
to "uninformative," which is what we mean by forgetting.

Decay is applied **on read and on write** in `preference-store.ts`, keyed off
`lastUpdatedAt`:

- `readPreference` decays stored `(alpha, beta)` by the weeks elapsed since
  `lastUpdatedAt`, so a preference untouched for months returns already relaxed —
  no background sweep job needed.
- `updatePreference` decays to "now" *first*, then applies fresh counts, then
  restamps. Folding decay and update into one upsert keeps repeated writes
  composing correctly instead of double-counting or double-decaying.

Clock-skew guard: `elapsedWeeks` clamps negative gaps to 0 so a future
`lastUpdatedAt` never feeds `decayBeta` a negative exponent.

### Evidence tiers and why swaps are weak evidence — DESIGN, pending #922

> **Not shipped.** The preference *reader* is wired into the Suggest payload
> (`decayPreferences` / `buildPreferencesSummary` in `lib/suggest/candidates.ts`,
> called from the training-state builder), but nothing *writes* evidence yet.
> `recent_feedback` is a documented empty block in v1 (decision #3 in
> `training-state-builder.ts`) because no swap-history model exists until #922's
> implicit-feedback hooks have production data. The tiers below are the intended
> design for that issue, recorded here so the rationale isn't lost.

Not all implicit signals are equally trustworthy, so evidence should not be
weighted equally when it lands:

- **Selection < edit.** Choosing one of three offered options is weak positive
  evidence — the option was picked partly because it was *offered*, and partly
  over only two alternatives. A user *editing* a plan (adding, keeping, or
  reordering an exercise they weren't handed) is a stronger, more deliberate
  signal of genuine preference. Editing should move the posterior more per event
  than selection.
- **Swaps are weak (equipment confound).** A swap looks like a clean "reject A,
  accept B," but it is confounded: users swap because the barbell rack was
  taken, because a machine was occupied, because they're traveling — not
  necessarily because they dislike A or prefer B as *movements*. Treating a swap
  as strong accept/reject would teach the model equipment availability, not
  taste. So swaps earn small counts, and #922's "option-context Beta evidence"
  design carries the option context precisely so equipment-driven swaps can be
  discounted.

The through-line: cheap-to-fake signals get small counts, deliberate signals get
larger ones, and the decay half-life above guarantees even a mis-weighted signal
fades within a year.

---

## 3. Effort normalization

**Modules:** `lib/effort-prompt.ts` (session-level), `lib/learning/weekly-intent.ts`
(`normalizedEffort`, set-level), `lib/aggregates/compute.ts` (`setEffort`).

Intensity logging is opt-in (RIR/RPE is not a premium gate; it's disabled for
beginners and auto-enabled for experienced users). Users log in whichever scale
their settings pick, so internally everything is normalized to a single
**RPE-equivalent** number:

```
effort = rpe ?? (10 − rir)
```

RPE 8 ⇔ RIR 2. RPE takes precedence when both are present; `null` when neither is
logged (never invented). This same one-liner appears in three places
independently — `normalizedEffort`, `setEffort`, and the session-effort chip
scale — because each module is I/O-free and the conversion is too small to be
worth a shared import that would drag in dependencies.

**Why store normalized but display per-preference.** Storage picks one scale so
downstream math (heavy detection, `avg_effort_rpe_equiv`, calibration) never
branches on user settings — a single comparable number regardless of how it was
entered. Display goes the other way: a RIR user should see "2 RIR," not "RPE 8,"
because showing someone a scale they didn't choose is a small but constant papercut
of trust. Normalize for the machine; render for the human.

Session-level effort (`WorkoutCompletion.sessionRpe`, `lib/effort-prompt.ts`)
uses one word-label scale for **everyone** — Easy(6)/Moderate(7)/Hard(8)/Very
hard(9)/Maximal(10) — regardless of `defaultIntensityRating`, because RIR ("reps
in reserve") is a per-set concept that doesn't sensibly extend to a whole
session. The word labels are stored as RPE 6–10.

---

## 4. Session-relative "heavy" and the `intensityClass` cold-start fallback

**Module:** `lib/learning/weekly-intent.ts` (`determineMovementHeavy`).

The Suggest milestone originally conflated two different things both called
"heavy":

- `ExerciseDefinition.intensityClass: 'heavy'` — a *static property of the
  movement*, its typical systemic fatigue cost. An empty-bar deadlift is
  `intensityClass: heavy`.
- "the user actually trained heavy this session" — a property of *what they
  did*. A brutal 5×5 on a "moderate"-tagged machine is heavy work; the empty-bar
  deadlift is not.

Confusing them produces confidently-wrong copy on exactly the trust surfaces the
feature exists to build ("you haven't had a heavy leg day this week" to someone
still sore from Tuesday). Fix: define heaviness *relative to the user's own
calibration*.

`determineMovementHeavy` fires heavy when, in order:

1. **Effort** — any working set at peak normalized effort `≥ RPE 8`
   (`HEAVY_EFFORT_RPE`). This is a direct, calibration-free signal: a measured
   RPE 8 means they trained heavy no matter what the numbers say, so it's checked
   first and works even at zero calibration data.
2. **EWMA branch** (`≥ 3` observations, `MIN_EWMA_OBSERVATIONS`) — top working-set
   e1RM `≥ 85%` (`HEAVY_E1RM_FRACTION`) of the movement-pattern EWMA e1RM. This is
   the "relative to their own strength" test.
3. **Cold-start fallback** (`< 3` observations) — fall back to the static
   `intensityClass === 'heavy'` tag. It's a crude prior, but with no calibration
   yet it beats declaring everything non-heavy.

The `reason` field (`'effort' | 'ewma' | 'tag' | 'none'`) is retained so
downstream copy and debugging can tell *which* signal fired — a `tag` verdict is
a cold-start guess, an `ewma` verdict is earned.

e1RM uses Epley (`epleyE1RM`, `weight * (1 + reps/30)`), the project-wide choice,
duplicated in `math.ts` rather than imported to keep the module Prisma-free.
Thresholds are admin-tunable via `TuningConfig` (#937); the constants are the
defaults, and omitting the override argument reproduces them exactly. Origin:
`docs/data-signal-audit.md` finding 5, the Suggest risk audit (Risk 4), issue #908.

One adjacent decision worth remembering: the rolling satisfaction window is a
`daysAgo < 7` *rolling* 7 days, deliberately **not** a Mon–Sun calendar week — a
calendar boundary made every intent read "unsatisfied" on Monday mornings.

---

## 5. `data_maturity` levels and cold-start synthesis

**Modules:** `lib/aggregates/compute.ts` (`computeDataMaturity`),
`lib/suggest/goal-sentences.ts`, `lib/suggest/training-state-builder.ts`.

`data_maturity` is the single dial that tells the planner how much of the payload
to trust. Three levels (`DataMaturity` in `lib/aggregates/types.ts`):

- **`cold_start`** — `< coldStartMinSessions` (3) qualifying sessions. Almost no
  earned signal; the planner leans on stated goals and static tags.
- **`established`** — `≥ establishedMinSessions` (10) sessions **and** a first
  session `≥ maturityMinSpanDays` (28 days) ago. Both count *and* span are
  required: ten sessions crammed into four days is not a training history, it's a
  motivated first week.
- **`partial`** — everything in between.

Deriving one honest maturity label centrally (in the pure aggregates computer,
so the same core serves both the nightly persist job and the request-time dry-run
preview) means every consumer reads from the same assessment instead of each
re-deciding "do we have enough data" with its own threshold.

### Cold-start synthesis approach

The most LLM-legible field is `durable_profile.goal_sentences`, but the free-text
Goal Interview that produces polished sentences is descoped from the beta wave.
So when `UserTrainingProfile.goalSentences` is empty, the training-state builder
**synthesizes** sentences from the structured Goals-Wizard fields via a
deterministic template (`synthesizeGoalSentences`) — **no LLM call**. Two reasons
it's a pure template, not a generation step:

1. **Determinism.** Output is a stable function of profile input, which is what
   lets the cold-start golden snapshots assert verbatim. An LLM in the cold-start
   path would make the payload non-reproducible and couple every snapshot to model
   drift.
2. **It's cold start.** With no history, there's nothing to be clever about; a
   template that faithfully restates the user's stated goals is exactly right, and
   cheaper.

The template keys off the values the *code* actually stores (injury severities
`avoid_loading | caution | recovered`; the four `signupIntent` values from
`app/api/welcome/intent/route.ts`), reconciled against the spec's illustrative
vocabulary in PR #943. Injury bans are the other deterministic cold-start input:
`computeInjuryBanList` (`lib/learning/injury-ban-list.ts`) turns structured
injuries into hard-ban exercise IDs (`avoid_loading`) and soft caution flags
(`caution`), also with no LLM.

---

## 6. Eval-gated promotion in practice

**Modules:** `lib/eval/*` (scenario-generator, hard-checks, rating-rubric, judge,
refinement-engine, report, store), CLIs `scripts/eval-suggest.ts` /
`scripts/rate-suggestions.ts`. Full mechanics: `docs/EVAL_LOOP_DESIGN.md`.

The premise: a handful of real Suggest runs per week is nowhere near enough
signal to iterate a prompt against, so prompt quality is gated on a synthetic
eval loop before it reaches real training. A prompt version is promoted only
after a **release run**:

1. 20 scenarios on the training seed (`--seed eval-v1`) with `--judge-runs 3`
   (K=3: one temp-0 pass + two temp-0.4, aggregated by median; spread > ~0.3
   means the *rubric* needs work, not the prompt).
2. One run on a **holdout seed never refined against** — train score up while
   holdout is flat = you tuned to jitter, revert.
3. Canary/golden real-ish payloads once they exist.
4. Human-rate the candidate's ~5 worst options before promoting.

Two structural commitments make the gate meaningful. **Gates and judged scores
never blend:** anything code can verify (hallucinated exercise IDs, dupes, banned
exercises, count-vs-time-budget) is a deterministic pass rate reported *next to*
the judged composite — a prompt that lifts the composite while doubling gate
failures is a regression a blended score would hide. And **promotion is manual,
in a commit, with the eval run id in the message** — no auto-promotion on a score
threshold.

### First release run and judge-vs-human calibration — NOT YET REAL (pending #921)

> The eval loop *code* is shipped and runnable, but the async Suggest v1 flow it
> gates (#921) has not landed, so **no production release run has happened and no
> real judge-vs-human calibration exists yet.** This section is intentionally
> unpopulated rather than fabricated. When #921 ships and the first release run
> completes, fill in below from the actual artifacts.

To fill in after the first run, from `.eval/` (gitignored) and the run report:

- **Spearman rank correlation** (human overall vs judge composite) and which
  trust band it landed in — the policy is: `≥ 0.6` trust the judge for
  inner-loop iteration; `0.4–0.6` require human confirmation on any
  promote/revert; `< 0.4` stop iterating on judge scores and fix the rubric
  anchors or judge model first.
- **Mean absolute difference** on the shared 1–4 scale (systematic
  leniency/harshness).
- **Flag agreement** — when a human flags a dimension, how often it's among the
  judge's two lowest — which validates the per-dimension diagnosis the
  refinement engine consumes.
- Whether planner and judge shared a model (self-preference risk;
  `LLM_JUDGE_MODEL` exists to make them different-family) and any observed bias.
- Which modifier scenarios sat at the bottom of the report and what diff
  addressed them.

The `.eval/calibration.json` file is the durable home for these numbers; this
doc should summarize the *first* run's story once it's real.

---

## 7. Future ML directions deliberately not taken in v1

The learning layer is intentionally a pile of small, interpretable per-user
statistics feeding a general prompt — not a trained model. Three richer
approaches were considered and declined. Each entry records the signal that
would justify revisiting it, so this is a decision to defer, not to forbid.

### Per-user fine-tuning
Fine-tuning a model per user (or per cohort) on their history.

**Why not v1:** we have single-digit-to-dozens of sessions per user — orders of
magnitude too little to fine-tune without overfitting, and it would make every
suggestion un-debuggable (no `reason` field, no auditable payload). The
interpretable-stats-plus-general-prompt approach gives coach-like output from a
cheap model *because* the state summary does the personalization, transparently.

**Revisit when:** a large cohort of users each has hundreds of sessions **and**
the eval loop shows the general prompt plateauing on `state_grounding` in a way
that's clearly a "can't personalize enough" ceiling rather than a prompt bug.

### Bandit / Thompson-sampling exploration
Actively exploring uncertain exercises to learn preferences faster, e.g. Thompson
sampling over the Beta posteriors.

**Why not v1:** the machinery is *present* but unwired — `sampleBeta` exists in
`math.ts` — and turning it on is premature for two reasons. First, with no
shipped preference *writers* (#922), the posteriors are all still the uniform
prior, so sampling would be indistinguishable from random. Second, exploration
has a UX cost (deliberately offering something the user may dislike) that needs
the trust bank built first. The `wild_card` option in the planner prompt is the
hand-tuned exploration proxy for now: one of three options is "a session the user
wouldn't have picked but a good coach could defend," anchored so it's never pure
noise.

**Revisit when:** #922's writers have accumulated real preference posteriors with
genuine variance, calibration trusts the judge (Spearman ≥ 0.6), and swap-rate on
suggested exercises shows the fixed `wild_card` heuristic leaving preference
signal on the table.

### Cross-user priors (empirical Bayes)
Seeding a new user's per-exercise Beta from a population prior instead of uniform
`Beta(1, 1)` — "most people who state a hypertrophy goal like this movement."

**Why not v1:** no multi-tenancy in the data model and a small user base mean the
population estimate would be dominated by a handful of early users, and it quietly
reintroduces a form of cross-user data flow the single-user-per-account model was
chosen to avoid. Uniform priors are honest about "we don't know you yet," which
the `data_maturity: cold_start` path already handles explicitly.

**Revisit when:** the user base is large and diverse enough that a per-goal /
per-archetype prior would beat uniform on cold-start eval scenarios, **and**
there's a clean aggregate-only path to compute it (no raw per-user data leaving
its owner). The archetype definitions already used by the eval
scenario-generator and the synthetic seeder are the natural grouping key.

---

## Module index

| Concern | Module |
|---|---|
| Gap-decayed EWMA, Beta helpers, Epley e1RM | `lib/learning/math.ts` |
| Preference persistence (decay-on-read/-write) | `lib/learning/preference-store.ts` |
| Session-relative "heavy", weekly-intent eval | `lib/learning/weekly-intent.ts` |
| Injury → ban-list mapping | `lib/learning/injury-ban-list.ts` |
| FAU importance presets | `lib/learning/ratio-presets.ts` |
| Session effort chips (RPE-equivalent) | `lib/effort-prompt.ts` |
| Aggregates (calibration, `data_maturity`, per-FAU) | `lib/aggregates/compute.ts`, `lib/aggregates/recompute.ts` |
| Payload assembly + cold-start decisions | `lib/suggest/training-state-builder.ts` |
| Cold-start goal-sentence synthesis | `lib/suggest/goal-sentences.ts` |
| Eval loop | `lib/eval/*`, `docs/EVAL_LOOP_DESIGN.md` |

### Related issues

- #907 — gap-decayed EWMA (shipped)
- #908 — session-relative heavy / weekly intent (shipped)
- #913 — `UserExercisePreference` table + decayed-Beta accessor (shipped)
- #918 — injury ban-list (shipped)
- #920 — training-state builder / `data_maturity` (shipped)
- #937 — admin-tunable thresholds (shipped)
- #922 — implicit-feedback writers / evidence tiers (**open**)
- #921 — Suggest v1 async flow + first eval release run (**open**)
