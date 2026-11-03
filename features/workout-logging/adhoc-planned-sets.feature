Feature: Planned sets in the workout logger
  Sessions started from a saved or generated workout copy each exercise's plan
  (reps, RPE or RIR per set) into PrescribedSets (lib/workouts/start-draft.ts).
  The workout logger (ad-hoc) now shows that plan, compactly: one summary line
  that expands to the per-set plan, and pre-fills reps and effort for the next
  planned set. Exercises with no plan look exactly as they do today.

  Background:
    Given a signed-in user logging a session started from a saved workout
    And Back Squat is planned as 3 sets of 8 reps at RPE 8

  # Summary line
  Scenario: Collapsed summary under the exercise
    When the user opens Back Squat in the logger
    Then a "Target" line reads "3 × 8 @ RPE 8 · set 1 next"
    And the per-set plan is hidden

  Scenario: Mixed sets summarize honestly
    Given Bench Press is planned as 5 reps, 5 reps and 8 reps, all at RPE 8
    Then its Target line reads "3 sets · 5, 5, 8 reps @ RPE 8 · set 1 next"

  Scenario: RIR plans
    Given Leg Press is planned as 3 sets of 12 reps at 2 RIR
    Then its Target line reads "3 × 12 @ 2 RIR · set 1 next"

  Scenario: Reps only
    Given Plank is planned as 3 sets of 60 with no effort target
    Then its Target line reads "3 × 60 · set 1 next"

  Scenario: Progress through the plan
    Given the user has logged 1 set of Back Squat
    Then the Target line reads "3 × 8 @ RPE 8 · set 2 next"

  Scenario: Plan done
    Given the user has logged 3 sets of Back Squat
    Then the Target line reads "3 × 8 @ RPE 8 · done"

  Scenario: Extra sets beyond the plan
    Given the user has logged 4 sets of Back Squat
    Then the Target line reads "3 × 8 @ RPE 8 · done" and logging more is still allowed

  # Expand and hide
  Scenario: Expand the plan
    When the user taps the Target line
    Then it lists each planned set with its reps and effort
    And logged sets are marked done with what was logged, and the next set is marked "next"

  Scenario: The choice is remembered
    Given the user expanded the plan
    When they move to another exercise or reopen the logger
    Then plans stay expanded until they collapse one

  # Pre-fill
  Scenario: The form pre-fills the next planned set
    Given the user has logged 1 set of Back Squat
    Then the log form's reps show 8 and RPE shows 8 for set 2
    And the weight is pre-filled as it is today (last set or history)

  Scenario: Pre-fill doesn't overwrite typing
    Given the user has typed 6 into reps
    Then the plan does not replace it

  Scenario: Effort fields only when enabled
    Given the user's intensity setting is off
    Then RPE and RIR are not pre-filled or shown in the form, but the Target line still shows the target

  # No plan
  Scenario: Exercises without a plan
    Given Lateral Raise was added during the session with no plan
    Then it shows no Target line, and the logger looks as it does today

  Scenario: Fresh ad-hoc sessions
    Given an empty ad-hoc session the user builds as they go
    Then no exercise shows a Target line

  # Fit
  Scenario: Phone width
    Then at 390px the Target line is one line (48px tap target) and the expanded plan fits with no horizontal scroll, in light and dark

  # After review 122 (Dustin, 2026-11-02)
  Scenario: One effort picker per planned exercise
    Given Back Squat's plan uses RPE targets and intensity is on
    Then the form shows only the RPE picker for Back Squat, not an empty RIR picker
    And the picker stays after the plan is done

  Scenario: Extra sets don't carry a hidden effort
    Given the user has logged all 3 planned sets of Back Squat
    When they log a 4th set
    Then it saves only the effort shown in the form

  # Plan complete (Dustin, 2026-11-02, after the preview)
  Scenario: Logging the last planned set celebrates once
    Given the user has logged 2 of Back Squat's 3 planned sets
    When they log the 3rd set
    Then the Target line briefly flashes and shows a check mark with "done"

  Scenario: Opening an exercise that is already done doesn't animate
    Given Back Squat's 3 planned sets were logged earlier
    When the user opens Back Squat or reopens the logger
    Then the Target line shows the check mark and "done" with no flash

  Scenario: Extra sets don't animate again
    Given all 3 planned sets are logged
    When the user logs a 4th set
    Then there is no flash

  Scenario: Deleting back below the plan, then finishing again
    Given all 3 planned sets are logged
    When the user deletes one, the line reads "set 3 next" with no check
    And when they log the 3rd set again, the flash and check play again

  Scenario: Reduced motion
    Given the device asks for reduced motion
    Then the check mark appears without the flash
