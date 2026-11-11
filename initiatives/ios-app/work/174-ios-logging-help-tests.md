---
id: 174
state: accepted
waiting_on:
executor: ios-tests
skill: handoff-test-builder
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-07 Dustin (slice 5 as written, autonomous)
updated: 2026-11-07
---
# iOS slice 5: logging help, tests

## Goal
Tests in `RipitCore` that slice 5's build will be judged against. Expected values come from the web code named in the spec, not from guesses.

## Read first
- `features/ios-app/logging-help.feature`: the scenarios.
- `initiatives/ios-app/parity-inventory.md` ("Workout logging" table).
- Web oracles: `hooks/useRestTimer.ts`, `components/workout-logging/LastSessionReference.tsx`, `lib/constants/intensity-presets.ts`, `components/workout-logging/ExerciseHistoryPanel.tsx` (and the `allTimePRSessionIndex` / e1RM helpers it imports), `components/workout-logging/ExerciseDisplayTabs.tsx`.
- iOS: `ios/RipitCore/Sources/RipitCore/` (Schema, the workout/logging API, Progress), `ios/App/WorkoutView.swift`.

## Do
- Define the core contract as stubs (they throw `notImplemented`), and the tests for it:
  - rest timer state computed from the last set's logged time (resets on a new set, survives relaunch, kept per exercise)
  - workout elapsed time
  - "last time" lookup: the most recent finished workout with that exercise; none for a first time; tapping fills the next set
  - logging RPE/RIR and warm-up on a set, saved and read back; the presets match the web's lists
  - per-exercise history: newest first, best-set e1RM per workout, the PR flag only with 2 or more workouts, warm-ups separate
- Where the web has pure functions (e1RM, PR index), generate goldens from them like `scripts/ios/progress-goldens.ts` does.
- Prove the tests can fail: use `break-matrix` against a scratch fake.
- UI-only scenarios (Info screen, notes section, Finish confirm) can't be unit-tested. List them for the reviewer's hands-on walk.

## Done when
- `mise run ios-check` runs. The new tests fail only with `notImplemented`; everything else stays green.
- Every scenario in the spec maps to a test or to the hands-on list.

## Decide alone
- Type and function names, and file layout under `RipitCore`.
- Whether a migration is needed (e.g. a logged-at timestamp on sets). If you add one, say so in the packet; the implementer owns it after you.

## Escalate to Dustin when
- The web's behavior looks like a bug you'd be copying.

## Don't touch
- `ios/App/` (the implementer's). `work/`, `STATE.md`, `status.md`, the roadmap.
- Don't `rm`; list temp files under Cleanup for Dustin.

## Hand back
The test-builder packet, plus the hands-on list for the reviewer.

## Log
- 2026-11-07: created (ready).
- 2026-11-07 18:46 MST: dispatched to ios-tests (running)
- 2026-11-07: handed back needs decision (half-step RPE). Lead: whole RPE only on the phone; web bug is backlog. Re-ran swift test: 46 issues, all notImplemented. Accepted.
