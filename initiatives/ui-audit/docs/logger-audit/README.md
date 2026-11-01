# Logger audit: the workout screen and its modals

2026-11-01 · item 081 · read-only. The app ran from worktree1 (detached at `origin/feature/ui-settings`, `4ec28738`) on port 3100 against its own Postgres (`fitcsv-postgres-wt1`). Logged in as `dmays@test.com`.

**What was run:** a program day (Lower A), freestyle from Quick actions, a saved workout started from its detail dialog, and follow-along mode. I logged sets, opened every drawer, menu and confirm, then discarded each session.

**Data:** I dumped the DB first and restored it at the end. All 39 table counts match the starting counts, and `loggingMode` is back to `full`. The server and Postgres are stopped, and there are no code changes (`git status` is clean).

**Screenshots:** `screens/`, at 390 × 844, touch-emulated, every one in light and dark (`-light.png` / `-dark.png`). I used Playwright, because the Chrome extension can't emulate touch at phone width.

**Ideas:** `ideas/` holds three HTML pages (`bottom-bar.html`, `tab-bar.html`, `plan-drawer.html`) and a PNG of each frame. Each page has 3–4 frames and uses the app's ripit tokens and the Rajdhani font. Open a page with `?mode=dark` to see dark. The pages load Tailwind and the font from CDNs.

## The short version

The logger is where most of the app's older look is left. The rest of the app is flat paper tabs, bordered boxes and plain rows. The logger still uses bevels drawn with fixed `rgba()` shadows, recessed wells, L-bracket `doom-corners`, Radix underline tabs, and six hand-rolled confirm boxes. That is why it reads flat and dated next to Training. Most of the fixes are restyles. One is a behaviour bug: the bottom bar disappears after the last prescribed set.

Top 5:
1. **The bottom bar disappears after the last prescribed set.** Prev and next go with it, and the next step moves into a green box in the content (`29-all-sets-logged`). Priority P1.
2. **The plan drawer only lists names**, often cut off: no set progress, no done state, and three overlapping "current" cues (`24-plan-drawer`). Priority P1.
3. **Six confirm dialogs, each built by hand.** None is a real dialog: no `role="dialog"`, no focus trap, and Escape doesn't close them (checked on the delete-exercise confirm). All use the banned `doom-corners`. Priority P1, shared fix.
4. **The tab bar is the last Radix underline strip in the app.** Its "has content" marks are unlabelled 8 px squares (`12-tabbar`). Priority P1.
5. **About 35 fixed `rgba()` shadows and colours** across the header, bottom bar and plan drawer. They are the "aged" bevel look, and they don't follow theme tokens. Priority P1, shared fix.

## Shared fixes (do these first)

