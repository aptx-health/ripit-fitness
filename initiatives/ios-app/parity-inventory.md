# iOS vs web: parity inventory

Date: 2026-11-07 · Author: parity-disco (work item 173) · Branch: `feature/ios-skeleton`

**Bottom line:** the iOS app covers the *skeleton* of the web's core loop (start → log → history → progress, plus programs), but almost none of the in-workout help that makes the web feel complete: rest timer, "last time" line, effort (RPE/RIR), notes, a finish summary, exercise info/history tabs. The iOS app also has no Settings, no Library (saved workouts, browse programs) and only the RIPIT theme. Closing the **logger** gap first is the biggest felt improvement per unit of work.

## How this was checked

- **Web:** local app on this branch at 390×844 (Playwright, Chromium 1248, deviceScaleFactor 2), logged in as `dmays@test.com`. `dev.sh` could not start (see Risks), so Postgres ran in the existing `fitcsv-postgres-review155` container on port 5499 (same seed script) and `next dev` on port 3955. Staging was not used.
- **iOS:** Debug build in a new simulator `parity-disco-173` (iPhone 16 Pro, iOS 27.2). Imported `docs/fixtures/ripit-export-v1.json` (2 programs, 3 workouts, 1 saved workout, 1 custom exercise). Logger, picker and lift-page shots use the app's `#if DEBUG` demo launch arguments (synthetic data) because those screens need an open session.
- **Code:** web inventory from `app/`, `components/`, `lib/`, `hooks/` (two read-only Sonnet subagents, spot-checked); iOS from `ios/App/*.swift` and `ios/RipitCore/Sources/RipitCore/*.swift` (3.1k lines of app code).
- **Source column:** **O** = observed in the running app(s); **C** = inferred from code only.

Screenshots: `initiatives/ios-app/handoff/parity-assets/` (`web-*.png`, `ios-*.png`). Note: that folder is **not** git-ignored today (`git check-ignore` returns nothing), so don't `git add -A`.

