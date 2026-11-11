Report: complete

# 196 handback: web logger and navigation discovery

**Note:** `initiatives/ios-app/logger-nav-discovery.md`

**Summary:** The web logger shows one exercise per screen. It has a ‹ LOG SET › bar, a basic swipe (at least 50 px, no haptics) and no auto-advance. Supersets only get a badge, and next/previous go in plain list order. A PLAN sheet lets you jump, reorder, swap, delete and add. The web's nav is 4 tabs plus a WORKOUT chip that opens Quick Actions, and it has **no History tab**. Replacing Apple's tab bar with a custom one is affordable; nothing about it is costly.

## Proposed slices
- **9a, the shell:** a custom tab bar with the Workout chip, made with `bottomBar` so it fills the home-indicator area. Quick Actions with its draft and no-draft states. Programs move into Library, and History folds into Training → Recent.
- **9b, the logger:** one exercise per screen, the bottom-bar state machine, swipe, header Plan/Finish/Exit, and the plan sheet (jump, reorder that keeps the current exercise by id, swap, delete, add).
- Order: 9a first. Pure logic for RipitCore tests is listed in the note: order, next/previous, bar state, swipe, quick actions.

## Lead's addendum (bottom bars and the home-indicator area)
Covered in §7 of the note.
- 197's `bottomBar` modifier fixes the picker (before and after: `pairs-keyboard-bottom.png`, panels 3–4).
- The note proposes the same modifier for the custom tab bar and the logger bar. Add `.ignoresSafeArea(.keyboard)` so neither rides up on top of the keyboard.

## Needs Dustin (details and recommendations in the note)
1. Drop the History tab, as on the web? I recommend yes.
2. Supersets: plain list order plus a badge as on the web, or A1→A2 rotation? I recommend matching the web for now.
3. Custom keypads (reps stepper, weight pad, effort grid) instead of the system keyboard?
4. Should reordering during a program workout change only today's workout? (The web rewrites the template.) I recommend today only.
5. A haptic on Log set? The web has none.

## Evidence
- 60 images in `initiatives/ios-app/handoff/slice9-assets/`:
  - `web-*`: local web at 390 px, light mode;
  - `ios-*`: `ripit-review`, dark mode;
  - `pairs-*`: logger, exercise list, Training with nav, quick actions, tabs, and keyboard and bottom bar.
- Hands-on web walks:
  - **Freestyle:** add 3 exercises, swipe 200 px and 40 px, the last exercise, log a set (rest timer), the keypad, reorder by drag, swap, delete.
  - **Program:** Continue from Quick Actions, log 4 of 4 sets (the bar flips to + Extra set / Next exercise), plan sheet, swap, the last exercise, Exit.
  - **Quick Actions:** draft state, discard arm and confirm, no-draft state, Freestyle.
  - **Tabs:** all four.
- The code reads were done by two read-only subagents and cross-checked against the walks. Line references are in the note.

## Outside the item (not fixed)
- `initiatives/ios-app/handoff/slice9-assets/` isn't in `.gitignore` (slice5–8 are), so it shows as untracked.
- iOS: after the summary the app jumps to `tab = 3`, which is Library (`RipitApp.swift:99`). The ⌄ label still says "Back to history" (`WorkoutView.swift:86`).
- Item 197 landed while I was working. My first picker shot is from before it (`ios-picker-bottom-pre197.png`); I rebuilt and shot it again afterwards.

## Cleanup for Dustin
- **Review DB (`fitcsv-postgres-review155`, local and synthetic):**
  - I discarded the stale freestyle draft "Workout — November 7". Exiting it also discarded a Repeat draft I had started by accident.
  - The workout started from Quick Actions → Freestyle was empty, so Exit deleted it.
  - I discarded a program Week 3 Day 1 session after logging 4 sets.
  - `active-draft` is now null. The container is stopped again.
- `next dev` on 3955 is stopped. Simulator `ripit-review` (`0BFD652D-…`) is shut down and kept. Its data is unchanged apart from the demo launch seeds.
- Scratch (harness copy, DerivedData `dd/`, Playwright scripts, logs): `/private/tmp/claude-501/-Users-dustin--herdr-worktrees-ripit-fitness-worktree-brave-field-c150/dd9debc1-4442-458c-928c-22ba7db308ff/scratchpad`. Its `pw/node_modules` is a symlink to an older scratch.
- No repo code changed, nothing was committed and nothing was deleted.
