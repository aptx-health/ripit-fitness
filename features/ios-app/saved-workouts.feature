Feature: iOS slice 6 - Finish summary and saved workouts
  After a workout, see what you did and keep it to repeat. Matches the web.
  Oracle: lib/stats/workout-rollup.ts, components/features/training/WorkoutRollupModal.tsx,
  lib/saved-workouts/groups.ts, components/features/saved-workouts/, lib/training/home.ts,
  app/api/workouts/completions/[id]/repeat, the saved-workout start route.

  Scenario: Summary after Finish
    When I finish a workout
    Then I see a summary as the web's rollup computes it: volume (or total reps on a bodyweight day), reps, working sets, exercises and duration
    And each exercise shows its volume and its change vs last time, as the web words it
    And a very short workout gets the web's minimal summary

  Scenario: Save an ad-hoc workout to repeat
    Given I just finished an ad-hoc workout
    When I tap Save on the summary
    Then it is saved with the web's suggested name, which I can change, and optional notes
    And it shows in Library › Workouts
    But a program workout offers no Save, as on the web

  Scenario: Library › Workouts groups
    Given saved workouts, including imported ones
    When I open Library › Workouts
    Then I see New, Pinned, Recent and a closed Older fold, plus a closed Show archived, grouped and sorted like the web (Recent = used or saved in the last 30 days)

  Scenario: Manage a saved workout
    When I pin, unpin, rename, archive, restore or delete a saved workout
    Then it moves to the right group and stays that way after relaunch
    And delete asks first

  Scenario: Start a saved workout
    When I start a saved workout
    Then an ad-hoc workout opens with its exercises and planned sets, and the saved workout's last-used time updates
    And if a workout is already open I'm asked to Resume or Discard first, as today

  Scenario: Training shows Pinned and Recent
    When I open Training
    Then I see my pinned workouts with a one-tap Start
    And my recent finished workouts, each with Repeat when it has logged sets, like the web

  Scenario: Repeat a finished workout
    When I tap Repeat on a recent workout
    Then a new ad-hoc workout opens with the same exercises, ready to log
