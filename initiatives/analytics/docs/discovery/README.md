# Scoping note: Analytics tab (replaces Learn)

Date: 2026-11-01 · Author: analytics-disco · Work item: 106 · Checkout: worktree1 at `051b08b8` (origin/dev)

Request: Replace the Learn tab with an analytics tab that answers "Am I progressing?" (per-exercise strength, PRs, volume) and "Am I consistent and working hard?" (workouts per week, streaks, time trained, effort, deload signals).

## Summary
Every number on the page can be computed from rows we already store (`WorkoutCompletion`, `LoggedSet`, `LoggedCardioSession`), and most of the maths already exists in `lib/insights/*` and `lib/stats/*`. What's missing is **time series and all-time records**: today's code gives single rolling windows (7/14/28 days), a 4-session history, or ≤12 rolling weeks. No charting library is installed; small hand-written SVG charts fit the folder style and need no new dependency. Recommendation: build **mockup A (overview)** as the tab, with **mockup B (per-exercise page)** as the tap-through from each lift. Compute per request; precompute nothing yet.

## Constraints
- Read-only discovery; no dev server against shared data (none was started; mockups were served from a throwaway `python3 -m http.server` on 127.0.0.1 and screenshotted with headless Chrome).
- Style: paper tabs + folder boxes, plain `divide-y` rows, no `doom-corners`, one `doom-title` per screen, 48px targets, light and dark (`initiatives/ui-audit/spec.md`, header + UI1).
- API rules: `getCurrentUser()`, user-scoped queries, try/catch, `lib/rate-limit.ts`, `logger` (`AGENTS.md` Conventions). Avoid N+1 (`prisma-check`).
- Agent-tools stance: insight code returns raw numbers, not verdicts (`lib/insights/stall.ts:5-9`, `lib/insights/effort.ts:4-8`). The UI may phrase comparisons, but keep the lib layer numeric so MCP tools and the page share it.

## What I found

### 1. Data inventory (observed)

| Source | What it gives | Window / limits | Used by |
|---|---|---|---|
| `WorkoutCompletion` (`prisma/schema.prisma:179-205`) | `completedAt`, `startedAt`, `durationSeconds`, `status`, `sessionRpe`, `isAdHoc`, `isArchived` | all history; indexed `(userId, status, completedAt)` | everything |
| `LoggedSet` (`schema.prisma:225-246`) | reps, weight (Float) + `weightUnit`, `rpe`, `rir`, `isWarmup`; exercise via `Exercise.exerciseDefinitionId` (`:139-161`) | all history | everything |
| `LoggedCardioSession` (`schema.prisma:310-340`) | `duration`, distance, HR, power, zone | all history; `(userId, completedAt)` index | nothing analytic today |
| `UserTrainingAggregates` (`schema.prisma:697-723`, shapes `lib/aggregates/types.ts:104-118`) | `sessionsLast7d`, `daysSinceAnySession`, `qualifyingSessionsTotal`, `totalWeeklySetsBaseline` (8-wk median), `acuteChronicRatio`, `detrainingGapDays`, per-FAU rolling 7/14d sets, per-pattern EWMA e1RM, goal trend | one row per user, **current snapshot only, no history**; detail window ~70 days (`lib/aggregates/recompute.ts:35-37`) | suggest pipeline; recomputed in the BullMQ worker on completion (`cloud-functions/clone-program/src/index.ts:222`) |
| `computeStallSignals` (`lib/insights/stall.ts:100-136`) | per exercise: per-session best-set e1RM series, early vs late change %, best e1RM, sessions since best | last N (≤12) sessions in ≤365 days (`lib/mcp/tools.ts:107-111`); completed only | MCP `get_stall_signals` (`tools.ts:390-421`) |
| `computeEffortSummary` (`lib/insights/effort.ts:86-93`) | per rolling 7-day week: sessions, working sets, rated %, avg effort, RPE histogram, % at 9+/10, session RPE | ≤12 rolling weeks (`tools.ts:112-114`) | MCP `get_effort_summary` (`tools.ts:423-447`) |
| `computeFauVolume` (`lib/insights/balance.ts:136`) and `getMuscleBalanceSnapshot` (`lib/muscle-balance.ts:237`) | sets per muscle group (FAU) in one window | single window (`lookbackDays`, default 14) | MCP `get_fau_volume`; settings page; ad-hoc summary |
| `lib/insights/export.ts` | one row per logged set, raw | ≤1096 days (`:37`) | MCP export + CSV route |
| `lib/stats/exercise-history-derivation.ts` | `bestWorkingSet`, `bestSetE1RM`, `allTimePRSessionIndex`, `e1rmTrend` (pure, client-safe) | whatever sessions you pass | logger History tab, fed **4 sessions** (`app/api/exercises/[exerciseId]/history/route.ts:8`), so its "all-time PR" is really "best of last 4" |
| `lib/stats/workout-rollup.ts` | per workout: volume, top set, vs last time, `lifetimeWorkoutCount`, `workoutsLast7Days`, duration with `startedAt` fallback (`:158-167`) | one completion | post-workout summary modal |
| `lib/workout-history.ts:50` `resolveDurationSeconds` | duration with fallback | — | history API |
| `lib/queries/exercise-history.ts:31,130,201` | last / last N performances per exercise (single query) | N sessions | logger |
| `UserTrainingProfile.targetMovements` (`schema.prisma:441-444`) | user's anchor lifts per pattern | — | MCP `get_anchors`; good default for "key lifts" |