| Core screen | Web | iOS |
|---|---|---|
| Training home | `web-training.png` | `ios-training.png` |
| Workout logging | `web-workout.png` (program), `web-freestyle.png` | `ios-workout.png` (program), `ios-adhoc.png` |
| Exercise picker | `web-picker-search.png`, `web-picker.png` | `ios-picker.png` |
| Program | `web-program.png`, `web-library.png` | `ios-program.png`, `ios-programs.png`, `ios-builder.png` |
| Progress | `web-progress.png`, `web-lift.png`, `web-lifts.png` | `ios-progress.png`, `ios-lift.png` |
| Settings | `web-settings.png`, `web-theme.png` (+ equipment, balance, targets, coaching, agent) | none: iOS has no Settings screen (only `ios-progress.png`'s unit/target sheet) |
| History | Training › Recent tab (`web-training.png`) | `ios-history.png` |
| Web only | `web-quickactions.png`, `web-learn.png`, `web-community.png` (Browse), `web-savedtab.png`, `web-suggestions.png`, `web-welcome.png`, `web-goals.png`, `web-onboarding.png`, `web-newprog.png` | n/a |

## Feature table

Status: **have / partial / missing / not planned**. Size is the iOS work to close the gap: **S** under a day, **M** 1–3 days, **L** more.

### Navigation and shell

| Feature | Web | iOS | Size | Src | Notes |
|---|---|---|---|---|---|
| Bottom nav | Training · Library · **Workout (quick actions)** · Progress · Settings (`components/BottomNav.tsx`) | partial | S | O | iOS: Training · History · Progress. No Library, no Settings, no center quick-action button. |
| Quick actions sheet (continue program / freestyle) | `components/QuickActionSheet.tsx` | partial | S | O | iOS has "Start workout" on Up Next and "Ad-hoc workout" on Training; no global start button. |
| Contextual admin messages on Training | `StrengthWeekView.tsx`, `/api/messages` | not planned | – | C | Server-authored content. |
| Feedback button | `FeedbackButton.tsx` | not planned | – | C | Server inbox. A `mailto:` link would be S if wanted. |
| PWA install / offline page (`app/~offline`, `app/sw.ts`) | yes | not planned | – | C | Native app replaces it. |

### Training home (`app/(app)/training/page.tsx`)

| Feature | Web | iOS | Size | Src | Notes |
|---|---|---|---|---|---|
| Up Next card + Start | yes | have | – | O | Same structure and content. |
| Active Program tab (week list) | yes | have | – | O | iOS shows "Week 1 of 2" day list on home; web puts it behind a tab. |
| Pinned workouts tab, one-tap Start | yes | missing | M | O | Needs saved-workout screens first (Library row). |
| Recent tab with **Repeat** | yes | partial | S | O | iOS has History (own tab), read-only detail, no Repeat. |
| "From your coach" suggestions block | `TrainingHome.tsx` | not planned | – | C | Depends on server proposals; see "Local-only" below. |
| Beginner primer, warm-up interstitial | `components/features/training/` | missing | M | C | Onboarding helpers; low priority for Dustin. |

### Workout logging (`ExerciseLoggingModal.tsx`, `components/workout-logging/`, `components/adhoc/`)

| Feature | Web | iOS | Size | Src | Notes |
|---|---|---|---|---|---|
| Log weight × reps per set | yes | have | – | O | Web: one exercise at a time, reps stepper, keypad. iOS: all exercises on one scroll, text fields + Log. |
| Plan chips (prescribed sets) | "Prescribed: 5 reps @ 165lbs", set list | have | – | O | iOS shows plan chips with tick on done (`ios-workout.png`). |
| Prefill next set | yes | have | – | C | `WorkoutView.swift:342` prefills from this session, then last time. |
| **"Last time" line** (tap to prefill) and per-set "last:" | `LastSessionReference.tsx` | missing | S | O | Visible on web logger; nothing on iOS. |
| **Rest timer** (survives backgrounding) | `useRestTimer.ts`, `RestStopwatch.tsx` | missing | S | O/C | No timer code in `ios/App`. Native could add a local notification. |
| Workout elapsed timer | `useWorkoutTimer.ts` | partial | S | O | iOS shows "Started 5:54 PM", no running clock. |
| **Effort entry (RPE/RIR)** | `IntensitySelector.tsx`, gated by setting | missing | S | O/C | iOS displays imported RPE/RIR but can't log it; Progress "Effort" stays "–". |
| Warm-up flag on logged sets | yes | partial | S | C | iOS plans can mark warm-up sets; logging can't. |
| Exercise notes tab | `ExerciseDisplayTabs.tsx` | missing | S | C | Schema has notes (imported), no UI. |
| **Info tab (photos, instructions)** | `ExerciseInfoContent.tsx` | missing | S | O | iOS has photos only in the picker. |
| **History tab (recent sessions, e1RM, PR)** | `ExerciseHistoryPanel.tsx` | missing | S–M | O | Data exists (lift page computes it); needs a sheet in the logger. |
| Supersets | yes | have | – | O | iOS: "Superset A" label and a Superset button in ad-hoc. |
| Add exercise mid-workout | yes | have | – | O | |
| Swap / edit / delete exercise with "this workout or program" scope | `components/workout-logging/wizards/` | partial | M | C | iOS: remove exercise (···) only; no swap, no scope choice. |
| Edit plan during session | `WorkoutPlanEditor.tsx` | missing | M | C | |
| Follow-along mode | `FollowAlongHeader.tsx`, setting | missing | M | C | Dustin uses Log Sets; low priority. |
| Finish confirm | `CompleteWorkoutConfirm` | partial | S | C | iOS finishes on one tap (`WorkoutView.swift:58`); it only blocks finishing with no sets (line 107). Accidental finish risk from review 155 remains. |
| **Post-workout rollup** (volume, vs last, session rating, save to repeat) | `WorkoutRollupModal.tsx`, `PostSessionFeedback.tsx` | missing | M | C | iOS goes straight back to Training. |
| Draft recovery / one open workout | yes (one per workout) | have | – | O | iOS: one at a time, Resume or Discard (deliberate call). |
| Units | from settings (`defaultWeightUnit`, control hidden) | partial | – | O | iOS per-set lbs/kg toggle, by design (handoff call 2). |

### Exercise picker (`components/exercise-selection/`, `ExerciseSearchModal.tsx`)

| Feature | Web | iOS | Size | Src | Notes |
|---|---|---|---|---|---|
| Search by name | yes | have | – | O | |
| Photos in the list | no (photos only in Info tab) | have | – | O | iOS is ahead here. |
| Muscle group and equipment filters | yes | missing | S | O | |
| Multi-select ("pick one or more") | yes | missing | S | O | iOS adds one at a time. |
| **Create custom exercise** | `ExerciseDefinitionEditorModal.tsx` | missing | M | O | iOS imports custom exercises but can't make one. |
| Sort: A–Z / Neglected / Recovery, Anchors view | `ExerciseSearchInterface.tsx` | missing | M | C | Only shown where that data is passed (not seen in the freestyle picker). Depends on balance/anchors. |
| Equipment availability filter | `lib/equipment-availability.ts` | missing | M | C | Needs Settings › Equipment first. |

### Programs (`app/(app)/programs/**`, `app/(app)/library/programs/[id]`)

| Feature | Web | iOS | Size | Src | Notes |
|---|---|---|---|---|---|
| Program list, active badge | yes | have | – | O | |
| Program detail by week, start a day | yes (week arrows) | have | – | O | iOS: week chips, all exercises inline (denser, more useful than web's day list). |
| Builder (new) | yes | have | – | O | |
| Edit existing program | yes | partial | M | O | Per week only (handoff call 6). |
| Duplicate / delete / archive / restart / complete | yes | partial | S | C | iOS has archive and restart only (`ProgramViews.swift:39,111`); no duplicate or delete. |
| Skip day / Complete week | yes (`web-program.png`) | missing | S | O | |
| Transform week | `TransformWeekModal.tsx` | missing | M | C | |
| FAU volume chart in builder | `FAUVolumeVisualization.tsx` | missing | M | C | Needs FAU mapping (catalog has it). |
| Program limit (MAX_PROGRAMS) | yes | not planned | – | C | Business rule, irrelevant on a personal phone. |
| Recent history on program page | yes | missing | S | O | |

### Library: saved workouts and browse (`app/(app)/library`, `app/(app)/workouts/saved`)

| Feature | Web | iOS | Size | Src | Notes |
|---|---|---|---|---|---|
| Saved workouts list (New/Pinned/Recent/Older/Archived), pin, rename, archive, delete | `SavedWorkoutsList.tsx` | missing | M | O | Imported saved workouts are stored but invisible. `/workouts/saved` now redirects to Library › Workouts. |
| Save a finished workout | via rollup | missing | S | C | Comes with the rollup. |
| Start a saved workout | yes | missing | S | C | |
| Browse curated/community programs + clone | `CommunityProgramsView.tsx`, clone worker | missing | M | O | 10 programs at `web-community.png`. Curated ones could be bundled as JSON (scoping slice 5). |

### Progress (`app/(app)/progress/**`)

| Feature | Web | iOS | Size | Src | Notes |
|---|---|---|---|---|---|
| Weekly report card (workouts, sets, time, effort, streak) | yes | have | – | O | Numbers match per slice 4 review. |
| Week navigator | yes | have | – | O | |
| "Week 2 of <program>" line | yes | missing | S | O | Deferred in slice 4. |
| Records / Lifts folder tabs | yes | partial | S | O | iOS: Records + Pinned lifts lists, no "all lifts" tab. |
| Weekly sets chart | `WeeklySetsChart.tsx` | have | – | C | `ProgressTabView.swift:171`. |
| Pins editor | yes | have | – | O | |
| Lift page: e1RM chart, ranges, records, sessions | yes | have | – | O | |
| Lift page: **Top set / Volume tabs**, bodyweight Reps view, pinned-lift chips | yes | missing | S | O | Deferred in slice 4. |
| Cardio minutes on report | "+ N cardio" | partial | S | C | iOS computes cardio in `Progress.swift` but can't log cardio. |

### Settings (`app/(app)/settings/**`)

| Feature | Web | iOS | Size | Src | Notes |
|---|---|---|---|---|---|
| Settings screen at all | yes | **missing** | S | O | iOS has only the Progress unit/target sheet. |
| Theme picker (13 themes × light/dark) | `lib/theme.ts`, `ThemePicker.tsx` | partial | M | O | iOS: RIPIT only, follows system light/dark (`ios/App/Theme.swift`). |
| Mode light/dark, E-ink display toggle | yes | partial | S | O | iOS follows the system; no e-ink mode. |
| Workout mode, intensity tracking, default RPE/RIR, weekly target | `WorkoutsBlock.tsx` | partial | S | O | Weekly target exists in iOS Progress sheet; rest missing. |
| Equipment checklist | `settings/equipment` | missing | M | O | Only matters once the picker filters by it. |
| Muscle balance targets (FAU) | `settings/muscle-balance`, `lib/muscle-balance.ts` | missing | M | O | |
| Target movements (anchors) | `settings/target-movements` | missing | M | O | Feeds the picker's Anchors view. |
| Account, password, sign out, connected accounts | `AccountBlock.tsx` | not planned | – | O | No account on a local-only phone. |
| Help: Learn link, feedback, tip link | `HelpBlock.tsx` | missing | S | O | Links only. |
| Data export ("Download my data") | on `feature/data-export` only | partial | M | C | iOS imports; it has **no export** of its own yet (scoping slice 4's "raw export for agents" wasn't built). |

### Learn, onboarding, social, agents

| Route / feature | Web | iOS | Size | Src | Notes |
|---|---|---|---|---|---|
| `learn`, `learn/[slug]`, `learn/collections/[id]` | DB-backed articles + collections | missing | M | O | Could be bundled snapshot or a link to ripit.fit. |
| `welcome`, `onboarding`, `goals-wizard`, `complete-profile` | yes | not planned (for now) | M | O | Single user who already trains; revisit if the app goes public. |
| `login`, `signup`, `forgot-password`, `reset-password`, `waiver`, `go/[gymSlug]`, `/` landing | yes | not planned | – | C | Account/server flows. |
| `community` | redirects to Library › Browse | see Library | – | O | |
| `settings/coaching`, `coach/invite/[token]`, send to trainee | yes | not planned | – | O | Multi-user. See below. |
| `suggestions`, `suggestions/[id]` | proposals review | not planned (now) | – | O | Empty locally. See MCP below. |
| `settings/agent-access` (tokens, MCP URL) | yes | not planned (now) | – | O | See MCP below. |
| `admin/**` (19 pages: articles, collections, community programs, exercises, feedback, messages, proposals, signups, tags, tuning, analytics, agent tokens) | admin only | not planned | – | C | Operator CMS; stays web. |
| `dev/mobile-spike`, `dev/theme-validator` | dev pages | not planned | – | C | Dev tools. |
| `training/adhoc/[completionId]` | freestyle logger | have | – | O | iOS ad-hoc workout. |

Every `page.tsx` under `app/` (60) appears above, grouped where they share a fate.

## Look and feel (from the paired screenshots)

- **Theme colors match.** iOS uses the RIPIT tokens (cream background, brown folder tabs, green primary), light and dark.
- **Typography is the biggest visual difference.** Web uses the uppercase display font with letter spacing on every label and button (`START WORKOUT`, `BARBELL BENCH PRESS`); iOS uses SF in mixed case except the big page title. iOS reads as "a generic iOS app in Ripit colors".
- **Corners and depth.** Web: square corners, hard offset shadows on primary buttons, bordered folder panels. iOS: rounded corners (cards, buttons, tab chips), flat buttons, and Apple's floating Liquid Glass tab bar.
- **Folder blocks.** Both use folder tabs. Web's tabbed folders (Pinned | Recent, Up Next | Active Program, Records | Lifts, Log | Info | History) switch content in place; iOS folders are labels only, never tabs, so everything stacks and pages get long (Progress scrolls under the tab bar).
- **Density.** iOS logger shows all exercises at once (good overview, more scrolling); web shows one exercise with big controls and a fixed LOG SET bar. The web's fixed bottom action is easier mid-set.
- **Touch targets.** Web uses 48px buttons and a big reps stepper; iOS Log/unit/field controls look about 40pt tall, the "···" exercise menu and ✕ set delete are small.
- **iOS is ahead on:** photos in the picker list, program detail showing every exercise, native feel of sheets.

## Things that can't work on a local-only phone

| Feature | Why | Options | Recommendation |
|---|---|---|---|
| **MCP / agent suggestions** | `app/api/mcp/route.ts` reads Postgres; phone data is invisible to it. | (a) Phone exports raw data (JSON/CSV) that an agent reads; proposals come back as a file the phone imports and you approve on the phone. (b) Sync phone → server so existing MCP + Suggestions work. (c) Leave out. | (a): matches "raw exports over server analysis", no auth/sync work. Needs the iOS export first. |
| **Coaching** | Two users, invite links, server delivery. | (a) Coach sends a program file; phone imports it (reuses import). (b) Sync. (c) Leave out. | (c) for now; (a) is cheap later if a coach uses it. |
| **Community browse/clone/publish** | Programs published by other users, server clone worker. | (a) Bundle curated programs as JSON and refresh with app updates; (b) fetch a read-only public list from ripit.fit; (c) leave out. Publishing stays web. | (a) for browse; it was already in scoping slice 5. |
| **Learn articles** | DB-backed CMS. | Bundle a snapshot; link to ripit.fit/learn; leave out. | Link out (S) now. |
| **Account, auth, waiver, feedback, admin messages, admin CMS** | Server identity and operator content. | Leave out. | Leave out. |

## Proposed next slices (ranked)

1. **Logger essentials** (M): rest timer, "Last time" line, RPE/RIR entry, exercise notes, and an Info + History sheet per exercise. *Why:* this is where Dustin spends his time in a session, and it's the clearest "basic" feeling; data for history already exists in `RipitCore`. Port from `components/workout-logging/LastSessionReference.tsx`, `hooks/useRestTimer.ts`, `components/workout-logging/RestStopwatch.tsx`, `components/workout-logging/inputs/IntensitySelector.tsx`, `components/workout-logging/ExerciseHistoryPanel.tsx`, `components/workout-logging/ExerciseInfoContent.tsx`.
2. **Finish summary + saved workouts** (M): post-workout rollup with "save to repeat", Library › Workouts list (pin, rename, archive), start a saved workout, Pinned/Recent-with-Repeat on Training. *Why:* imported saved workouts are already in the database but can't be seen, and repeat/pinned is the web's fastest way to start. Port from `components/features/training/WorkoutRollupModal.tsx`, `components/features/saved-workouts/`, `components/training/TrainingHome.tsx`.
3. **Settings + look pass** (M): a Settings tab (theme picker with a few themes incl. e-ink, mode, intensity default, weekly target, Learn/help links), and a typography/corner pass to match web (display font, uppercase labels, square corners, folder tabs that switch). *Why:* the look is the first thing Dustin notices, and there's nowhere to put new preferences yet. Port from `components/settings/*Block.tsx`, `components/settings/ThemePicker.tsx`, `lib/theme.ts`, `app/globals.css`.
4. **Picker and custom exercises** (S–M): muscle/equipment filters, multi-select, create custom exercise. *Why:* without custom exercises any lift outside the 312 is impossible on the phone. Port from `components/exercise-selection/ExerciseSearchInterface.tsx`, `FilterChoiceSheet.tsx`, `components/features/exercise-definition/ExerciseDefinitionEditorModal.tsx`.
5. **Raw export + agent round-trip** (M): "Export my data" on iOS (same v1 JSON the web produces) plus importing a proposals file to review. *Why:* the only path for agents once Dustin trains on the phone, and a safety backup for local-only data. Port from `feature/data-export` (web export route), `lib/mcp/tools.ts` read shapes, `components/suggestions/SuggestionReview.tsx`.
6. **Progress and program finish-off** (S): Top set/Volume tabs, "Week N of program", Lifts tab, skip day/complete week, program recent history. *Why:* small deferred items from slices 3–4. Port from `components/features/progress/LiftView.tsx`, `RecordsLifts.tsx`, `components/StrengthWeekView.tsx`.

Later: balance/FAU + target movements + equipment (they mostly feed picker smarts), browse bundled curated programs, cardio logging (web has no cardio logger UI either, only the "+ N cardio" label), follow-along mode.

## Risks

- **Two data sets.** Web shots use the local seeded user (program "Dev 4-Week Strength"); iOS shots use the fixture or demo data. Layout comparisons hold; numbers don't match between pairs.
- **Code-only rows (C)** came from file names and headers via subagents; a few should be confirmed by tap before slicing.
- **`dev.sh` blocked:** slot 1's socket `/tmp/fitcsv-overmind-wt1.sock` is held by worktree1's overmind (since 11:46, no app listening), the same block work item 155 hit. Not touched.
