---
id: 196
state: ready
waiting_on:
executor: parity-disco
skill: discovery
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-10 Dustin ("Yes, go for it"; install on his phone once the slice is done and independently reviewed)
updated: 2026-11-10
---
# Discovery: the web's workout logger and navigation shell

## Goal
Dustin finds the phone's logger and navigation very different from the web's, and wants them to match before anything else (this becomes slice 9). Map exactly how the web does the following, so a slice can be specified. Nothing is built in this item.
1. **The logger:** one exercise per screen. You swipe left and right between exercises. A fixed bottom bar has ‹ prev, LOG SET and next ›. A top-left button opens the workout's exercise list, where you can jump to, reorder and edit (swap, remove, add) exercises, and see supersets. This covers both the program logger and the freestyle (ad-hoc) logger.
2. **The bottom nav:** Training · Library · center Workout (quick actions) · Progress · Settings, with its custom look (`components/BottomNav.tsx`). Note what each tab holds, where History lives, and how active, badge and safe-area states look.
3. **Quick actions** (`components/QuickActionSheet.tsx`): every action and the state it depends on. For example: continue the program's next workout, start a freestyle workout, resume the open workout, and what happens while a draft is open.

## Read first
- `initiatives/ios-app/parity-inventory.md`: Navigation and shell, Logger, Look and feel.
- The iOS app as it is now: `ios/App/WorkoutView.swift`, `TrainingView.swift`, `RipitApp.swift` (tabs), `SettingsView.swift`, `LibraryView.swift`, `HistoryView.swift`.
- Web: `components/BottomNav.tsx`, `QuickActionSheet.tsx`, `components/workout-logging/` (the logger, its exercise list or drawer, the swipe, the bottom bar, the superset handling), the program and ad-hoc logger routes under `app/(app)/training/`.

## Do
1. **Code:** for each piece, record:
   - its states and transitions
   - gestures and animations, at the level that matters for feel: swipe threshold, what moves, haptics
   - what's fixed and what scrolls
   - how it behaves at the first and last exercise, after logging a set (does it auto-advance?), with supersets, with the rest timer and with the keyboard up
   - which existing iOS features from slices 5–8 must fit in: rest timer, Last time, effort, warm-ups, Info/Notes/History, finish summary, picker
2. **Hands-on, at 390 px:** on the local web (as in 173/191), walk a program workout and a freestyle workout end to end. Open the exercise list, then reorder, swap, add and remove an exercise. Use every quick action and every tab. Screenshot each into `initiatives/ios-app/handoff/slice9-assets/` (prefix `web-`). Take matching shots of the iOS app on simulator `ripit-review` (reuse it; prefix `ios-`), and make `pairs-` comparison sheets for the key screens.
3. **The iOS tab bar:** say what's needed to replace Apple's tab bar with the web's custom bar, while keeping native per-tab navigation (a TabView with the system bar hidden, or similar). Cover:
   - the largest text size and VoiceOver
   - the keyboard
   - sheets over the bar
   - what we lose compared with the system bar

   Dustin prefers the custom bar. Flag anything that makes it costly.
4. Write `initiatives/ios-app/logger-nav-discovery.md`, with:
   - **Observed / Inferred / Unknown**
   - a feature table (web behavior | iOS today | size)
   - the logic worth unit-testing: the order model, next and previous across supersets, auto-advance, reorder rules, which quick actions are offered
   - a proposed slice (or two if it's big), with scenarios in plain English, ready for a `.feature`

## Done when
- The note exists and covers the logger, the exercise list, the nav bar, quick actions and the tab contents, each row marked observed or read from code, with web and iOS screenshots.

## Escalate to Dustin when
- The local stack won't start after the `AGENTS.md` steps.

## Don't touch
- No code changes anywhere. Not `initiatives/ios-app/work/`, `STATE.md`, `status.md` or the roadmap. Staging read only. Don't `rm`; list cleanup in your packet. Stop any dev server you start.

## Hand back
The discovery packet with first line `Report: …`, the note's path, and the proposed slice(s) in 3 lines.