### 2. Per question: computable now, missing, cost

Cost assumption (inferred): a very active user logs ~25 working sets × 4 sessions/week ≈ 5k `LoggedSet` rows a year. One indexed query for a year of sets plus an in-memory pass is a few tens of ms. Nothing here needs a precomputed table yet.

**Am I progressing?**
| Signal | Now | Missing | Cost |
|---|---|---|---|
| e1RM trend per exercise | `computeStallSignals` series (≤12 sessions) | longer series (3M/6M/1Y), downsampled per week | per request: one `loggedSet.findMany` per exercise page; reuse stall maths without the 12-session cap |
| Best sets / rep PRs (best weight at 1, 3, 5, 8 reps) | nothing | new pure function over all sets of one exercise | per request, one exercise at a time |
| All-time PRs and "new PR this week" | only best-of-4 in the logger | all-time best e1RM per exercise, and when it was set | per request for the overview (all exercises, all time: one grouped query); precompute later only if slow |
| Volume over time | rolling single windows only | sets (and tonnage) per **calendar week** for 12+ weeks | per request, one query |
| Bodyweight lifts | excluded from e1RM (`exercise-history-derivation.ts:36-39`) | rep-based progress (best reps) | same query |

**Consistency and effort**
| Signal | Now | Missing | Cost |
|---|---|---|---|
| Workouts per week | `sessionsLast7d`, rollup's `workoutsLast7Days` | per-calendar-week counts and average | per request, `completedAt` only (cheap) |
| Streak | nothing | weeks-in-a-row rule (needs a decision, see Needs Dustin) | per request over all completion dates |
| Time trained | duration with fallback exists | weekly sum; cardio minutes from `LoggedCardioSession.duration` | per request |
| Effort trend | `computeEffortSummary` (12 rolling weeks) | calendar-week alignment and longer range | per request |
| Deload / fatigue signals | `acuteChronicRatio`, `detrainingGapDays` (snapshot), effort weeks, stall | weeks-since-last-light-week; effort rising N weeks; history of ACR | per request from the same weekly series; no deload flag exists in the schema (`Week` has only `name`) |

### 3. Removing Learn touches (observed)
- Nav: `components/BottomNav.tsx:17` (`TABS_AFTER` learn entry, `BookOpen` icon), `components/Header.tsx:25`, `lib/nav/active-tab.ts` (no learn rule; fine).
- Routes: `app/(app)/learn/page.tsx`, `learn/[slug]/page.tsx`, `learn/collections/[id]/page.tsx`; components `components/features/learn/{LearnBrowser,ArticleDetail,CollectionDetail}.tsx` (~950 lines).
- In-app links into articles: `components/features/training/BeginnerPrimerWizard.tsx:41,60,80,83` (four `/learn/<slug>` links in the beginner primer).
- APIs: `app/api/articles/route.ts`, `app/api/articles/[slug]/read/route.ts`, `app/api/collections/[id]/route.ts`; admin CMS `app/(app)/admin/{articles,collections,tags}` and `lib/admin/navigation.ts:20,55-57,72` ("Learn Content" group).
- Data: `Article`, `Tag`, `ArticleTag`, `ContentReadStatus`, `Collection`, `CollectionArticle`, `ArticleComment` (`schema.prisma:514-610`); seeds `prisma/seeds/{seed-learning-content,dev-articles,seed-dev-content}.ts` (`scripts/start-postgres.sh:129`); `scripts/smoke-test-learn-content.sh`; `docs/ADDING_LEARN_ARTICLES.md`; AGENTS.md docs index line.
- Tests that pin the nav hrefs: `__tests__/components/nav-active-tab.test.tsx:45,63,90,128,138`, `__tests__/features/training-library/library.steps.ts:94`. `__tests__/lib/message-validation.test.ts:72` uses `/learn/article` only as a sample link.
- **Not Learn:** `lib/learning/*` (weekly intent, EWMA maths) is the suggest pipeline, not the tab. Don't delete it.

### 4. Style and charts (observed)
- No chart library in `package.json` (no recharts, d3, visx, nivo, chart.js).
- Pieces to reuse: `components/ui/PaperTabs.tsx` (tones `mine`/`next`/`coach`, count chips), `PaperTabTitle`, `PageTitle`, folder `border-2` boxes with `folder-box` (avoids the gold hover, `app/globals.css:2353`).
- The mockups draw charts as inline SVG coloured by theme tokens (`ideas/_charts.js`, ~90 lines: sparkline, line with PR dots, weekly bars with an RPE row). They read well in both themes with no extra work.

