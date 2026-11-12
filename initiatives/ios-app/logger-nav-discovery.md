# Scoping note: web logger and navigation shell, for iOS slice 9

Date: 2026-11-10 · Author: parity-disco (work item 196) · Request: map exactly how the web's workout logger, bottom nav and quick actions work, so the phone can be made to match them.

## Summary
The web logger is simpler than the brief assumed. It shows one exercise per screen. You move with a basic swipe or with the ‹ › buttons in a fixed bottom bar. It has no auto-advance, no superset rotation and no haptics. A "PLAN n/N" button opens a sheet where you can jump to, reorder, swap, delete and add exercises.

The web nav is a custom 4 + 1 bar: four tabs, plus a raised **WORKOUT** chip in the middle that opens Quick Actions. The web has **no History tab**.

The iOS app today shows every exercise on one long scroll, inside a full-screen cover, under Apple's tab bar, and it has a History tab. I propose two slices: **9a, the shell** (custom bar, quick actions, tab contents) and **9b, the logger** (one exercise per screen, bottom bar, plan sheet). Both are M–L. 9b is the larger one.

Screenshots are in `initiatives/ios-app/handoff/slice9-assets/`. `web-*` are the local web at 390 px, `ios-*` are simulator `ripit-review`, and `pairs-*` are side-by-side sheets.

## Constraints
- No code changes in this item. Staging is read-only (work item 196).
- The phone is local-only, with one open workout at a time (`PendingStart.swift`, decided earlier). The web uses the server and returns 409 to block a second workout. The phone keeps its own "Resume or discard and start" dialog.
- Effort, warm-ups, Last time, Info/Notes/History, the summary and the picker came in slices 5–8. They must survive the redesign (`parity-inventory.md`, Workout logging).
- Every fixed bottom bar uses `View.bottomBar` (`ios/App/Theme.swift:364-382`, added by item 197). Its controls sit above the home indicator, and its background runs to the screen edge.

## What I found

Marks: **O** = I saw it hands-on, on the local web or the simulator. **C** = I read it in the code (file:line).

### 1. Logger (program and freestyle)

**Shared code.** Both loggers share one set of components.
- Program logger: `components/ExerciseLoggingModal.tsx`. It is a portal over the program page `/library/programs/<id>`, with no route of its own.
- Freestyle logger: `components/adhoc/AdHocLoggerView.tsx`, at route `/training/adhoc/<completionId>`.

**Layout** (O, C). The screen is a `100dvh` column.
- The header is fixed: `PLAN n/N` (opens the plan sheet) · elapsed clock · `FINISH` · ✕ (Exit) (`ExerciseLoggingHeader.tsx:75-116`).
- The middle is fixed paper tabs: **Log / Info / Notes** (Notes only when there are notes) **/ History** with a count. Each tab's panel scrolls on its own (`ExerciseDisplayTabs.tsx:158-213`).
- The bottom bar is fixed (`LoggerBottomBar.tsx`). It sits at z-50, above the nav's z-40, so the nav is covered while you log (C, `ExerciseLoggingModal.tsx:668`).
- Screenshots: `web-free-08-after-add.png`, `web-prog-01-logger.png`.

**Bottom bar.** These states are for the program logger. Freestyle differs as noted.

| State | ‹ | Main | › |
|---|---|---|---|
| Logging | disabled on the first exercise | **LOG SET**, second line "5 reps × 155 lbs" | disabled on the last exercise |
| All planned sets logged (program only) | ‹ | outline **+ EXTRA SET** | green **NEXT EXERCISE**, or **Finish** on the last exercise |
| Extra-sets mode | ‹ | LOG SET | labelled Next exercise, or Finish |
| Freestyle | ‹ | LOG SET (needs reps only; an empty weight saves as 0) | › (never offers Finish) |
| Freestyle with no exercises | – | a single **ADD EXERCISE** | – |
| Any keypad open | **the bar is hidden** | | |

