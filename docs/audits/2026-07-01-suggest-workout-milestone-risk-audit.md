# Suggest Workout (LLM-powered) — Milestone Risk Audit

**Date:** 2026-07-01
**Sources read:** Discussion #868 (canonical block + historical body), locked payload spec (comment on #877), locked History v2 design (comment on #886), locked three-option/async Suggest spec (body of #879 + preview comment), locked Suggestion schema (comment on #869), all 23 milestone issue bodies, `milestones/suggest-workout.md` dependency graph, draft PRs #890/#898/#899, closed PR #888, and shipped code (`lib/llm/client.ts`, `lib/llm/clean-output.ts`, `lib/user-training-profile.ts`, `lib/exercises/auto-tag.ts`, `lib/muscle-balance.ts`, `cloud-functions/clone-program/`, `prisma/schema.prisma`).

A note on numbering: this document uses **title numbering** (what `gh issue view N --json title` returns) throughout, and calls out explicitly when a locked artifact physically lives at a shuffled number.

---

## Section 1: Top 5 Risks

### Risk 1 — The issue-number shuffle is not historical. It is live, and it is generating duplicate and wrong work right now.

The postmortem in Discussion #868 treats the shuffle as a closed incident with process rules going forward. It isn't closed. Four issue **bodies** currently carry specs for the wrong scope: #871 (titled "UserExercisePreference") carries the Suggestion-table spec, #873 (titled "Learning helpers: EWMA + Beta") carries the exercise-tagger spec, #876 (titled "Training-state builder") carries the Goal Interview spec, and #879 (titled "Equipment checklist UI") carries the **newest locked Suggest Workout v1 spec** — the three-option UX and async architecture — while #880 (titled "Suggest Workout v1") still carries the obsolete single-workout synchronous spec. The locked payload spec lives as a comment on #877 (titled "Implicit feedback hooks"); the locked History v2 design lives as a comment on #886 (titled "Synthetic user seeder"). Concrete damage already shipped: draft PR #890 (`agent/issue-871`, "Closes #871") implements the Suggestion table from #871's stale body, while draft PR #899 (`agent/issue-869`) implements the same table from #869's locked comment — two open drafts, same table, **different schemas** (#890 uses a Postgres enum and a unique 1:1 FK; #899 uses String status and a plural relation). Both add `lib/suggest/types.ts` and a migration. Meanwhile the actual Beta-preference storage — #871's real scope, a prerequisite of #877 — has zero lines of code despite showing "in-progress" in `msv status`.

**Why you probably haven't noticed:** the postmortem produced closure — you wrote rules, declared `msv` canonical, and moved on. But the rules only guard *your writes* ("verify title before writing to an issue"); they don't guard *agent reads*. Autopilot agents receive an issue number and read the body — the body is exactly the thing that's wrong. `msv doctor` flags PR↔issue mismatch (it caught #888) but has no check for body↔title coherence. And the shuffled map is still your own working memory: the brief for this audit told me the payload spec was "a comment on issue #876" and History v2 was "a comment on #885" — both are shuffled locations. Every future issue comment, agent dispatch, and design reference you write from memory has a meaningful chance of pointing at the wrong issue.

**What to do:** a one-time reconciliation pass, this week, before any further agent dispatch. (1) Merge #899, close #890 with a comment explaining why, and rewrite #871's body with the real Beta-storage spec. (2) Move the interview spec from #876's body to #875 and write the actual training-state-builder spec into #876 (it currently has none — the builder, a critical-path issue, has no spec on its own issue). (3) Move the three-option Suggest spec from #879's body to #880 and restore the equipment-checklist spec on #879. (4) Repost or cross-link the locked payload spec onto #876 and the History design onto #885, or at minimum edit each issue body to point at the true location. (5) Fix the "Locked payload spec: #877 (comment)" references in #884/#886/#887. This is a half day and it removes the single largest ongoing failure generator in the milestone.

### Risk 2 — The locked aggregates schema (#887) cannot power the locked History v2 design (#885). Two locked documents contradict each other.