| # | What | Where | Fix (folder style) | Size | Pri |
|---|---|---|---|---|---|
| S1 | Six one-off confirms: complete, exit, delete set, delete exercise, switch to logging, ad-hoc complete. Each is a plain `div` with `doom-corners`. They differ in icon size, border colour (border, error, warning) and button style. None has dialog semantics, a focus trap or Escape handling. | `CompleteWorkoutConfirm.tsx:15-52`, `ExitWorkoutConfirm.tsx:35-106`, `DeleteSetConfirm.tsx:12-44`, `ExerciseQuickActionsMenu.tsx:115-156`, `FollowAlongHeader.tsx:113-140`, `adhoc/AdHocLoggerView.tsx:902` | One `LoggerConfirm` on Radix AlertDialog (`components/ui/radix/alert-dialog.tsx`). A `PaperTabTitle` carries the title (tone `mine`, or `quiet` for destructive), sitting on a folder box with a one-line body. Buttons: outline Cancel and one filled action (`bg-error` only for destructive). No warning triangle, no corners. | M | P1 |
| S2 | Bevels drawn with fixed shadows (`inset 0 1px 0 rgba(255,255,255,.25)`, `rgba(0,0,0,.35)` wells, `0 2px 0 rgba(58,40,23,.18)`) and colours (`rgba(16,185,129,.14)`, `rgba(254,243,199,.06)`). Counts: header 11, plan editor + row 10, bottom bar 5, follow-along header 3. | `ExerciseLoggingHeader.tsx:35-41,87-90,101-104,134-147`, `ExerciseActionsFooter.tsx:5-6,43-46`, `WorkoutPlanEditor.tsx:173-195,227-230`, `WorkoutPlanEditorRow.tsx:70,79-83,130` | Replace with tokens and borders: `border-2 border-border` outline buttons, and a `0 3px 0 var(--primary-active)` press edge on filled buttons only. That edge is what Training's Start Workout already uses. | S–M | P1 |
| S3 | Menus use `doom-corners`, a green border and a mint heading wash. | `ExerciseQuickActionsMenu.tsx:74-81` | `bg-card border-2 border-secondary`, the heading as a plain muted row, and `divide-y` items. Same treatment in the plan-row menu. | S | P2 |
| S4 | Four button systems on one screen: `Button doom` (3D), inline `RAISED_SHADOW`, `button-stamped`, and `rare-rounded` (gold, rounded). | `FollowAlongFooter.tsx:34-67`, `ExerciseActionsFooter.tsx:61-81`, `inputs/RepsStepper.tsx:66-105`, `SetLoggingForm.tsx:110-126` | Two kinds only: filled (primary or accent, with the press edge) and outline (`border-2 border-border`, like Training's Repeat). Keep the stamped steppers. They are inputs, not actions, and they read well. | M | P2 |
| S5 | The two loggers use different surfaces: the program logger is `bg-card`, ad-hoc is `bg-background`. | `ExerciseLoggingModal.tsx:678`, `adhoc/AdHocLoggerView.tsx:742` | Pick one (`bg-background`, so folder boxes sit on it like on Training). | S | P2 |

## Findings by area

### Plan drawer (`24`, `25`): "shows some age and wear"

| What | Where | Fix | Size | Pri |
|---|---|---|---|---|
| Rows show only the exercise name: no sets done or planned, no weight, no done state. The drawer can't answer "where am I in this workout?" | `WorkoutPlanEditorRow.tsx:88-103` | Each row gets a status square (✓ done, number for upcoming, filled number for now). Below the name, a sub-line with set squares and `2 of 4 sets · 50 lbs`. | M | P1 |
| Names cut off ("DUMBBELL ROMANIAN …"). Uppercase bold with wide tracking, plus a chevron, a 44 px grip and a 44 px gear, leave about 200 px. | `WorkoutPlanEditorRow.tsx:94-101` | Normal-case bold name that wraps to two lines, and no chevron (the whole row jumps). | S | P1 |
| Three cues for the current row: L-brackets (`doom-corners`), a mint wash and a 6 px brown stripe. | `WorkoutPlanEditorRow.tsx:59,124-138` | One cue: an inset primary left bar plus a filled `NOW` chip. | S | P2 |
| Each row is its own bordered card with a drop shadow, plus a shaded grip well. | `WorkoutPlanEditorRow.tsx:55-84` | Plain `divide-y` rows inside one folder box. | S | P2 |
| The header is the brown toolbar with hint text ("Drag to reorder · tap name to jump"), not a paper tab. | `WorkoutPlanEditor.tsx:170-202` | `PaperTabTitle` (tone `mine`, list icon), with a count chip `2/6` and a square close box, as in Quick actions (`QuickActionSheet.tsx:292-304`). | S | P2 |
| Drag grips are always shown, though reordering is rare. | `WorkoutPlanEditorRow.tsx:72-86` | A `Reorder` button switches the grips on. Rows stay calm by default. | M | P3 |
| On a phone the button that opens it is an unlabelled hamburger plus an LED bar; the "Plan" label is `hidden sm:inline`. | `ExerciseLoggingHeader.tsx:81-114` | Show `PLAN 2/6` at every width. | S | P2 |
| It slides in from the left at 88vw, leaving a strip of blurred logger; the app's other sheet (Quick actions) comes from the bottom. | `WorkoutPlanEditor.tsx:108-123` | A folder bottom sheet (direction A below). | M | P3 |

### Tab bar (`12-tabbar`): "could look more modern"

| What | Where | Fix | Size | Pri |
|---|---|---|---|---|
| The tabs are generic Radix underline tabs on a `bg-muted` band: primary text with a 2 px `primary/50` underline. They are the only underline tabs left in the app. | `ExerciseDisplayTabs.tsx:155-175`, `ui/radix/tabs.tsx:14,26` | `PaperTabs` (tone `mine`) over a `border-2 border-secondary` folder box that holds the exercise. Shorten "Log Sets" to "Log". Four tabs fit at 390 px. | M | P1 |
| "Has notes" and "has history" are 8 px primary squares at the top-right of the tab, with no text for screen readers. They look like a stray pixel. | `ExerciseDisplayTabs.tsx:166,172` | Count chips with `countLabel` (`NOTES 1`, `HISTORY 3`), as PaperTabs already supports. | S | P2 |
| About 150 px of chrome sits above the first input: a 48–56 px tab band at `text-base sm:text-lg`, then the banner. | `ui/radix/tabs.tsx:14,26` | 13–14 px paper tabs (about 36 px). | S | P2 |
| Info, Notes and History each repeat the exercise name as a new block with a `doom-heading` text shadow. | `ExerciseDisplayTabs.tsx:88-102,220,229,242` | Keep the name once, in the box under the tabs. | S | P3 |

### Bottom bar (`13`, `29`, `31`, `41`): "more modern and sleeker"

| What | Where | Fix | Size | Pri |
|---|---|---|---|---|
| **It disappears after the last prescribed set.** `showLogSet` is false, so the component returns `null`, and prev and next disappear with it. Next steps move into a green box in the content. | `ExerciseActionsFooter.tsx:36-38`, `SetLoggingForm.tsx:102-130` | The bar stays and changes to `[‹] [+ Extra set] [Next exercise ›]`. Drop the in-content box. | M | P1 |
| A brown band with recessed nav wells and a raised gold LOG SET: the bevelled "game controller" look. | `ExerciseActionsFooter.tsx:5-6,41-94` | A flat `bg-card` bar with `border-t-2 border-secondary`, outline nav squares, and a filled accent LOG SET with the press edge. | S | P1 |
| LOG SET says only "LOG SET 4"; you look up to check what you're saving. | `ExerciseActionsFooter.tsx:68` | Add a second line: `8 reps × 135 lbs`. | S | P2 |
| Disabled prev and next are `opacity-50` on brown, so they look broken rather than off. | `ExerciseActionsFooter.tsx:53,89` | Outline style with muted text when disabled. | S | P2 |
| There are three bar designs. Program: brown with wells. Follow-along: a pale tan prev square plus a rounded gold `rare-rounded` NEXT EXERCISE. Freestyle with no exercises: a full-width green Add Exercise. | `FollowAlongFooter.tsx:27-68`, `adhoc/AdHocLoggerView.tsx:836-857` | One `LoggerBottomBar` with slots for the left, main and right buttons. | M | P2 |
| After the last set the banner reads "SET 8" (one past the plan) instead of "7 of 7 done". | `ExerciseLoggingModal.tsx:207,227`, `DrawerContextBanner.tsx:45-46` | When all sets are logged, show `7 of 7 done`. | S | P2 |

### Modals and other dialogs

| What | Where | Fix | Size | Pri |
|---|---|---|---|---|
| Complete (`27`, `35`): a small card asking "Complete this workout?" with no summary. | `CompleteWorkoutConfirm.tsx` | Use S1, and add `18 sets · 42 min` so the user sees what they are saving. | S | P2 |
| Exit (`28`, `36`, `46`): a warning border, a 56 px triangle, and three stacked full-width buttons. "Discard all" is a filled red button as heavy as "Save as draft". | `ExitWorkoutConfirm.tsx` | Use S1. "Save as draft" filled, "Discard" as outline with error text, and Cancel as the close box. | S | P2 |
| Delete set (`23`) only appears for the last remaining set; every other delete is instant with no undo. "Delete Last Set?" can be read as "the latest set". | `ExerciseLoggingModal.tsx:612-624`, `DeleteSetConfirm.tsx:19` | Delete instantly everywhere and show an undo toast, or retitle to "Delete the only set?". | S | P2 |
| Exercise actions (`21`, `22`): the menu has corners and a green frame. The delete confirm is titled "Confirm action" and ignores Escape. | `ExerciseQuickActionsMenu.tsx` | Use S3 for the menu and S1 for the confirm, titled "Delete Barbell Squat?". | S | P2 |
| Rest stopwatch (`15`): placement and size are good. The dismiss X is 14 px with `p-1` (about 22 px to tap). | `RestStopwatch.tsx:53-60` | Make the tap target 44–48 px. | S | P2 |
| Add-exercise wizard (`26`) and the freestyle picker (`42`, `43`) do the same job in two different looks. Full-bleed green header, "1/4" step pill, mixed-case "Filter by Muscle Group:" labels, and a mixed-case "Cancel / + Create New Exercise / Add all (3)" footer. | `wizards/AddExerciseWizard.tsx`, `ui/radix/wizard-dialog.tsx:120`, `adhoc/AdHocExercisePickerModal.tsx:147-157` | Later: one picker, with a folder title and plain rows. | L | P3 |
| Saved workout detail and "Start this workout" (`51`, `52`) are already folder style from UI3. Small tweak: the notes box (`bg-muted border-2`) is heavier than the rows. | `SavedWorkoutDetailDialog.tsx:147` | Use a `border-l-4` quiet note, as in `LastSessionReference`. | S | P3 |
| Starting a saved workout opens a freestyle logger with an empty set list. The saved plan (4 × 5 @ RIR 2) isn't shown while logging (`53`). This is behaviour, not styling. | `adhoc/AdHocLoggerView.tsx:766` (`prescribedSets={[]}`) | Show the template sets as planned rows. Flag for the lead. | M | P2 |
| Completion failure uses a native `alert()`. | `ExerciseLoggingModal.tsx:578,598` | Use a toast. | S | P3 |
| "First time logging this – see Info tab for guidance" stays after sets are logged in this session (`16`, `29`). | `LastSessionReference.tsx:88-95` | Hide it once a set is logged. | S | P3 |

Not diagnosed: on Copenhagen Plank (prescribed reps "30s/side") LOG SET stayed disabled after I entered a weight. That may be my script; worth a manual check.

## Ideas: one recommendation per area

**Bottom bar → A, "Flat folder bar"** (`ideas/bb-a-*.png`, and `bb-a-done-*.png` for after the last set)
- A card-coloured bar with a brown top rule, outline square prev and next, and gold LOG SET with a `8 reps × 135 lbs` second line.
- After the last set it becomes `[‹] [+ Extra set] [Next exercise ›]` and never disappears.
- B (a progress strip with set squares and "Next: …") is good too. Its strip could join A later.
- C keeps the brown band and only flattens it. Least change, least gain.

**Tab bar → A, "Paper tabs over a folder box"** (`ideas/tb-a-*.png`)
- Brown `mine` paper tabs `LOG · INFO · NOTES 1 · HISTORY 3` over a `border-secondary` box holding the exercise. This is the same grammar as Training and Library, built from `PaperTabs`.
- B (filled chips under the name) and C (name first, slim underline tabs) are lighter. Neither ties the screen to the folder look.

**Plan drawer → A, "Folder bottom sheet"** (`ideas/pd-a-*.png`)
- Built like Quick actions: a `WORKOUT PLAN 2/6` paper tab with a close box, a one-line summary (`9 of 23 sets · 24:10`), and plain rows with a status square, wrapped name, set squares, `2 of 4 sets · 50 lbs`, and a `NOW` chip.
- Footer: `Reorder` (turns grips on) and `+ Add exercise`.
- B (left drawer with Up next / Done sections) suits long workouts and could come later.
- C (timeline, with swap and remove on the current step) is the most novel but furthest from the app.

## Proposed build items

1. **L1, shared logger pieces (M).** S1 `LoggerConfirm`, replacing the six confirms; S3 menu style; S2 token clean-up in the header; S5 one surface. Fixes the dialog accessibility on the way.
2. **L2, bottom bar (M).** One `LoggerBottomBar` for program, follow-along and freestyle, in direction A. It stays after the last set, shows the set summary line, and gets proper disabled states and the "7 of 7 done" label. Retires `SetLoggingForm`'s in-content "All prescribed sets logged" box.
3. **L3, tabs and plan sheet (M–L; split in two if it runs long).** Paper tabs over a folder box with count chips (tab-bar A). The plan drawer becomes a folder bottom sheet with progress rows, a `NOW` chip, a reorder mode and a labelled `PLAN 2/6` opener (plan-drawer A).
4. **L4, later (L).** One exercise picker in the folder style, replacing the wizard and the freestyle picker. Show a saved workout's template sets in the freestyle logger.

## Files

- `screens/00` Training · `10–29` program logger (full mode) · `30–36` follow-along · `40–46` Quick actions and freestyle · `50–53` Library, saved workout detail and start.
- `ideas/*.html` mockups; `ideas/{bb,tb,pd}-*-{light,dark}.png` frame shots.