- Program states: O (`web-prog-02-all-logged.png`). The bar flipped after the 4th of 4 sets ("BAR-after-log4" in my run). C at `ExerciseLoggingModal.tsx:811-851`.
- Freestyle states: O (`web-free-11-last.png`, `web-free-30-new-empty.png`).
- Keypad hides the bar: O (`web-free-14-keypad.png`). C at `ExerciseLoggingModal.tsx:810`.
- Disabled buttons keep their outline and fade the text, not the whole button (C).
- Only one Finish shows at a time. The header hides its FINISH when the bar offers one (`barOffersFinish`, C, `ExerciseLoggingModal.tsx:660`).

**Swipe** (O, C).
- It uses touchstart and touchend only (`hooks/useSwipeNavigation.ts`).
- It needs at least 50 px of horizontal movement, and is rejected when vertical ÷ horizontal is more than 0.75. Velocity is ignored. O: 200 px moved to the next exercise and 40 px did nothing.
- Nothing follows the finger. After a valid swipe, the content nudges 16 px and fades to 0.8 opacity over 150 ms. Then the exercise changes, with no slide-in.
- At the first or last exercise it does nothing.
- It is disabled while a keypad is open.
- No haptics anywhere (C: no `navigator.vibrate`).

**After LOG SET** (O, C).
- No auto-advance in either logger. O: after the 4th of 4 planned sets, it stayed on Bench.
- The weight is kept. Reps and RPE/RIR refill from the next planned set.
- A **RESTING m:ss** stopwatch appears inline in the set list. It counts up with no target, can be dismissed with ✕, and is not an overlay (`web-free-12-logged-rest.png`; `SetList.tsx:126-143`, `useRestTimer.ts`).

**Inputs.** The web has no system keyboard in the logger.
- Reps: a −/+ stepper whose readout opens a keypad.
- Weight: a custom keypad (1–9, CLR, 0, ⌫, Cancel, Done). The first key press replaces the value.
- RPE/RIR: a grid of presets.
- While a keypad is open it takes over the panel (O, `web-free-14-keypad.png`; C, `NumberKeypad.tsx`).

**Supersets on the web** (C).
- Stored as `Exercise.exerciseGroup` (a letter).
- Shown only as a "Superset A" badge on the Info, Notes and History tabs.
- Next and previous move strictly in list order. There is no A1→A2→A1 rotation (`useProgressiveExercises.ts:311-326`).
- The plan sheet has no superset brackets. Freestyle has no group field at all.

**Exit** (O).
- Nothing logged: "Nothing is logged yet, so there is nothing to save" with Cancel or **Exit**. Exit deletes the freestyle draft; afterwards `active-draft` was null.
- Otherwise: **Cancel / Discard / Save as draft** (`web-free-31-exit-empty.png`, `web-prog-07-exit.png`).

**Finish** (C).
- A "Complete this workout?" confirm, then the rollup.
- Freestyle blocks Finish with "Log a set first" and "Sets still saving".

### 2. Exercise list (the "Workout plan" sheet)
- **Opened by** `PLAN n/N`, top left. It is a bottom sheet: "WORKOUT PLAN", a `n/N` chip, and "4 of 17 sets · 00:09". Each row shows a number, the name, **NOW** on the current row, "x of N sets · last weight", and a done tick (O, `web-prog-03-plan.png`, `web-free-16-plan-4.png`).
- **Jump:** tap a row; the sheet closes (C, `WorkoutPlanEditor.tsx:203`).
- **Reorder:** tap **REORDER** to show drag handles ("Drag to reorder X"), then drag (`@dnd-kit`; on touch, a 180 ms press). O: I dragged Squat from 4th to 1st. The logger stayed on Squat and the chip changed 4/4 → 1/4, so the **current exercise is kept by id** (`web-free-17/18/19-*.png`).
  - Freestyle saves to `…/adhoc/{cid}/exercises/reorder` and shows a toast if that fails.
  - **Program reorder rewrites the program template's order**, and a failure is silent (C, `useWorkoutPlanSheet.ts:84-110`).
