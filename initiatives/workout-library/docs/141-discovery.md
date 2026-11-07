# Scoping note: workout library (tidy and find saved workouts)

Date: 2026-11-06 · Author: coach-disco · Request: keep saved workouts tidy and easy to find (pinned + the user's own tags), including where AI- and coach-sent workouts land.

## Summary
Saved workouts are one flat, unpaginated list in Library → Workouts with no search, tags or sort control. Never-started workouts (every accepted AI workout) sort to the **bottom**, and nothing records where a workout came from. Recommended: add `tags String[]` and an `origin` + `archivedAt` on `SavedWorkout`; in Library show Pinned, then a search box and tag chips, then recent, then an "Older" fold; land AI and coach workouts in a "New" group at the top until first started or dismissed.

## Constraints
- Schema change = `db push` + hand-written migration (`AGENTS.md`, Database and migrations).
- API routes: `getCurrentUser()`, scope to the user, try/catch, rate limiting (`AGENTS.md` Conventions).
- `SavedWorkout.workoutData` is a snapshot, not a live reference (`AGENTS.md` Domain gotchas).
- This checkout is shared with test-builder on `feature/coaching-invite`; coaching (item 136) will add coach-sent `saved_workout.create` proposals.

## What I found
**Observed**
- Model: `SavedWorkout { name, notes, sourceCompletionId @unique, workoutData, exerciseCount, lastUsedAt?, pinnedAt? }`, indexes on `lastUsedAt`, `createdAt`, `pinnedAt` (`prisma/schema.prisma:208-224`). No tags, origin or archive fields.
- **Ways one is created (two):**
  1. Save after a finished freestyle session: `POST /api/workouts/saved` (`app/api/workouts/saved/route.ts:60-200`), freestyle only (`:141`), sets `lastUsedAt = completedAt` (`:186`). Button: `WorkoutRollupModal` shows Save when `rollup.isAdHoc && !isMinimal && exercises > 0` (`components/features/training/WorkoutRollupModal.tsx:155-156,634-650`).
  2. Approving an agent `saved_workout.create` proposal: `createSavedWorkout` with `lastUsedAt: null` (`lib/proposals/saved-workout.ts:203-221`).
  No duplicate action exists (searched `components/features/saved-workouts`, `app/api/workouts/saved`).
- Starting one: `POST /api/workouts/saved/[id]/start` makes an ad-hoc draft linked by `savedWorkoutId` and sets `lastUsedAt` (`app/api/workouts/saved/[id]/start/route.ts:53-60`; drafts are `isAdHoc: true`, `lib/workouts/start-draft.ts:73`).
- List order: `lastUsedAt desc nulls last, createdAt desc`, no limit, no pagination (`app/api/workouts/saved/route.ts:32-47`). Pinned rows stay in place with a "Pinned" chip; they are not lifted to the top (`components/features/saved-workouts/SavedWorkoutsList.tsx:157-168`, `SavedWorkoutRow.tsx:45-52`).
- Row: name, exercise count, last-used or "Created" date, pin toggle, ⋮ menu with rename / delete (`SavedWorkoutRow.tsx:29-80`). Detail dialog: `SavedWorkoutDetailDialog.tsx`. No search, filter or sort control anywhere.
- Where it shows: Library → Workouts tab (`components/library/LibraryView.tsx:7,65`); `/workouts/saved` just redirects there (`app/(app)/workouts/saved/page.tsx`). Training shows pinned only, `take: PINNED_LIMIT` ordered by `pinnedAt` (`lib/training/home.ts:107-112`). QuickActionSheet fetches the **whole** list just to count it (`components/QuickActionSheet.tsx:126`).
- MCP: `list_saved_workouts` (all, by `createdAt`) and `get_saved_workout` (`lib/mcp/tools.ts:641-660`); `saved_workout.create|update` proposals take name, notes, exercises only.
- Prior idea (ROADMAP line 15): Start now / Plan for later on approve; save as template only on purpose; fold unused 30+ days into "Older". Its "three questions (2026-11-04)" are not written down in this checkout or the primary one.

**Inferred**
- Accepted AI workouts sink: `lastUsedAt: null` + `nulls last` puts them below everything ever used, the opposite of what a new suggestion needs.
- Re-save sprawl: a session started from a saved workout is also ad hoc, and `canSave` doesn't check its `savedWorkoutId`, so the rollup offers Save again and makes a near-copy. Rests on `WorkoutRollupModal.tsx:155` and the draft being `isAdHoc`. Not reproduced in the app.
- One-offs saved by accident are only removable one at a time via ⋮ → Delete.

**Unknown**
- How many saved workouts a heavy user has: there's no saved-workout seed (`rg savedWorkout prisma/seed* scripts` found none), and I didn't query a DB. Dustin's prod count would settle whether pagination matters now.
- The 2026-11-04 questions themselves.

## Decisions and assumptions
- **Tags as `SavedWorkout.tags String[] @default([])`** with a GIN index, not a Tag table. Why: one owner per workout, no tag metadata (colour, order) asked for, `String[]` is already the pattern (`Program.goals`, `ExerciseDefinition.equipment`); rename-a-tag-everywhere is one `UPDATE … array_replace`. Limits: lowercase-trimmed, 1–24 chars, ≤ 8 per workout, ≤ 50 distinct per user. Free text with autocomplete from the user's existing tags; offer 4–6 starter chips (e.g. push, pull, legs, upper, lower, full body) only while the user has none.
- **Origin** as `origin String @default("session")` (`session | agent | coach`) set at create; plus nullable `proposalId` is not needed (Proposal.targetId already points the other way).
- **Unused = `lastUsedAt` older than 30 days, or never started and created 30+ days ago.** Computed at read time; no job, no auto-delete. Pinned never folds.
- **Archive is manual** (`archivedAt`), separate from the automatic "Older" fold. Older is still searchable; Archived is hidden except under a "Show archived" link. Reason: auto-archiving would hide a workout the user still thinks of as theirs; a fold is reversible by just using it.
- Agents and coaches may send `tags` on `saved_workout.create`, but only from the trainee's existing tags or the starter set, to avoid tag sprawl from outside. MCP: `list_saved_workouts` gains `tags`, `origin`, `lastUsedAt` and a `tag` filter; no tag-write tool in v1.

## Recommended design
**Library → Workouts (phone first, one column):**
1. Search box (name + notes, client-side filter; list is one fetch today) and a horizontal row of tag chips; one chip active at a time.
2. **New** group (only if any): workouts with `origin` agent/coach and never started. Row shows "From Dustin" / agent name, Start, and Dismiss (= archive). Leaves the group on first start.
3. **Pinned**, then **Recent** (used in the last 30 days), then a collapsed **Older (n)** fold. Sort inside groups stays last-used.
4. Row ⋮ menu adds Tags… (sheet with chips + type-to-add) and Archive. Long-press or a "Select" button enables bulk Archive / Tag / Delete.
5. Rollup Save: when the session came from a saved workout, show "Update <name>" / "Save as new" instead of a plain Save.

**Training:** unchanged (pinned only). The "From your coach" suggestions block already covers pending proposals.

**AI and coach workouts (Find-out 4):** recommend landing as a normal saved workout tagged by origin and shown in **New** until started, rather than "start now without saving". Why: the existing approve already creates a SavedWorkout, coaching (136) relies on that, and a New group plus the Older fold stops the pile-up without a second "planned" concept. "Start now" can be an extra button on approve that starts it immediately.

## Proposed work
| Step | Role | Input | Output | Checked by |
|---|---|---|---|---|
| 0 | Lead | this note + Dustin's answers | spec + `.feature` per slice | Dustin |
| 1 | Implementer | spec: order + Older | Pinned-first then Recent then Older fold; never-started not sunk; QuickActionSheet uses a count | tests on ordering/grouping; phone screenshot |
| 2 | Test builder → implementer | spec: search + tags | `tags` column + migration, PATCH tags, tags sheet, chips, search | tests: limits, normalisation, user scoping, rate limit; perf-check |
| 3 | Test builder → implementer | spec: origin + New | `origin`, `archivedAt`; New group; Dismiss/Archive; Show archived; proposals set origin; MCP fields/filter | tests: origin from each create path; archived hidden; MCP scoping |
| 4 | Implementer | spec: tidy | bulk select (archive/tag/delete); rollup "Update vs Save as new" | tests; phone review |

Order and dependencies: 1 needs no schema and ships alone; 2 and 3 are independent of each other; 3 should land before coaching's send slice so coach workouts get `origin: coach`.

## Risks
- Client-side search assumes a small list; if heavy users have hundreds, move search/filter to the API and paginate.
- The re-save duplicate is inferred, not reproduced; confirm before building slice 4's "Update" path.
- Tags from agents/coaches could still clutter if the starter set is wide.

## Needs Dustin
1. **Older fold threshold and archive.** (a) Fold unused 30+ days, manual archive only (rec); (b) also auto-archive after 90 days; (c) no fold, archive only. Confidence: medium.
2. **Where AI/coach workouts land.** (a) Saved, in a "New" group until first started or dismissed (rec); (b) not saved until you choose "Plan for later" or start it; (c) plain list like today. Confidence: medium-high.
3. **Tags: free text or a fixed set?** (a) Your own free-text tags with a few starter suggestions, agents/coaches may only use tags you already have (rec); (b) a fixed set only; (c) free text everywhere, agents included. Confidence: high.

## Out of scope / later
- Saving from program workouts (blocked today, `route.ts:141`).
- Folders or nested tags; tag colours.
- Training-side search; a "workout of the day" picker.
- `list_saved_workouts` orders by `createdAt`, unlike the app; worth aligning when slice 3 touches it.