History v2's locked design (comment on #886) requires, per FAU card: a **weekly volume sparkline over the last 8 weeks**. Per exercise drill-down row: **last-session working set line, top-set sparkline over the last 8 sessions, estimated 1RM with trend arrow, days since last performed, PR badges over a 90-day window, and exercises ranked by volume contribution**. The `UserTrainingAggregates` schema locked in #887 contains none of this: `perFau` holds four scalars (`rolling_7d_sets`, `rolling_14d_sets`, `last_session_days_ago`, `last_heavy_days_ago`) — no time series at all — and there is **no per-exercise section whatsoever** (aggregates are keyed by FAU and movement pattern only). Yet #885's acceptance criteria include "Implementation reads only from aggregates (no raw set queries)." As written, that acceptance criterion is unsatisfiable. One of three things happens: the aggregates schema roughly doubles (per-exercise blobs for every exercise a user has touched, plus 8-week series per FAU — with consequences for the <2s recompute target and row size), or History quietly queries raw sets (destroying the "one aggregation layer, two consumers" rationale that made History a prerequisite of Suggest in the first place), or History ships gutted.

**Why you probably haven't noticed:** the two documents were locked a day apart (payload spec 06-29, History design 06-30), each in a design session focused on its own consumer, each internally consistent, and — per Risk 1 — they live as comments on two *unrelated-looking* issues (#877 and #886). Nothing in the workflow forced a cross-check, and the shared phrase "reads from UserTrainingAggregates" creates the illusion of alignment without field-level verification.

**What to do:** before writing any of #887, spend one design pass reconciling the two contracts. My recommendation: add a `perExercise` section to the aggregates (keyed by exerciseDefinitionId, limited to exercises performed in the last 90 days — bounded, typically 15–40 entries), add `weekly_sets_8w: number[]` to each `perFau` entry, and add per-exercise `recent_top_sets` (already needed by `goal_progress` in the payload anyway). Then re-verify the <2s recompute budget against the `inconsistent` and `bodybuilder` synthetic archetypes. This is a schema-shape decision, not an implementation detail — getting it wrong means a JSON-blob migration after both consumers ship.

### Risk 3 — The entire async architecture routes through a worker container that cannot see `lib/`, and nothing in the milestone owns solving that.