- **Row menu (⋯):** Swap exercise, Delete exercise.
  - Swap opens the picker with SELECT buttons and "Find a replacement for …". O: swap kept the row's position (`web-free-22-swap-search.png`, `web-prog-05-swap-scope.png`).
  - Program swap and delete go through wizards with a "this workout / future workouts" scope step (C).
  - Delete asks "Delete Barbell Curl? It will be removed from this workout." (O, `web-free-24-delete-confirm.png`). Delete is allowed even when the exercise has logged sets; those sets are removed too (C).
- **+ ADD EXERCISE** opens the multi-add picker. New exercises are appended, and the logger jumps to the first new one. O: it went to 2/4 after adding 3 (`web-free-06/07/08-*.png`).

### 3. Bottom nav (`components/BottomNav.tsx`)
- **Tabs:** Training (`Activity` icon) · Library (`LayoutGrid`) · **WORKOUT chip** · Progress (`TrendingUp`) · Settings (`Settings`). O: `web-tab-*.png`.
- **Active tab:** accent text colour only. No pill or underline. Active also covers sub-routes: Library includes `/programs/…` and `/library/programs/<id>`; Training includes `/suggestions` (C, `lib/nav/active-tab.ts`).
- **Bar:** a fixed 56 px row with a 2 px top border, `bg-muted/95` with blur.
  - Labels are 11 px, icons 20 px, targets at least 48×48.
  - Bottom padding is `env(safe-area-inset-bottom) + 2px`, so **the bar's background fills the home-indicator area**. It measured 60 px at 390×844 with no inset (O).
- **WORKOUT chip:** 64×52, lifted 4 px, an accent fill with a hard bottom edge (`0 5px 0 accent-hover`), and pressed 3 px down when tapped.
- **"Badge" for an open draft:** there is no number or dot. Instead:
  - a 2 s glow pulse in the warning colour, plus a shine sweep every 7 s (C, `globals.css:2165`, `:2671`);
  - its aria-label becomes "Resume draft workout: {name}" (O, `web-nav-draft-pulse.png` vs `web-nav-no-draft.png`).
- **Keyboard and logger:** the bar never hides itself. The logger covers it, and there is no keyboard handling (C).

### 4. Quick actions (`components/QuickActionSheet.tsx`)
**Look** (O, C).
- A floating folder card ("QUICK ACTIONS", ⚡), 64 px above the safe-area bottom, over a dim backdrop.
- It slides up in 200 ms and closes with ✕, a backdrop tap or Esc. There is no swipe-down.
- Each time it opens, it refetches the draft, the next program workout and the saved-workout count.

**With an open draft** (O, `web-quick-actions.png`, `web-qa-02-discard-armed.png`).
- One row: "FREESTYLE WORKOUT" (or the workout name), "In progress · tap to resume".
  - Freestyle goes to its logger.
  - A program workout goes to `/library/programs/<id>?resume=<workoutId>`.
- A trash button: the first tap arms **CONFIRM** in red; a second tap within 4 s discards.
- The footer reads "Continue or discard your draft to unlock other actions". Every other action is **hidden**.

**With no draft** (O, `web-qa-03-no-draft.png`).
1. **CONTINUE YOUR PROGRAM**, "Week 3 · Day 1 · Upper Body". Disabled with "No active program" when there is none. O: it opens the program page with the logger already open on exercise 1/5.
2. **FREESTYLE WORKOUT**, "Log sets as you go". O: an empty logger with "Pick your first exercise to start logging" and a single ADD EXERCISE bar (`web-free-30-new-empty.png`).
3. **MY SAVED WORKOUTS**, "1 saved". Shown only when the count is above 0. Goes to Library → Workouts.