### Inferred
- Hand-rolled SVG (three small components) beats adding Recharts: we need sparkline, line and bar only; tokens apply directly; no bundle cost; no theming layer. Revisit if we want tooltips/zoom.
- An `/api/progress/*` route pair (overview, exercise) plus a server-rendered page is enough; the lib functions should sit in `lib/insights/` so MCP tools can expose the same numbers later.

### Unknown
- How many real users log RPE/RIR. `UserSettings.intensityEnabled` defaults to false (`schema.prisma:370`), so effort coverage may be thin; `effort.ts` already reports `coveragePct`.
- How often `durationSeconds`/`startedAt` are present on real completions (I did not query shared data).
- Whether any staging/prod in-app messages link to `/learn/...` (message bodies are data; not checked).
- User timezone: none stored (`UserSettings`, `schema.prisma:354-381`); aggregates use UTC ISO weeks (`lib/aggregates/compute.ts:141`).

## Mockups (`ideas/`)
Static HTML on the ripit tokens, 390px screenshots in light and dark (`?mode=dark`). Data is made up.

| | File | Stance | Shots |
|---|---|---|---|
| A | `ideas/a-overview.html` | **Overview dashboard.** This week (day strip, workouts/sets/time, streak) → Lifts (anchor lifts with sparkline, PR chip or 8-week change) → Volume (12 weeks of sets with RPE row; Time and Muscles tabs) | `a-overview-light.png`, `a-overview-dark.png` |
| B | `ideas/b-exercise.html` | **Per-exercise first.** Exercise picker + chips → e1RM chart with top-set overlay and range (3M/6M/1Y/All) → rep records → sessions | `b-exercise-light.png`, `b-exercise-dark.png` |
| C | `ideas/c-report.html` | **Weekly report card.** Week navigator → this week vs your 8-week normal (workouts, sets, time, effort, streak) → records this week → 8-week bars with a deload note | `c-report-light.png`, `c-report-dark.png` |

**Recommendation: A as the tab, B as the page behind each lift row.** A answers both questions on one screen without picking anything; B is where "am I progressing on squat?" gets a real answer; C's "vs your normal" comparisons can live as A's Last week tab rather than a separate page. Confidence: medium; C is the better fit if Dustin mostly checks in once a week.

## Proposed work
| Step | Role | Input | Output | Checked by |
|---|---|---|---|---|
| S1 | implementer | spec: weekly series + consistency (A's This week, Volume), Learn removal | `lib/insights/progress.ts` (weekly counts, sets, time, effort, streak), `/progress` page, nav swap, Learn routes/nav/primer links gone | `.feature` + Vitest on the pure functions; 390px light/dark screenshots |
| S2 | implementer | spec: lifts + records (A's Lifts/Records, page B) | all-time PR and rep-record functions, `/progress/exercise/[id]` with SVG line chart | tests on PR maths (ties, unit mix, bodyweight); screenshots |
| S3 | (later) | — | deload/fatigue notes, Muscles tab (reuse `computeFauVolume` per week), cardio detail; MCP tools on the new lib functions | — |

Order: S1 then S2 (S2 reuses S1's chart pieces). A test-builder role before each implementer fits the usual flow (`handoff-test-builder`).

Learn data (tables, admin CMS, seeds) removal: a separate, later item with a destructive migration; S1 only unlinks the tab.

## Risks
- e1RM from high-rep sets (Epley) overstates strength; mixing 3-rep and 12-rep days makes the line jumpy. Mitigation: best set per session, and show the top-set overlay (as in B).
- Weight is free text in places (`AGENTS.md` Domain gotchas); `LoggedSet.weight` is numeric but `%`/RPE-style loads may land as 0 and drop out silently.
- UTC week boundaries will put a Sunday-evening US workout in Monday's week. Pick a rule before streaks ship.
- Effort charts with low RPE coverage mislead; show coverage or hide below a threshold.

## Needs Dustin
1. **Which page shape?** A overview (+B drill-down) / B first / C weekly report. Recommend A+B. Confidence: medium.
2. **What counts for a streak and a week?** Options: weeks with ≥2 workouts (shown in mockups) / any workout / hitting the program's planned days; and week = Mon–Sun in the user's local time (needs the browser timezone sent with the request) vs UTC. Recommend ≥2 workouts, Mon–Sun local. Confidence: low; it's taste.
3. **What happens to Learn's content and admin CMS?** Unlink only now and delete tables later / delete everything in S1 / keep articles reachable elsewhere (e.g. Settings → Help, and the beginner primer's 4 links). Recommend unlink now, keep the primer links pointing at a small static page or drop them, delete tables in a later item. Confidence: medium.

## Out of scope / later
- Tab name ("Progress" in mockups) and icon (`TrendingUp`).
- Bodyweight tracking (no model for it), so no relative-strength numbers.
- Logger History tab's "PR" is best-of-4 (`route.ts:8`); once S2's all-time PR exists, the logger could use it.
- `admin/analytics` already exists (app events); a `/progress` route avoids the name clash.