The colocation plan ("Option A" in #883, assumed by #873's lazy-tag queue and #887's recompute queue) puts three new BullMQ consumers in the existing `clone-program` container. That container is a **standalone npm package**: its own `package.json` (deps: prisma client, bullmq, cuid2 — no zod, no openai), its own `tsconfig`, its own Dockerfile whose build context is `cloud-functions/clone-program/`, and — critically — its **own copy of `prisma/schema.prisma`**. The suggest-workout worker needs `lib/llm/client.ts`, `lib/llm/clean-output.ts`, the payload builder (#876), the weekly-intent evaluator (#884), and the EWMA math (#873). The aggregates worker needs `lib/aggregates/compute.ts`. None of that is importable from the container today. Your options are: duplicate the code into the worker (guaranteed drift — the exact disease the aggregates table was invented to cure), or restructure the Docker build to use the repo root as context and import `lib/` directly (touches Dockerfile, CI, `deploy-clone-worker.yml` path filters, and possibly Helm). Compounding it: the deploy workflow's path filter triggers on `cloud-functions/clone-program/**` and `prisma/schema.prisma` — a change to shared `lib/` logic would **not rebuild the worker image**, so the app and worker silently run divergent versions of the same functions. And every new table this milestone adds (Suggestion, UserTrainingAggregates, UserExercisePreference) must be manually copied into the worker's schema duplicate or the worker throws `P2021` at runtime.

**Why you probably haven't noticed:** #883 is framed as a *deployment* issue ("k8s + Helm + ArgoCD") and graphed **after** #880, so it reads as end-of-milestone plumbing. The structural decision it contains — how workers share code with the app — actually gates the first line of #887 and part of #873. The "Option A: zero new infra" framing hides that Option A has a nonzero prerequisite: a build restructure.

**What to do:** extract the decision into its own small issue and land it **before** #887. Recommendation: move the worker Docker build context to the repo root (one Dockerfile change + CI workflow change), have the worker import `@/lib/*` directly, delete the duplicated prisma schema, and broaden the deploy path filter to include `lib/**` used by workers. It's a day of work now; it's a week of drift-debugging in September.

### Risk 4 — "Heavy" is undefined in a way that makes weekly-intent evaluation confidently wrong, which attacks the feature's trust story at its root.

#884's testable rule says `heavy_session` is satisfied by "completions in current week with the targeted muscle group + heavy intensity" — where "heavy intensity" can only mean `ExerciseDefinition.intensityClass`, which the tagger spec explicitly defines as **typical systemic fatigue cost of the movement**, a property of the exercise, not of the session. A deadlift with an empty bar is `intensityClass: heavy`. A brutal 5×5 on a "moderate"-class machine movement is not. So "at least 1 heavy leg day per week" gets satisfied by light technique-work RDLs and *not* satisfied by an actual maximal leg-press session. The same conflation infects `per_fau.last_heavy_days_ago` in the payload. The irony: the milestone's own EWMA machinery exists precisely to learn user-relative load ("heavy = ~10% above current estimate," per #868) — and #884's evaluation rules never reference it. The failure mode is the worst one available: the LLM says "you haven't had a heavy leg day this week" to a user who is still sore from Tuesday, in the rationale text and in the "what I'm working with" preview — the exact surfaces built to establish trust. One confidently wrong sentence there costs more than ten mediocre exercise picks.

**Why you probably haven't noticed:** `intensityClass` and "heavy session" share a word, and each spec is locally coherent — the tagger's definition is right for candidate filtering ("don't stack three heavy compounds"), the intent evaluator's need is different (did the user *train* heavy), and no document puts the two definitions side by side. The payload spec's rule 1 ("null if no heavy-tagged sets") quietly imports the conflation into the aggregates too.

**What to do:** define session-relative heaviness before #884 is implemented: a completion counts as heavy for a muscle group iff it contains a working top set within X% (start at 90%) of the relevant movement-pattern EWMA, falling back to `intensityClass` only when no EWMA exists (<3 observations). Encode both branches in #884's unit tests and in the golden fixtures (#886) — the `beginner` archetype exercises the fallback, `powerlifter` exercises the EWMA branch.

### Risk 5 — Your beta population is the feature's worst case, and cold start has no spec anywhere.

The gym launch population (per the Iron Works Boulder partnership) is **complete beginners** — the mom-test cohort. For a user with 0–5 logged workouts: every FAU shows near-zero volume and "neglected" status, `per_movement_calibration` is empty (correctly, per the ≥3-observations rule), `goal_progress` is all `"new"`, `recent_feedback` is empty, and `preferences_summary` says "defer to candidate list." The "Data Driven" option is data-driven on no data; the distinction between the three options collapses; the "what I'm working with" preview renders either an empty state nobody designed or a wall of "neglected" that reads as scolding. History v2 has an explicit empty-state threshold (<3 completions → no trends); the Suggest payload and UX have **nothing** — no minimum-data rules, no beginner mode, no defined behavior for an all-defaults profile. And the funnel in front of the feature is heaviest for exactly these users: signup → 6-screen Goals Wizard (gated) → optional interview → Suggest. Separately, `goal_sentences` — the most LLM-legible field in the whole payload — is produced by the **Interview** (#875); wizard-only users have an empty array, and nothing anywhere specifies synthesizing sentences from the wizard's structured `goalCategories`/`otherActivities`. For the beta cohort, the payload's centerpiece fields are empty by construction.

**Why you probably haven't noticed:** the whole design was validated against your own data — the "cyclist" archetype is literally your profile, and every worked example in the payload spec (bench EWMA at 192, upper-tilt intents) is a rich-history power user. The `beginner` synthetic archetype exists in #886, which shows the gap was *sensed* — but no spec consumes it: nothing defines what the planner or UI should *do* differently when the payload is sparse.

**What to do:** write the cold-start contract as a short addendum to the payload spec: (1) below N completions (reuse History's threshold of 3), the payload carries a `data_maturity: "cold_start"` flag and the prompt instructs the LLM to plan from profile + candidates only, with options relabeled honestly (e.g., "Starter" instead of "Data Driven"); (2) the training-state builder synthesizes `goal_sentences` from wizard fields when the interview hasn't run ("Building muscle (high priority); cycling 3x/week (high priority)") — a 20-line deterministic template, not an LLM call; (3) the preview renders a designed sparse state ("Not much history yet — I'm working mostly from your goals"). Then make the beginner archetype's golden fixture a first-class test target.

---

## Section 2: Hidden Scope Inflation

**#887 (UserTrainingAggregates) — 3x, the most inflated issue in the milestone.** The spec reads as "table + pure function + queue." It actually contains: (a) the schema reconciliation from Risk 2 (per-exercise section + weekly series); (b) the worker code-sharing problem from Risk 3 — its BullMQ handler is the first consumer of the unsolved build question; (c) `goalProgress.interpretation` — mapping free-text goal sentences ("Improve bench press") to movement patterns is an unscoped subproblem needing either keyword heuristics or an LLM call with caching, and it's load-bearing for the payload's `goal_progress` section; (d) nightly sweep scheduling — BullMQ repeatable jobs, and note the spec's "job ID = userId to dedupe" conflicts with how repeatable-job IDs work, so the dedupe design needs actual thought; (e) unit handling — `LoggedSet.weight` is a Float with a per-set `weightUnit` (default "lbs"), and the payload hardcodes `current_ewma_top_weight_lbs`, so mixed-unit histories need conversion, and bodyweight exercises (weight 0) will poison per-pattern EWMAs unless excluded; (f) a recompute-trigger policy for non-workout events — ratio-target changes (settings, #882 presets) and weekly-intent edits change `target_share`/`deficit_share`/`weeklyIntentStatus` but trigger nothing, so History and the LLM serve stale deficits for up to a day.

**#883 (worker deployment) — 2–3x.** "Choose Option A or B" undersells that Option A requires the build restructure (Risk 3), a `deploy-clone-worker.yml` path-filter redesign, LLM env plumbing through Doppler → External Secrets → Helm values coordinated with the infra repo (Tobias), and health-endpoint changes for three queues. Framed as an ops checkbox; is actually part structural refactor, part cross-repo coordination.

**#875 (Onboarding Interview) — 2–3x.** The wizard split shrank the *conversation* (2–4 turns) but the machinery is undiminished: `OnboardingSession` persistence with 24h resumability, a gap-detector over wizard output, a turn state machine, LLM failure/degradation paths, and — the sleeper — "edit-by-talking," where "actually I have kettlebells now" must "re-run affected wizard sections." That one sentence is a cross-feature state-mutation engine. (Note this spec currently sits on #876's body per Risk 1.)

**#877 (Implicit feedback hooks) — 2x.** The helper is small; the enumeration isn't. The spec lists three endpoints "+ delete endpoint(s)" — that trailing plural is the inflation. This app's edit surface is wide (draft logging, ad-hoc completions, replace, add-during-logging, saved-workout replay), and every path needs the `sourceSuggestionId` check plus a decision about whether the UI's "swap" is a true replace call or a delete+add pair (which would double-count signals). Also newly complicated by the three-option design — see Section 5.

**#896 (Injury → ban list) — 2x.** "Anything that loads my lower back" requires the LLM to enumerate against an 873-exercise catalog — that's a large candidate context or a multi-pass design, not a single structured call. The "deterministic defaults per area" are curated exercise lists someone has to actually author and maintain, and the confirmation step is UI inside the interview's turn machine. The spec acknowledges care is needed; it undersells that the care is most of the work.

**#880 (Suggest Workout v1) — known-big, plus one silent addition.** The "what the AI sees" preview was folded into scope with the claim "trivial — no new endpoints, no new state." That's false: the preview renders *before* a Suggestion exists, so it needs a new authenticated read endpoint over aggregates, a human-readable rendering layer, and a staleness policy (recompute-on-stale or show `computedAt`). Modest, but not zero, and it drags a freshness contract into #887.

---

## Section 3: Undersized-but-Critical (actually straightforward — don't over-invest)

**#873 (EWMA + Beta math).** Pure functions, ~150 lines plus tests, zero integration surface. It's on the critical path with two dependents (#876, #887) and could be finished in an afternoon. The only reason it looks bigger is that its body currently carries the tagger spec (Risk 1). Fix the body, dispatch it today.

**#884 (Weekly Intent spec + tests).** After #898 lands, the `weeklyIntent String[] → Json` migration — the riskiest listed item — is **already done** (PR #898 wraps existing strings as `free_text`). What remains is one evaluator module plus tests. The hard part is the *design* decision in Risk 4, which is an hour of thinking, not code.

**#886 (Synthetic seeder + snapshots).** Looks like infrastructure; is mostly data authoring on top of existing factories (`lib/test/factories.ts` already has `createMultiWeekProgram`, `createTestLoggedSets`, etc.). Archetypes are parameter tables. Highest leverage-to-effort ratio in the milestone — it de-risks #887, #876, #884, and #885 simultaneously.

**#879 (Equipment checklist UI — title scope).** `equipmentAvailable` already exists on the shipped profile with normalization. This is a chip-list settings screen. Its apparent weight comes entirely from the shuffled Suggest spec sitting in its body and a suspect graph edge (see Section 4).

**#882 (Ratio presets).** One constants file + a dropdown, no schema change. Correctly scoped small; resist the open question about bundling lookback settings into presets — defer it.

**#869 (Suggestion table).** Effectively done: PR #899 implements the locked expanded schema. Review and merge; the remaining work is closing out the #890 confusion.

---

## Section 4: Critical Path

From the checked-in graph (title numbering; ✓ = done):

```
872✓ ─┐
873 ──┼→ 876 ─→ 880 ─→ 883
884 ─→ 887 ─↑ ↑  ↑
886 ─→ 887 ──┘  │
869 ────────────┤
871 ─→ 877 ─────┘
897 ─→ 895 ─→ 875 ─→ 896     (and 895 gates 880's entry UX)
887 ─→ 885
```

**#887 is the single point of failure.** Fan-in of three unstarted issues (873, 884, 886), fan-out to both headline features (876→880, and 885). It is simultaneously the most scope-inflated issue (Section 2), the site of the spec contradiction (Risk 2), and the first consumer of the unsolved worker-build question (Risk 3). Every day of #887 slip is a day of slip for *both* Suggest and History. Concentrate design attention here first.

**#895 (Goals Wizard) is the second chokepoint.** It blocks #875, #896, carries a graph edge to #879, and — per its own body — gates the Suggest entry UX ("tap Suggested Workout without a completed wizard → prompt to complete it"). Its own prerequisite #897 is in review (#898). Six screens of form UI is real but parallelizable work; the risk is it competing for the same attention as #887.

**Graph defects to fix (via `msv graph-edit`):**

- **Missing edge `871 → 876`.** The training-state builder emits `preferences_summary` and per-candidate `user_preference_score` — it reads UserExercisePreference. The graph currently lets #876 "complete" without preference storage existing.
- **Edge `877 → 880` should be deleted.** Implicit-feedback hooks write signals; nothing in Suggest v1 *reads* them at launch (`recent_feedback` is legitimately empty for the first 30 days of any deployment). Hooks can land the week after #880 ships with zero loss. As drawn, this edge puts the unstarted #871→#877 chain on the headline feature's critical path for no benefit.
- **Edge `895 → 879` is almost certainly shuffle contamination.** Under shuffled numbering, "879" meant Suggest v1 — and "wizard gates Suggest" is exactly what #895's body says. Under title numbering it claims the Goals Wizard blocks a trivial equipment settings screen, which is nonsense (the wizard doesn't even collect equipment). It should probably be `895 → 880`. This means the graph itself has at least one shuffled edge — worth a full pass over the edge list during the Risk 1 reconciliation.
- **#878 (FAU aggregation cleanup) is an orphan node**, but its lookback-mode decision materially interacts with #887 — see Section 5.
- **Operational circularity around #883.** #887's recompute queue and #873's tag queue need a deployed worker to be verifiable in staging, but the deployment issue is graphed *after* #880. As drawn, nothing aggregate-driven — including History v2 — can be seen working in staging until the very end of the milestone. Split #883 (Section 8).

**The true critical path to the headline feature**, accounting for the above fixes: `873 → {884, 886} → 887 → 876 → 880`, with `897 → 895` needed for the entry-UX gate, plus one parked design session (intensity-vibe input UX, which the payload spec explicitly blocks #880's implementation on). That's five unstarted engineering issues deep with two design sessions embedded. Against a "deploying to a gym in weeks" clock, this path has no slack — which is the strongest argument for the descoping moves in Sections 8 and 9.

---

## Section 5: Second-Order Effects

- **The three-option design (#879-body/#880) silently invalidates #877's API.** `recordSwap/recordAddition/recordDeletion` were designed for "the AI gave you a workout, you edited it." Now the user picks one of three options first. Edits must be interpreted *relative to the selected option*, and the unselected options are themselves signal (picking Wild Card over Data Driven is information) — but nothing in #877's helper signatures or #871's storage carries option context. Decide now whether option-selection feeds learning; if yes, #877's context parameter needs the option id and #869's `selectedOptionId` needs defined semantics beyond "persisted."

- **The all-or-nothing zod validation interacts badly with the three-option output.** One hallucinated exercise ID in the Wild Card option fails the whole response; after one retry, `status='failed'` and the user gets nothing — even though two perfectly valid options existed. The single-call/single-schema decision (locked) means validation granularity must be per-option with salvage, or cheap-model failure rates will translate directly into visible feature failures. This constraint is invisible from either the client wrapper (which validates whole responses) or the spec (which defines the schema) in isolation.

- **#898 (from #897) changes `weeklyIntent` to Json *now*; the shipped DTO says `weeklyIntent: string[]`.** `normalizeUserTrainingProfile` in `lib/user-training-profile.ts` normalizes it as a string list. #884's discriminated union, the payload spec, and any profile-consuming UI must move in lockstep with #898's merge, or the profile helper silently mangles structured intents back into strings. Sequence: land the type change and normalizer update in or immediately after #898, before #884 builds on it.

- **The "what the AI sees" preview (#880 scope) imposes a freshness contract on #887.** The preview's whole value is *pre-empting* bad suggestions, which requires it to reflect current state at modal-open — but aggregates recompute only on workout completion and nightly. A user who changed ratio targets an hour ago, or whose last completion predates a settings change, gets a preview that misrepresents what the LLM will actually see... or worse, accurately represents stale data the LLM will also see. Either #887 grows recompute-on-read-when-stale, or the preview shows `computedAt` honestly. Not solvable from #880 alone.

- **#878's `lookbackMode` creates a second windowing system alongside #887's hardcoded 7d/14d.** A user who sets the muscle-balance panel to "last 8 workouts" can see "legs: balanced" in the panel while History v2 and the LLM (both on 14-day windows) say "legs: neglected." Same word, same FAU, contradictory verdicts, two screens apart. Either unify the windows, migrate the panel to read from aggregates (listed as "future cleanup" in #887 — promote it), or label the windows explicitly in both UIs.

- **The locked Suggestion schema (#869) has a redundant bidirectional link.** `Suggestion.workoutId` *and* `Workout.sourceSuggestionId` both encode the same relationship and can disagree. #877's hooks check `workout.sourceSuggestionId` while #880's select flow writes both. Pick one as authoritative (the FK on Workout, most likely) and make the other derived, or accept a class of "hooks didn't fire" bugs that are miserable to reproduce.

- **`Suggestion.requestPayload` is pitched as replay/debug infrastructure, but nothing versions it.** The payload spec *will* change (rule 7's threshold is literally "TBD"). Without a `payloadVersion` field on Suggestion rows and in golden fixtures (#886), replay tooling and cross-version debugging break the first time the shape evolves. One string field now; near-free.

- **Payload units are hardcoded lbs (`current_ewma_top_weight_lbs`) while `LoggedSet.weightUnit` is per-set.** Aggregates compute (#887), History display (#885), and prompt text (#880) all need a single conversion policy. Decided nowhere; three issues each assume someone else handles it.

---

## Section 6: Underspec'd Edge Cases

- **Timezones — the biggest unlisted one.** `now`, `today_dow`, the Mon–Sun week boundary, `last_session_days_ago`, `rolling_7d_sets`, and `satisfied_this_week` are all timezone-dependent, computed server-side by a worker with no user-timezone source (no such field exists on User). A Boulder user logging at 8pm Sunday is Monday in UTC: their "heavy leg day" lands in the wrong week and the intent flips to unsatisfied. Every date-math consumer in the milestone (#884, #887, #885, #880) hits this; no spec mentions it. Add a timezone field (or client-supplied offset captured at completion) before #884's week-boundary tests are written, or the tests will lock in UTC semantics.

- **Empty candidate list.** Old #880 asked "what if no candidates match the filters?" The new locked spec dropped the question without answering it. Aggressive bans + narrow equipment override can produce a near-empty list; the worker path needs a defined failure ("couldn't build a workout from your equipment — adjust filters") distinct from LLM failure.

- **Re-roll.** Also asked in old #880, also dropped. Full new suggestion? New Suggestion row? Does it count against the rate limit? Does the unselected prior suggestion feed learning as rejection? Undefined, and it's a v1 UI button.

- **The time-budget validation rule has no formula.** "Validate: count fits time budget" requires minutes-per-exercise math nobody has written (sets? rest? intensity-dependent?). Meanwhile the LLM writes "~40 min" in option summaries. Two estimates, zero definitions — the validator can't reject what it can't compute, and the copy can contradict the chips the user tapped.

- **Suggestion staleness.** User requests a suggestion Friday, doesn't select, returns Monday after two workouts elsewhere. The select endpoint will happily create a workout from Friday's training state. No TTL, no "stale — re-roll?" affordance, no expiry policy on rows in `queued`/`ready`.

- **Concurrent requests.** Double-tap or re-request while `queued`: two jobs, two rows, two LLM bills? BullMQ jobId dedupe, a partial unique index on active statuses, or a UI guard — pick one; none is specced.

- **Failure surfacing.** `errorMessage` exists on the schema; no spec says what the user sees for `failed`, whether retry is offered, or how partial-option salvage (Section 5) presents.

- **History v2's trend-pill thresholds lack minimum-data guards.** Rule 1 (±3% EWMA over 4 weeks) will fire "regressing" on two noisy observations. The payload spec has a ≥3-observations-in-30d guard; the History rules don't. Same data, one guarded consumer, one not — beginners (your beta cohort) see the unguarded one.

- **Rule 7's Beta-confidence threshold is "TBD: 0.05?" inside a *locked* spec.** It gates which preferences reach the LLM, and #886's golden fixtures will freeze whatever value gets picked — changing it later invalidates fixtures. Decide it deliberately (with the seeded archetypes as calibration), not as a constant someone types during implementation.

---

## Section 7: What We'll Regret in 3 Months

- **JSON-blob aggregates without a schema version field — HIGH.** `perFau`/`perMovement`/`goalProgress` as untyped Json means every consumer normalizes defensively, shape drift is invisible until runtime, and the Risk 2 expansion becomes a blob migration with no `WHERE` clause to help. A `schemaVersion Int` column plus zod parsing at every read boundary is an hour now. You already know this pattern's failure mode — it's why `normalizeMuscleBalanceTargets` exists.

- **The duplicated prisma schema in the worker — HIGH.** This will bite within weeks, not months: Suggestion, UserTrainingAggregates, and UserExercisePreference all land app-side and each needs a manual copy into `cloud-functions/clone-program/prisma/schema.prisma`. The first forgotten sync is a staging P2021 at 9pm. Risk 3's fix eliminates the copy entirely; if you keep it, add a CI diff-check.

- **One LLM call, three full options, all-or-nothing validation, on a cheap-model floor — MEDIUM-HIGH.** The "Haiku/8B-tier should suffice" premise was formed for a *single* workout list. Three nested options with per-exercise rationale is ~3x the output tokens and much more schema surface; 8B-tier JSON adherence degrades nonlinearly with output length. Prediction: within a month of real use you either split into parallel calls, add per-option salvage, or quietly pin `LLM_MODEL` to something better and stop pretending the floor matters. (See Section 9 — I'd just concede this now.)

- **Per-movement-pattern EWMA over heterogeneous exercises — MEDIUM.** `horizontal_push` EWMA blends barbell bench at 195, weighted dips, machine press plate numbers, and pushups at weight 0. Swap flat bench → incline DB and the EWMA discontinuity fires "regressing" pills in History — a *visible* wrong answer, worse in a UI than in a prompt. The History design claims the FAU-layer EWMA "avoids the swap ambiguity"; it relocates it. Mitigation that fits the current design: track EWMA per (pattern, dominant exercise) and expose the pattern-level number only when one exercise dominates; exclude weight-0 sets always.

- **No defined semantics for `selectedOptionId` — MEDIUM.** You'll collect months of option-selection data with no record of *what the alternatives were* in normalized form (they're buried in responsePayload JSON) and no interpretation rule. When you want it for learning, the data will be there but the meaning won't.

- **Wizard-gating the headline feature at a beginner gym — MEDIUM.** The first live demo at Iron Works will be someone's mom hitting a 6-screen form between "tap Suggest" and the magic. Prediction: an emergency "use defaults, skip for now" path gets hacked in at the gym on launch day. Build the skip path deliberately now instead.

- **Hardcoded `_lbs` payload fields — LOW-MEDIUM.** Cheap to parameterize now, annoying to migrate out of golden fixtures and prompt templates later.

---

## Section 8: Recommended Reorderings

1. **Insert a "wave 0" reconciliation task ahead of everything** (Risk 1): fix the four shuffled bodies, close #890, merge #899, restore #871's real spec, audit the graph edge list for shuffle contamination (`895→879` at minimum), and cross-link the locked comments to their true issues. Half a day; unblocks correct agent dispatch for every subsequent issue.

2. **Land #873, #884, #886 immediately and in parallel.** All three are small (Section 3), all three feed #887, and #886's fixtures are the test bed for everything downstream. The only prerequisite is an hour deciding Risk 4's "heavy" definition for #884.

3. **Split #883.** New issue "883a: worker build shares `lib/` + new queues wired" (the Risk 3 restructure) landing **before #887**; remainder "883b: env plumbing, Helm/infra coordination, final deploy checks" stays after #880. As currently graphed, #883's most important content is scheduled after everything that needs it.

4. **Hold #887 for one reconciliation pass (Risk 2), then treat it as the milestone's center of gravity.** It deserves the design attention currently being spread across the interview/wizard chain. Add the missing `871 → 876` edge while you're in the graph.

5. **Delete the `877 → 880` edge and move #877 (+ its prerequisite #871's implementation) after #880.** Feedback hooks write signals nothing reads at launch; taking them off the critical path removes an entire unstarted lane from the headline feature's blockers. (Keep #871's *schema* early only if you want to avoid a later migration — but schema-only is a day.)

6. **Descope #875 and #896 (Interview + injury bans) from the beta wave entirely.** The wizard collects injuries and structured goals; the builder can synthesize `goal_sentences` from them (Risk 5's 20-line template — add it to #876's scope). The interview is the milestone's most inflated non-critical issue (Section 2) and its output is additive, not required. Ship it in the wave after the gym launch, informed by real beginner behavior.

7. **Fold #878's windowing decision into #887's design pass** (or explicitly decide the panel and aggregates use different, labeled windows). Its orphan status in the graph hides a user-visible consistency problem (Section 5). The code can still ship whenever.

8. **Start #885's chart-library benchmark and UI shell against #886's golden fixtures, before #887 lands.** The locked design + fixture payloads are a sufficient contract to build components against; only the final data wiring needs the real table. This takes History off #887's completion date and gives beta users the standalone value #885's own body argues for.

---

## Section 9: What I'd Do Differently

**Drop the async queue for v1 and ship Suggest as a synchronous route.** The BullMQ pattern was inherited from program cloning, whose rationale — Vercel's 90-second serverless limit — **no longer applies**: the app runs on self-hosted k8s. A suggest request is one LLM call plus DB reads, ~10–30s; a synchronous route handler with a good loading state handles that fine behind your own ingress. Going sync deletes: the status/progressStep state machine, the polling endpoint and 1.5s poll loop, the queue publisher, the worker handler, and most of Risk 3 and #883a (the tag and aggregates queues could go on-demand/cache-aside too — see next point). Keep the `Suggestion` row for traceability — write it in the same request. The three progress steps ("analyzing → planning → finalizing") can remain as pure theater on the client. If suggest volume ever makes sync painful, the queue is a clean retrofit — the Suggestion row you kept is already the job record, which is precisely why #869's expanded schema is good design either way. For a solo developer weeks from a gym launch, this is the single biggest schedule lever available: it removes roughly a third of the critical path in exchange for a worse story at a scale you don't have.

**Make aggregates cache-aside, not background-recomputed, for v1.** The <2s recompute target concedes on-demand is feasible. Compute on read when `computedAt` is stale (older than the last WorkoutCompletion or settings change), store the result, serve it. This deletes the recompute queue, the nightly sweep, the repeatable-job scheduling question, and — notably — the entire staleness class from Sections 5 and 6 (the preview is always fresh by construction). One gym of users on a self-hosted Postgres does not need write-time precomputation. The Discussion already applies exactly this logic to defer bandits and pooling ("overkill until many more users exist"); apply it to your own queue.

**Stop designing for an 8B-tier floor.** "A competent Haiku/Llama-8B-tier model" is doing a lot of load-bearing work in the design principle, and the three-option structured output has quietly outgrown it. The cost analysis already says pennies per request at one gym's volume; the difference between an 8B model and a genuinely good small model is noise financially and decisive for schema adherence and rationale quality — and rationale quality *is the product* here, per your own trust framing. Keep the provider-agnostic client (it's well built), set the default model a tier up, and let "cheap-model survivability" be a portability property you test occasionally, not a constraint you design UX around.

**Reframe the beta as "History v2 + wizard first, Suggest second."** History v2 delivers unconditional value to beginners (last-session reference already shipped in #894 and is the most-used datum in any gym), it's the debugging surface for the AI, and it exercises the whole aggregation layer with no LLM in the loop. Shipping History + wizard to the gym while Suggest hardens against real logged data for two weeks turns your beta users into the data-generation phase for the feature — instead of its worst-case first audience.

**One process change: locked specs get one home.** The milestone now has locked artifacts spread across five issue comments and two bodies, several at shuffled addresses, with a design discussion whose body is declared untrustworthy. Put locked specs in-repo (`docs/features/suggest-workout/…`, versioned, reviewable in PRs, greppable by agents) and make issues *link* to them. Half the risks in this document — Risk 1 entirely, Risk 2 substantially — are artifacts of specs living in mutable, misnumbered comment threads instead of files.