A follow-along note step exists before Freestyle (C only; I didn't use that mode).

### 5. What each tab holds (O: `web-tab-*.png` and `ios-tab-*.png`)

| Tab | Web | iOS today |
|---|---|---|
| Training | Pinned / Recent (Repeat), Up next / Active program (START WORKOUT), suggestions | Same blocks, plus an In-progress folder (Resume/Discard), "Programs" and "Ad-hoc workout" buttons |
| Library | **Workouts \| Programs** (My Programs \| Browse), program detail with "Recent history" | Saved workouts only. Programs live under Training |
| (centre) | WORKOUT → Quick actions | – |
| History | **none.** History shows as Training → Recent and as Recent History on a program page | A **History tab** (resume card, list of finished workouts, import button) |
| Progress | Week report card, last 8 weeks, records/lifts | Same shape (slice 6) |
| Settings | Look, Workouts, Training targets, Account, Help, Admin | Look, Workouts, Training targets, Help (slice 7) |

### 6. iOS today (O: `ios-*.png`; C)
- Apple's `TabView` with five tabs: Training · Library · History · Progress · Settings (`RipitApp.swift:51-67`).
- The workout is a `.fullScreenCover` (`RipitApp.swift:86-94`). It is one long scroll of every exercise as folder cards, with inline LOG buttons per exercise and Finish/Discard at the bottom.
  - A per-exercise rest chip (`WorkoutView.swift:220`).
  - Supersets are grouped into one folder via a "Superset" toolbar button (freestyle only).
  - Remove is in the ··· menu.
  - There is no reorder and no swap. A horizontal swipe does nothing (O, `ios-logger-program-swipeleft.png`).
- The logger uses the system decimal keyboard. The scroll dismisses it interactively (`ios-logger-keyboard.png`).
- The ⌄ button's accessibility label still says "Back to history" (`WorkoutView.swift:86`).
- After the summary sheet, the app jumps to `tab = 3`, which is Library (`RipitApp.swift:99`).

### 7. Bottom bars and the home-indicator area (lead's addendum)
- **Web:** both bars pad by `env(safe-area-inset-bottom)` with their background behind it, so nothing shows through under the controls.
- **iOS picker:** before 197, rows scrolled visibly beneath the Create/Add bar, in the home-indicator strip (`ios-picker-bottom-pre197.png`). After 197 the strip is filled (`ios-picker-bottom.png`, `pairs-keyboard-bottom.png`, panels 3–4).
- **For slice 9, use the same `bottomBar` modifier for both new bars:**
  - **Custom tab bar:** attach it with `bottomBar` (or the same `safeAreaInset` and `ignoresSafeArea(edges: .bottom)` background) on the root, outside the per-tab `NavigationStack`s. Each tab's scroll view then insets its content automatically, the bar's background fills the home-indicator strip, and the controls (a 56 pt row) sit above it.
  - **Logger ‹ LOG SET › bar:** attach it with `bottomBar` inside the full-screen cover. The cover already hides the tab bar, as on the web.
  - **Inferred:** both need `.ignoresSafeArea(.keyboard, edges: .bottom)` on the bar, or they ride up on top of the keyboard. See §8.

### 8. Replacing Apple's tab bar with the web's bar
**Recommended way to build it** (inferred, not built).
- Keep `TabView(selection:)` with its five `NavigationStack`s, so each tab keeps its own history and state.
- Hide the system bar with `.toolbar(.hidden, for: .tabBar)` on each stack's root. Pushed screens must not bring it back; check this on iOS 18 and 26.
- Draw a `RipitTabBar` with `bottomBar`. The centre chip opens Quick Actions.
- Fallback if the hidden system bar flickers back on push: a `ZStack` of the five stacks with only the selected one visible (same per-tab state, less lazy).

**Cost by concern:**
- **Largest text (AX5):** Apple's bar keeps its labels small and shows a Large Content Viewer on long press. A custom bar must do the same itself:
  - cap the label size (for example `.dynamicTypeSize(...DynamicTypeSize.xxLarge)`);
  - add `.accessibilityShowsLargeContentViewer()` to each tab.
  - Low cost. Without the cap, AX5 labels wrap and the bar doubles in height. `ios-tab-ax5.png` shows Apple's bar at AX5 today.
- **VoiceOver:** Apple's bar says "Training, tab, 1 of 5, selected". A custom bar needs:
  - each tab as a button with `.isSelected`;
  - the chip labelled "Workout, quick actions", or "Resume draft workout: {name}" when a draft is open, as on the web;
  - the container marked as a tab bar if SwiftUI allows it. **Unknown:** whether SwiftUI has an `.isTabBar` trait. If it doesn't, "1 of 5" is lost unless a small `UIViewRepresentable` sets `UIAccessibilityTraits.tabBar`. Low to medium cost.
- **Keyboard:** on iOS, a `safeAreaInset` bar rides up on top of the keyboard (the web's bar stays put under it). Keep it down with `.ignoresSafeArea(.keyboard)`, or hide the bar while the keyboard is up. Only a few tab screens have text fields (Settings weekly target, searches), so either is cheap.
- **Sheets over the bar:** `.sheet` and `.fullScreenCover` sit above the custom bar, the same as with Apple's bar. Quick Actions should be its own overlay, a card floating above the bar with a dim backdrop, to match the web. A `.sheet` with a small detent would also work, but it looks different. Low cost.
- **What we lose:**
  1. Tap the active tab to pop to root or scroll to top. We rebuild it by resetting that tab's `path`. The Library tab's stack has no path binding today (`RipitApp.swift:55`).
  2. iOS 26's Liquid Glass bar and its shrink-on-scroll.
  3. System badges. The web doesn't use them anyway; it uses a pulse.
  4. Free accessibility behaviour (see above).
  5. The UI tests' `app.tabBars.buttons[...]`: scratch review harnesses tap tabs that way, so they'd need `app.buttons[...]`.

  **Nothing here is costly.** The largest item is VoiceOver tab semantics, and it is bounded.

### Observed / Inferred / Unknown (summary)
- **Observed:** everything marked O above, at 390×844 (web, Playwright, light mode) and on an iPhone 17 simulator (iOS, dark).
- **Inferred:** the TabView + hidden-bar build in §8; the keyboard behaviour of `safeAreaInset`; that dropping the History tab is safe because the History list can live under Training → Recent (iOS already has a Recent block).
- **Unknown:**
  - whether SwiftUI exposes a tab-bar container trait;
  - whether `.toolbar(.hidden, for: .tabBar)` holds on every pushed screen on iOS 26;
  - real-device feel of a swipe with no follow-the-finger motion (I only drove it with synthetic touches).

## Feature table (web | iOS today | size)

| Feature | Web | iOS today | Size | Src |
|---|---|---|---|---|
| One exercise per screen, fixed header + tabs | yes | all exercises on one scroll | L | O |
| Bottom bar ‹ LOG SET › with states (done → +Extra / Next / Finish) | yes | inline LOG per exercise; Finish at the bottom of the scroll | M | O/C |
| Swipe between exercises (≥50 px, no haptics, nudge animation) | yes | no | S | O/C |
| Auto-advance after the last planned set | **no** | no | – | O |
| Header PLAN n/N · clock · FINISH · ✕ Exit | yes | ⌄ + title; clock in the content | S | O |
| Log / Info / Notes / History as tabs | yes | Info/Notes/History in a sheet from (i) | M | O |
| Inline RESTING stopwatch | yes, inline in the set list | rest chip per exercise | S | O |
| Custom keypads (stepper, weight pad, effort grid); bar hidden while open | yes | system decimal keyboard | M (optional) | O |
| Plan sheet: rows, NOW, x of N sets, jump | yes | no | M | O |
| Reorder (Reorder toggle + drag, keep current by id) | yes | no | S–M | O |
| Swap (picker with SELECT) | yes (program: scope step) | no | M | O/C |
| Delete from the plan sheet, with confirm | yes | Remove in ··· (keep) | S | O |
| Add from the plan sheet, jump to the first new | yes | Add exercise button (keep the picker) | S | O |
| Supersets | badge only; linear next | grouped folder + "Superset" button | – (keep iOS; see Needs Dustin) | O/C |
| Exit: Exit / Discard / Save as draft | yes | ⌄ hides; Discard button | S | O |
| Custom bottom nav 4 + WORKOUT chip | yes | Apple's TabView | M | O |
| Draft pulse on the chip | yes | In-progress cards on Training/History | S | O/C |
| Quick Actions (Resume+Discard \| Continue / Freestyle / Saved) | yes | spread across Training/History | M | O |
| Programs under Library (My \| Browse→local only) | yes | under Training | S–M | O |
| History tab | **none** | yes | S (move) | O |

## Logic worth unit-testing (pure, in RipitCore)
1. **Order model:** `move(from:to:)` returns the new list with `order = index + 1`. The current exercise is kept by id, not by index.
2. **Next and previous:** linear by order, with bounds at the first and last exercise. Swipe and the bar share one function. If Dustin wants superset rotation (see Needs Dustin), it is a separate function with its own cases: A1→A2→A1… until the group's planned sets are done.
3. **Bottom-bar state:** `(planned, loggedWorking, isFirst, isLast, extraMode, isProgram, exerciseCount, keypadOpen) → (prev enabled, main = logSet | extraSet | addExercise | hidden, next = chevron | nextExercise | finish | disabled)`, plus `headerShowsFinish = !barOffersFinish`. Warm-ups don't count toward "all planned logged".
4. **Swipe classifier:** `classifySwipe(dx, dy)` → `next | prev | none`. It requires `|dx| ≥ 50`, and returns none when `|dy|/|dx| > 0.75`.
5. **Current index after delete:** move toward the previous exercise and clamp. Also the jump target after an add (the first new exercise).
6. **Quick actions offered:** `(draft?, activeProgramNext?, savedCount)` → a list of rows:
   - draft → [resume, discard];
   - otherwise → [continue (disabled if no program), freestyle, saved if count > 0].
7. **Next-set prefill after a log:** keep the weight; take reps and effort from the next planned set. This partly exists already from slice 5; check it.

## Proposed work
| Step | Role | Input | Output | Checked by |
|---|---|---|---|---|
| 9a tests | test-builder | this note §3–5, 8 | `.feature` + RipitCore tests for logic 6, plus UI scenarios for the bar | break-matrix |
| 9a build | implementer | tests + note | custom tab bar, Quick Actions, Programs into Library, History folded into Training | tests + review at AX5/VoiceOver |
| 9a review | reviewer | branch | packet + `pairs-` shots | Dustin on phone |
| 9b tests / build / review | same three roles | this note §1–2, logic 1–5, 7 | one-exercise logger, bottom bar, swipe, plan sheet | same |

Order: 9a first. It is smaller, Dustin sees it every launch, and 9b's logger bar sits inside the cover, so it doesn't depend on 9a. Both could run in parallel if worktrees allow.

### Slice 9a, the shell: scenarios in plain English
- The bottom bar shows Training, Library, a raised Workout button, Progress and Settings. The active tab is in the accent colour.
- The bar's background reaches the bottom edge of the screen. Nothing scrolls beneath it in the home-indicator area.
- Each tab keeps its own place: open a program in Library, switch to Progress and back, and the program is still open. Tapping the active tab returns it to its first screen.
- With no workout open, Workout shows Continue your program (Week · Day · name), Freestyle workout and My saved workouts (only if any are saved).
- With no active program, Continue is shown but can't be tapped, and reads "No active program".
- With a workout open, Workout shows only that workout ("In progress · tap to resume") and a discard button that needs a second tap to confirm. The footer explains why the other actions are gone.
- While a workout is open, the Workout button pulses, unless reduced motion or e-ink is on, and VoiceOver reads "Resume draft workout: {name}".
- Continue opens the logger on the program's next workout. Freestyle opens an empty logger that asks for the first exercise.
- At the largest text size the bar keeps its height, and a long press on a tab shows its label large. VoiceOver reads each tab as selected or not.
- Typing in a field on a tab screen doesn't push the bar up over the keyboard.
- Library has Workouts and Programs. History is reached from Training → Recent, and the History tab is gone. (This needs Dustin's yes; see below.)

### Slice 9b, the logger: scenarios in plain English
- A workout shows one exercise at a time. The header has Plan n/N, the clock, Finish and Exit. Below it are Log / Info / Notes / History.
- The bottom bar has ‹, Log set (showing "5 reps × 155 lbs") and ›. ‹ is off on the first exercise and › is off on the last.
- Swiping left goes to the next exercise and swiping right to the previous one. A short or mostly vertical swipe does nothing. A swipe does nothing while the keypad is open.
- Logging a set stays on the exercise, keeps the weight, fills the reps and effort from the next planned set, and starts the rest stopwatch.
- After the last planned set, the bar shows + Extra set and Next exercise, or Finish on the last exercise. The header's Finish disappears while the bar offers one.
- A freestyle workout with no exercises shows only Add exercise in the bar.
- Plan opens a list of exercises showing the current one, sets done of planned, and a tick when done. Tapping one jumps to it.
- Reorder lets you drag exercises. The exercise you were on stays on screen and its number updates.
- Each row's menu offers Swap (the picker, which replaces the exercise in place) and Delete (with a confirm, which also removes its logged sets).
- Add exercise in the plan appends the exercises and opens the first new one.
- Exit with nothing logged just leaves and deletes the empty workout. With sets logged, it offers Discard or Save as draft. On the phone, Save as draft just closes the cover, as ⌄ does today.
- Warm-ups, effort, Last time, Info/Notes/History, the summary and the picker work as they did after slice 8.
- The logger's bottom bar fills the home-indicator area, and the system keyboard doesn't push it up.

## Risks
- **9b is a rewrite of `WorkoutView.swift`** (528 lines) and touches every slice 5–8 feature. Regression risk is real. The slice 5–8 UI tests are the safety net, and their selectors ("LOG" by index) will change.
- **Light vs dark:** my web shots are the test user's Light mode and the iOS shots are dark, so colour comparisons in the pairs are only rough.
- **Swipe feel:** the web's swipe is basic. A native port might "improve" it (follow the finger, haptics). That would no longer match, and Dustin asked for a match.
- **Program reorder on the web changes the template.** If iOS copies that, a one-off reorder changes future workouts silently.

## Needs Dustin
1. **Remove the History tab?** The web has none.
   - Options: (a) drop it and put History under Training → Recent, with a "See all"; (b) keep a History tab and drop something else; (c) keep 6 tabs.
   - **Recommend (a)**, high confidence. It matches the web, and Training already has Recent.
2. **Supersets in the logger.** The web just goes in order and shows a badge. iOS today groups supersets into one folder.
   - Options: (a) match the web: linear order plus a "Superset A" badge; (b) add A1→A2 rotation.
   - **Recommend (a)** for slice 9, with (b) as a later idea. Medium confidence.
3. **Custom keypads** (reps stepper, weight pad, effort grid) **or the system decimal keyboard?** Matching the web is a big part of "feels the same".
   - **Recommend** the stepper and effort grid now (cheap) and the weight pad too, if 9b has room. Medium confidence.
4. **Program reorder scope.** The web rewrites the program template.
   - **Recommend** that the phone reorders only today's workout, and that template changes stay in the program editor. Medium confidence.
5. **Haptics.** The web has none.
   - **Recommend** a light haptic on Log set only. Low stakes; Dustin's call.

## Out of scope / later
- The web's follow-along mode, admin "Edit definition", and the program swap/delete scope wizards. The phone can start with "this workout only".
- The post-summary jump to `tab = 3` (Library) and the stale "Back to history" label. These need fixing once the tabs change.
- The web's dead `components/workout-logging/ExerciseNavigation.tsx` (its superset UI isn't used).
- `initiatives/ios-app/handoff/slice9-assets/` is **not** in `.gitignore`, unlike slice5–8. The lead may want to add it.
