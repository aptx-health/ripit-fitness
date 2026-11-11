---
id: 203
state: ready
executor: ios-tests
skill: handoff-test-builder
waiting_on:
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-10 Dustin (slice 9 go; answers on 196: supersets in order + badge, the web's keypads, reorder today only + light haptic; install after independent review)
updated: 2026-11-11
---
# iOS slice 9b: one-exercise logger, tests

## Goal
Tests and a hands-on list for `features/ios-app/one-exercise-logger.feature`, before the build.

## Read first
- `features/ios-app/one-exercise-logger.feature`
- `initiatives/ios-app/logger-nav-discovery.md` §1–2, "Logic worth unit-testing" 1–5 and 7, and Risks
- Web: `components/workout-logging/` (`ExerciseLoggingModal.tsx`, `NumberKeypad.tsx`, the plan sheet, the swipe handling)
- iOS today: `ios/App/WorkoutView.swift`, `WorkoutStore*.swift`, the RipitCore logging code from slice 5

## Do
- **RipitCore pure logic, with tests and web-cited expected values (goldens where practical):**
  - the order model (move, keep the current exercise by id)
  - next and previous in list order, with supersets as plain list order
  - the bottom-bar state function
  - the swipe classifier (at least 50 px, rejected when |dy|/|dx| > 0.75, nothing while a keypad is open)
  - the current index after a delete or an add
  - the next-set prefill after a log
  - the weight keypad's input rules (the first key replaces the value, CLR, ⌫, Done, Cancel)
  - the reps stepper's bounds
- **Store behaviour:**
  - reordering a program workout changes today's workout only, and the program's future workouts stay the same
  - swap in place
  - delete removes the exercise's logged sets
  - exiting with nothing logged deletes the workout
- **Hands-on list for the reviewer,** for everything that is UI only:
  - the one-exercise layout and header
  - the bar, which fills the home-indicator area
  - the swipe feel and the haptic
  - the keypads, and the bar hiding while one is open
  - the plan list (drag, swap, delete, add, the superset badge)
  - Exit
  - regressions in every slice 5–8 feature
  - AX5
- **Risk:** this replaces . Check which existing tests or debug hooks assume the old all-exercises layout, and say so.
- Run the break matrix as before.

## Done when
- `mise run ios-check`: the new tests fail only with `notImplemented`; everything else stays green.
- Every scenario maps to a test or to the hands-on list.

## Don't touch
App code (apart from contract stubs in RipitCore), `initiatives/ios-app/work/`, `STATE.md`, `status.md`, the roadmap. Don't `rm`.
